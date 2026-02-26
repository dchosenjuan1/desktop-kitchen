import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { BankingService } from '../lib/bankingService.js';
import { reconcileDeliveryPayouts } from '../services/banking/ReconciliationService.js';
import { getPlanLimits } from '../planLimits.js';

const router = Router();

// ─── Auth + Plan Gate ───────────────────────────────────────────────

router.use(requireOwner);

// Plan gate: only pro and ghost_kitchen tenants can access banking
router.use((req, res, next) => {
  const plan = req.tenant?.plan || 'trial';
  if (plan !== 'pro' && plan !== 'ghost_kitchen') {
    return res.status(403).json({
      error: 'PLAN_UPGRADE_REQUIRED',
      requiredPlan: 'pro',
      feature: 'bank_connections',
    });
  }
  next();
});

// ─── Widget Token ───────────────────────────────────────────────────

// POST /api/banking/widget-token
router.post('/widget-token', async (req, res) => {
  try {
    const result = await BankingService.createWidgetToken(req.tenant);

    // Log the attempt
    await run(`
      INSERT INTO bank_sync_logs (connection_id, sync_type, status, error_message)
      VALUES (NULL, 'manual', 'success', 'Widget token created')
    `).catch(() => {}); // non-critical

    res.json(result);
  } catch (err) {
    console.error('Error creating widget token:', err);
    res.status(500).json({ error: 'Failed to create widget token' });
  }
});

// ─── Exchange Token ─────────────────────────────────────────────────

// POST /api/banking/exchange-token
router.post('/exchange-token', async (req, res) => {
  try {
    const { publicToken, metadata } = req.body;

    if (!publicToken) {
      return res.status(400).json({ error: 'publicToken is required' });
    }

    // Enforce max_bank_connections limit
    const plan = req.tenant?.plan || 'trial';
    const limits = getPlanLimits(plan);
    const maxConns = limits.maxBankConnections || 0;
    const countRow = await get(
      "SELECT COUNT(*)::int AS cnt FROM bank_connections WHERE status != 'disconnected'"
    );
    const currentCount = countRow?.cnt || 0;
    if (currentCount >= maxConns) {
      return res.status(403).json({
        error: 'CONNECTION_LIMIT_REACHED',
        limit: maxConns,
        current: currentCount,
        plan,
      });
    }

    const institutionName = metadata?.institutionName || null;
    const institutionLogoUrl = metadata?.institutionLogoUrl || null;

    // Exchange token with provider
    const { linkId, provider } = await BankingService.exchangeToken(req.tenant, publicToken);

    // Insert connection
    const rows = await all(`
      INSERT INTO bank_connections (provider, external_link_id, institution_name, institution_logo_url, country_code, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `, [provider, linkId, institutionName, institutionLogoUrl, metadata?.countryCode || 'MX']);

    const connection = rows[0];

    // Trigger immediate sync
    let accountCount = 0;
    try {
      const syncResult = await BankingService.syncConnection(connection);
      accountCount = syncResult.accountsSynced;

      await run(`
        INSERT INTO bank_sync_logs (connection_id, sync_type, status, accounts_synced, transactions_synced, completed_at)
        VALUES ($1, 'manual', 'success', $2, $3, NOW())
      `, [connection.id, syncResult.accountsSynced, syncResult.transactionsSynced]);
    } catch (syncErr) {
      console.error('Initial sync failed (connection still created):', syncErr);
      await run(`
        INSERT INTO bank_sync_logs (connection_id, sync_type, status, error_message, completed_at)
        VALUES ($1, 'manual', 'partial', $2, NOW())
      `, [connection.id, syncErr.message]);
    }

    res.status(201).json({
      connectionId: connection.id,
      institutionName: connection.institution_name,
      accountCount,
    });
  } catch (err) {
    console.error('Error exchanging token:', err);
    res.status(500).json({ error: 'Failed to exchange token and create connection' });
  }
});

// ─── Connections ────────────────────────────────────────────────────

