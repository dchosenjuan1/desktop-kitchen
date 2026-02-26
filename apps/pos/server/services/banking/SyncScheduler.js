/**
 * Banking Sync Scheduler
 *
 * Runs daily at 3am Mexico City time to sync all active bank connections.
 * Uses adminSql to iterate across tenants, then sets tenant context per connection.
 */

import cron from 'node-cron';
import { adminSql, tenantContext } from '../../db/index.js';
import { run } from '../../db/index.js';
import { BankingService } from '../../lib/bankingService.js';

let scheduledTask = null;

// ─── Sync Logic ──────────────────────────────────────────────────────

/**
 * Sync a single connection within its tenant context.
 * Returns { connectionId, success, accountsSynced, transactionsSynced, error }.
 */
async function syncOneConnection(connection) {
  try {
    let result;
    await adminSql.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id', ${connection.tenant_id}, true)`;
      await new Promise((resolve, reject) => {
        tenantContext.run({ conn: tx }, async () => {
          try {
            result = await BankingService.syncConnection(connection);

            await run(`
              INSERT INTO bank_sync_logs (connection_id, sync_type, status, accounts_synced, transactions_synced, completed_at)
              VALUES ($1, 'scheduled', 'success', $2, $3, NOW())
            `, [connection.id, result.accountsSynced, result.transactionsSynced]);

            resolve();
          } catch (e) {
            // Log failure within tenant context
            await run(`
              INSERT INTO bank_sync_logs (connection_id, sync_type, status, error_message, completed_at)
              VALUES ($1, 'scheduled', 'failed', $2, NOW())
            `, [connection.id, e.message]).catch(() => {});

            reject(e);
          }
        });
      });
    });

    return {
      connectionId: connection.id,
      success: true,
      accountsSynced: result.accountsSynced,
      transactionsSynced: result.transactionsSynced,
    };
  } catch (err) {
    console.error(`[Banking Sync] Failed for connection ${connection.id} (tenant ${connection.tenant_id}):`, err.message);

    // Mark connection as error (using adminSql directly — no RLS needed for this update)
    await adminSql`
      UPDATE bank_connections
      SET status = 'error', updated_at = NOW()
      WHERE id = ${connection.id}
    `.catch(() => {});

    return {
      connectionId: connection.id,
      success: false,
      error: err.message,
    };
  }
}

/**
 * Process an array of connections with a concurrency cap.
 * Chunks the array and runs each chunk with Promise.allSettled.
 */
async function syncWithConcurrency(connections, concurrency = 3) {
  const results = [];

  for (let i = 0; i < connections.length; i += concurrency) {
    const chunk = connections.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      chunk.map(conn => syncOneConnection(conn))
    );

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
      } else {
        results.push({ success: false, error: outcome.reason?.message || 'Unknown error' });
      }
    }
  }

  return results;
}

/**
 * Sync all active bank connections across all tenants.
 * Skips connections synced within the last 23 hours.
 * Exported for manual testing.
 */
export async function manualSyncAll() {
  console.log('[Banking Sync] Starting sync of all active connections...');

  // Fetch all active connections across all tenants (adminSql bypasses RLS)
  const connections = await adminSql`
    SELECT bc.*
    FROM bank_connections bc
    JOIN tenants t ON bc.tenant_id = t.id
    WHERE bc.status = 'active'
      AND t.active = true
      AND (bc.last_synced_at IS NULL OR bc.last_synced_at < NOW() - INTERVAL '23 hours')
    ORDER BY bc.last_synced_at ASC NULLS FIRST
  `;

  if (connections.length === 0) {
    console.log('[Banking Sync] No connections need syncing');
    return { synced: 0, failed: 0, skipped: 0, results: [] };
  }

  console.log(`[Banking Sync] ${connections.length} connections to sync`);

  const results = await syncWithConcurrency(connections, 3);

  const synced = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`[Banking Sync] Complete: ${synced} synced, ${failed} failed`);

  return { synced, failed, skipped: 0, results };
}

// ─── Scheduler ───────────────────────────────────────────────────────

/**
 * Start the daily banking sync scheduler.
 * Runs at 3:00 AM Mexico City time every day.
 */
export function startBankingSyncScheduler() {
  if (scheduledTask) {
    console.log('[Banking Sync] Scheduler already running');
    return;
  }

  // Cron: minute(0) hour(3) day(*) month(*) weekday(*) — 3:00 AM daily
  scheduledTask = cron.schedule('0 3 * * *', async () => {
    try {
      await manualSyncAll();
    } catch (err) {
      console.error('[Banking Sync] Scheduled sync failed:', err.message);
    }
  }, {
    timezone: 'America/Mexico_City',
  });

  console.log('[Banking Sync] Scheduler started — daily at 3:00 AM America/Mexico_City');
}

/**
 * Stop the scheduler.
 */
export function stopBankingSyncScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Banking Sync] Scheduler stopped');
  }
}
