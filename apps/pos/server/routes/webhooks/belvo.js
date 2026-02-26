/**
 * Belvo Webhook Handler
 *
 * Receives webhook events from Belvo and processes them asynchronously.
 * Signature verification using HMAC-SHA256 (belvo-signature header).
 * Mounted BEFORE express.json() — receives raw body via express.raw().
 */

import { Router } from 'express';
import crypto from 'crypto';
import { adminSql, tenantContext } from '../../db/index.js';
import { all, get, run } from '../../db/index.js';
import { BankingService } from '../../lib/bankingService.js';

const router = Router();

const BELVO_WEBHOOK_SECRET = process.env.BELVO_WEBHOOK_SECRET || '';

// ─── Signature Verification ──────────────────────────────────────────

function verifySignature(rawBody, signature) {
  if (!BELVO_WEBHOOK_SECRET) {
    console.warn('[Belvo Webhook] BELVO_WEBHOOK_SECRET not set — skipping verification');
    return true; // Allow in dev when no secret is configured
  }

  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', BELVO_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// ─── Webhook Endpoint ────────────────────────────────────────────────

// POST /webhooks/belvo
router.post('/', async (req, res) => {
  const rawBody = req.body; // Buffer from express.raw()
  const signature = req.headers['belvo-signature'];

  // Verify signature
  if (!verifySignature(rawBody, signature)) {
    console.error('[Belvo Webhook] Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Parse body
  let payload;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // Return 200 immediately — process async
  res.status(200).json({ received: true });

  // Process in background
  const { webhook_id, webhook_type, link_id, event_type, data } = payload;

  console.log(`[Belvo Webhook] ${event_type} for link ${link_id} (webhook ${webhook_id})`);

  try {
    await processWebhookEvent({ link_id, event_type, data, webhook_id, webhook_type });
  } catch (err) {
    console.error(`[Belvo Webhook] Error processing ${event_type}:`, err.message);
  }
});

// ─── Event Processing ────────────────────────────────────────────────

async function processWebhookEvent({ link_id, event_type, data, webhook_id }) {
  // Look up connection by external_link_id (uses adminSql — no tenant context)
  const connection = await adminSql`
    SELECT bc.*, t.id AS resolved_tenant_id
    FROM bank_connections bc
    JOIN tenants t ON bc.tenant_id = t.id
    WHERE bc.external_link_id = ${link_id}
      AND bc.status != 'disconnected'
    LIMIT 1
  `;

  const conn = connection[0];
  if (!conn) {
    console.warn(`[Belvo Webhook] No connection found for link_id ${link_id}`);
    return;
  }

  const tenantId = conn.resolved_tenant_id;

  // Run within tenant context for RLS-scoped DB operations
  await adminSql.begin(async (tx) => {
    await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    await new Promise((resolve, reject) => {
      tenantContext.run({ conn: tx }, async () => {
        try {
          await handleEvent(conn, event_type, data, webhook_id);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
}

async function handleEvent(connection, eventType, data, webhookId) {
  switch (eventType) {
    case 'LINK_STATUS_CHANGED':
      await handleLinkStatusChanged(connection, data);
      break;

    case 'ACCOUNTS_AVAILABLE':
      await handleAccountsAvailable(connection);
      break;

    case 'TRANSACTIONS_AVAILABLE':
      await handleTransactionsAvailable(connection);
      break;

    case 'LINK_EXPIRED':
      await handleLinkExpired(connection);
      break;

    default:
      console.log(`[Belvo Webhook] Unhandled event type: ${eventType}`);
  }

  // Log all webhooks to bank_sync_logs
  await run(`
    INSERT INTO bank_sync_logs (connection_id, sync_type, status, error_message, completed_at)
    VALUES ($1, 'webhook', 'success', $2, NOW())
  `, [connection.id, `Webhook: ${eventType} (${webhookId || 'no-id'})`]);
}

// ─── Event Handlers ──────────────────────────────────────────────────

async function handleLinkStatusChanged(connection, data) {
  const newStatus = data?.status || data?.link_status;
  if (!newStatus) return;

  // Map Belvo link statuses to our internal statuses
  const statusMap = {
    valid: 'active',
    invalid: 'error',
    unconfirmed: 'pending',
    token_required: 'error',
  };

  const mappedStatus = statusMap[newStatus] || 'error';

  await run(
    "UPDATE bank_connections SET status = $1, updated_at = NOW() WHERE id = $2",
    [mappedStatus, connection.id]
  );

  console.log(`[Belvo Webhook] Link ${connection.external_link_id} status → ${mappedStatus}`);
}

async function handleAccountsAvailable(connection) {
  try {
    const result = await BankingService.syncConnection(connection);

    await run(`
      INSERT INTO bank_sync_logs (connection_id, sync_type, status, accounts_synced, transactions_synced, completed_at)
      VALUES ($1, 'webhook', 'success', $2, $3, NOW())
    `, [connection.id, result.accountsSynced, result.transactionsSynced]);

    console.log(`[Belvo Webhook] Synced ${result.accountsSynced} accounts, ${result.transactionsSynced} transactions for connection ${connection.id}`);
  } catch (err) {
    console.error(`[Belvo Webhook] Sync failed for connection ${connection.id}:`, err.message);
    await run(`
      INSERT INTO bank_sync_logs (connection_id, sync_type, status, error_message, completed_at)
      VALUES ($1, 'webhook', 'failed', $2, NOW())
    `, [connection.id, err.message]);
  }
}

async function handleTransactionsAvailable(connection) {
  try {
    // syncConnection fetches both accounts and transactions — no separate method needed
    const result = await BankingService.syncConnection(connection);

    await run(`
      INSERT INTO bank_sync_logs (connection_id, sync_type, status, accounts_synced, transactions_synced, completed_at)
      VALUES ($1, 'webhook', 'success', $2, $3, NOW())
    `, [connection.id, result.accountsSynced, result.transactionsSynced]);

    console.log(`[Belvo Webhook] Transaction sync: ${result.transactionsSynced} transactions for connection ${connection.id}`);
  } catch (err) {
    console.error(`[Belvo Webhook] Transaction sync failed for connection ${connection.id}:`, err.message);
    await run(`
      INSERT INTO bank_sync_logs (connection_id, sync_type, status, error_message, completed_at)
      VALUES ($1, 'webhook', 'failed', $2, NOW())
    `, [connection.id, err.message]);
  }
}

async function handleLinkExpired(connection) {
  // Mark connection as error
  await run(
    "UPDATE bank_connections SET status = 'error', updated_at = NOW() WHERE id = $1",
    [connection.id]
  );

  console.log(`[Belvo Webhook] Link expired for connection ${connection.id} (tenant ${connection.tenant_id})`);

  // TODO: Send in-app notification to tenant owner when notification system is implemented
  // For now, the error status will surface in the Banking UI as a "Reconnect" prompt
}

export default router;