// GET /api/banking/connections
router.get('/connections', async (req, res) => {
  try {
    const rows = await all(`
      SELECT bc.*,
        (SELECT COUNT(*)::int FROM bank_accounts ba WHERE ba.connection_id = bc.id) AS account_count
      FROM bank_connections bc
      WHERE bc.status != 'disconnected'
      ORDER BY bc.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching bank connections:', err);
    res.status(500).json({ error: 'Failed to fetch bank connections' });
  }
});

// DELETE /api/banking/connections/:connectionId — soft-delete + provider revocation
router.delete('/connections/:connectionId', async (req, res) => {
  try {
    const connection = await get(
      'SELECT * FROM bank_connections WHERE id = $1',
      [req.params.connectionId]
    );
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Revoke at provider level (best-effort)
    try {
      await BankingService.deleteLink(connection.provider, connection.external_link_id);
    } catch (providerErr) {
      console.error('Provider link revocation failed (proceeding with soft-delete):', providerErr);
    }

    // Soft-delete: set status to disconnected
    await run(
      "UPDATE bank_connections SET status = 'disconnected', updated_at = NOW() WHERE id = $1",
      [req.params.connectionId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting bank connection:', err);
    res.status(500).json({ error: 'Failed to delete bank connection' });
  }
});

// ─── Accounts ───────────────────────────────────────────────────────

// GET /api/banking/accounts
router.get('/accounts', async (req, res) => {
  try {
    const { connectionId } = req.query;
    let query = `
      SELECT ba.*, bc.provider, bc.institution_name, bc.institution_logo_url
      FROM bank_accounts ba
      JOIN bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.status != 'disconnected'
    `;
    const params = [];

    if (connectionId) {
      query += ' AND ba.connection_id = $1';
      params.push(connectionId);
    }

    query += ' ORDER BY ba.is_primary DESC, ba.name ASC';
    const rows = await all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching bank accounts:', err);
    res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
});

// ─── Transactions ───────────────────────────────────────────────────

// GET /api/banking/transactions
router.get('/transactions', async (req, res) => {
  try {
    const { accountId, startDate, endDate, limit = 100, offset = 0 } = req.query;
    const where = ['1=1'];
    const params = [];
    let idx = 1;

    if (accountId) { where.push(`bt.account_id = $${idx++}`); params.push(accountId); }
    if (startDate) { where.push(`bt.transaction_date >= $${idx++}`); params.push(startDate); }
    if (endDate) { where.push(`bt.transaction_date <= $${idx++}`); params.push(endDate); }

    const whereClause = where.join(' AND ');

    const countRow = await get(
      `SELECT COUNT(*)::int AS total FROM bank_transactions bt WHERE ${whereClause}`,
      params
    );
    const total = countRow?.total || 0;

    const clampedLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const clampedOffset = Math.max(Number(offset) || 0, 0);
    params.push(clampedLimit);
    params.push(clampedOffset);

    const rows = await all(`
      SELECT bt.*, ba.name AS account_name, ba.last_four
      FROM bank_transactions bt
      JOIN bank_accounts ba ON bt.account_id = ba.id
      WHERE ${whereClause}
      ORDER BY bt.transaction_date DESC, bt.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `, params);

    res.set('X-Total-Count', String(total));
    res.json(rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ─── Sync ───────────────────────────────────────────────────────────

const SYNC_CONCURRENCY = 3;

/**
 * Sync a single connection and log the result.
 * Returns { connectionId, institution, success, accountsSynced, transactionsSynced, error }.
 */
async function syncOne(conn) {
  try {
    const result = await BankingService.syncConnection(conn);

    await run(`
      INSERT INTO bank_sync_logs (connection_id, sync_type, status, accounts_synced, transactions_synced, completed_at)
      VALUES ($1, 'manual', 'success', $2, $3, NOW())
    `, [conn.id, result.accountsSynced, result.transactionsSynced]);

    return { connectionId: conn.id, institution: conn.institution_name, success: true, ...result };
  } catch (syncErr) {
    console.error(`Sync failed for connection ${conn.id}:`, syncErr);

    await run(`
      INSERT INTO bank_sync_logs (connection_id, sync_type, status, error_message, completed_at)
      VALUES ($1, 'manual', 'failed', $2, NOW())
    `, [conn.id, syncErr.message]).catch(() => {});

    await run(
      "UPDATE bank_connections SET status = 'error', updated_at = NOW() WHERE id = $1",
      [conn.id]
    ).catch(() => {});

    return { connectionId: conn.id, institution: conn.institution_name, success: false, error: syncErr.message };
  }
}

// POST /api/banking/sync
router.post('/sync', async (req, res) => {
  try {
    const { connectionId } = req.body;
    let connections;

    if (connectionId) {
      const conn = await get(
        "SELECT * FROM bank_connections WHERE id = $1 AND status = 'active'",
        [connectionId]
      );
      if (!conn) {
        return res.status(404).json({ error: 'Active connection not found' });
      }
      connections = [conn];
    } else {
      // Sync all active connections for this tenant in parallel (capped concurrency)
      connections = await all("SELECT * FROM bank_connections WHERE status = 'active'");
    }

    if (connections.length === 0) {
      return res.json({ synced: 0, errors: [] });
    }

    // Process in chunks of SYNC_CONCURRENCY using Promise.allSettled
    const allResults = [];
    for (let i = 0; i < connections.length; i += SYNC_CONCURRENCY) {
      const chunk = connections.slice(i, i + SYNC_CONCURRENCY);
      const settled = await Promise.allSettled(chunk.map(c => syncOne(c)));

      for (const outcome of settled) {
        allResults.push(
          outcome.status === 'fulfilled'
            ? outcome.value
            : { success: false, error: outcome.reason?.message || 'Unknown error' }
        );
      }
    }

    const synced = allResults.filter(r => r.success).length;
    const errors = allResults.filter(r => !r.success).map(({ connectionId: cid, institution, error }) => ({
      connectionId: cid, institution, error,
    }));

    res.json({ synced, errors });
  } catch (err) {
    console.error('Error triggering sync:', err);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// ─── Summary ────────────────────────────────────────────────────────

// GET /api/banking/summary
router.get('/summary', async (req, res) => {
  try {
    // Balances by account type (only from active connections)
    const accounts = await all(`
      SELECT ba.type, ba.balance_current, ba.balance_available
      FROM bank_accounts ba
      JOIN bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.status = 'active'
    `);

    let totalBalance = 0;
    let totalCreditAvailable = 0;
    const accountsByType = {};

    for (const acct of accounts) {
      const type = acct.type || 'other';
      accountsByType[type] = (accountsByType[type] || 0) + 1;

      if (type === 'checking' || type === 'savings') {
        totalBalance += Number(acct.balance_current) || 0;
      }
      if (type === 'credit_card') {
        totalCreditAvailable += Number(acct.balance_available) || 0;
      }
    }

    // Last sync timestamp
    const lastSync = await get(`
      SELECT MAX(bc.last_synced_at) AS last_synced_at
      FROM bank_connections bc
      WHERE bc.status = 'active'
    `);

    // Recent 10 transactions across all accounts
    const recentTransactions = await all(`
      SELECT bt.*, ba.name AS account_name, ba.last_four
      FROM bank_transactions bt
      JOIN bank_accounts ba ON bt.account_id = ba.id
      JOIN bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.status = 'active'
      ORDER BY bt.transaction_date DESC, bt.created_at DESC
      LIMIT 10
    `);

    res.json({
      totalBalance,
      totalCreditAvailable,
      lastSyncedAt: lastSync?.last_synced_at || null,
      accountsByType,
      recentTransactions,
    });
  } catch (err) {
    console.error('Error fetching banking summary:', err);
    res.status(500).json({ error: 'Failed to fetch banking summary' });
  }
});

// ─── Reconciliation ─────────────────────────────────────────────────

// GET /api/banking/reconciliation
router.get('/reconciliation', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const result = await reconcileDeliveryPayouts(start, end);
    res.json(result);
  } catch (err) {
    console.error('Error fetching reconciliation:', err);
    res.status(500).json({ error: 'Failed to fetch reconciliation data' });
  }
});

// GET /api/banking/confirmed-total — sum of reconciled bank deposits for dashboard stat card
router.get('/confirmed-total', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;

    // Sum all INFLOW transactions for the period from active connections
    const row = await get(`
      SELECT COALESCE(SUM(bt.amount), 0) AS confirmed_total
      FROM bank_transactions bt
      JOIN bank_accounts ba ON bt.account_id = ba.id
      JOIN bank_connections bc ON ba.connection_id = bc.id
      WHERE bc.status = 'active'
        AND bt.transaction_type = 'INFLOW'
        AND bt.transaction_date >= $1
        AND bt.transaction_date <= $2
    `, [start, end]);

    res.json({
      confirmedTotal: Number(row?.confirmed_total) || 0,
      period: { start, end },
    });
  } catch (err) {
    console.error('Error fetching confirmed total:', err);
    res.status(500).json({ error: 'Failed to fetch confirmed total' });
  }
});

// ─── Sync Health ─────────────────────────────────────────────────────

// GET /api/banking/sync-health — check for connections with repeated sync failures
router.get('/sync-health', async (req, res) => {
  try {
    // Find connections where the last 3 sync logs are all 'failed'
    const problems = await all(`
      SELECT bc.id, bc.institution_name, bc.status,
        (
          SELECT COUNT(*)::int
          FROM (
            SELECT status FROM bank_sync_logs
            WHERE connection_id = bc.id
            ORDER BY created_at DESC LIMIT 3
          ) recent
          WHERE recent.status = 'failed'
        ) AS consecutive_failures
      FROM bank_connections bc
      WHERE bc.status != 'disconnected'
    `);

    const alerts = problems
      .filter(p => p.consecutive_failures >= 3)
      .map(p => ({
        connectionId: p.id,
        institutionName: p.institution_name,
        status: p.status,
        consecutiveFailures: p.consecutive_failures,
      }));

    res.json({ alerts });
  } catch (err) {
    console.error('Error checking sync health:', err);
    res.status(500).json({ error: 'Failed to check sync health' });
  }
});

export default router;
