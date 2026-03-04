/**
 * BankingService — Plaid open banking integration.
 *
 * All bank connections use Plaid (US + LATAM).
 */

import { all, get, run } from '../db/index.js';

// ─── Plaid Configuration ─────────────────────────────────────────

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '';
const PLAID_SECRET = process.env.PLAID_SECRET || '';
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

const PLAID_BASE_URLS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

function getBaseUrl() {
  return PLAID_BASE_URLS[PLAID_ENV] || PLAID_BASE_URLS.sandbox;
}

// ─── Public API ─────────────────────────────────────────────────

export const BankingService = {
  /**
   * Create a Plaid Link token for the frontend widget.
   */
  async createWidgetToken(tenant) {
    const res = await fetch(`${getBaseUrl()}/link/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        user: { client_user_id: tenant.id },
        client_name: tenant.name || 'Desktop Kitchen',
        products: ['transactions'],
        country_codes: ['US', 'MX'],
        language: 'en',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Plaid link token failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return {
      token: data.link_token,
      provider: 'plaid',
      widgetJsUrl: 'https://cdn.plaid.com/link/v2/stable/link-initialize.js',
    };
  },

  /**
   * Exchange a public token from Plaid Link into a persistent access token.
   * Returns { linkId, provider }.
   */
  async exchangeToken(tenant, publicToken) {
    const res = await fetch(`${getBaseUrl()}/item/public_token/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        public_token: publicToken,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Plaid token exchange failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return { linkId: data.access_token, provider: 'plaid' };
  },

  /**
   * Sync accounts and transactions for a bank_connection row.
   * Upserts into bank_accounts and bank_transactions.
   * Returns { accountsSynced, transactionsSynced }.
   */
  async syncConnection(connection) {
    const baseUrl = getBaseUrl();
    const headers = { 'Content-Type': 'application/json' };
    const auth = { client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, access_token: connection.external_link_id };

    // Fetch accounts
    const accountsRes = await fetch(`${baseUrl}/accounts/get`, {
      method: 'POST', headers,
      body: JSON.stringify(auth),
    });
    let rawAccounts = [];
    if (accountsRes.ok) {
      const data = await accountsRes.json();
      rawAccounts = data.accounts || [];
    }

    // Fetch transactions (last 90 days)
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);

    const txRes = await fetch(`${baseUrl}/transactions/get`, {
      method: 'POST', headers,
      body: JSON.stringify({
        ...auth,
        start_date: from.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
        options: { count: 500 },
      }),
    });
    let rawTx = [];
    if (txRes.ok) {
      const data = await txRes.json();
      rawTx = data.transactions || [];
    }

    let accountsSynced = 0;
    let transactionsSynced = 0;

    // Normalize and upsert accounts
    for (const acct of rawAccounts) {
      const normalized = normalizePlaidAccount(acct);

      await run(`
        INSERT INTO bank_accounts (connection_id, external_account_id, name, type, currency, balance_current, balance_available, last_four, synced_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (connection_id, external_account_id)
        DO UPDATE SET
          name = EXCLUDED.name, type = EXCLUDED.type, currency = EXCLUDED.currency,
          balance_current = EXCLUDED.balance_current, balance_available = EXCLUDED.balance_available,
          last_four = EXCLUDED.last_four, synced_at = NOW()
      `, [
        connection.id,
        normalized.externalAccountId,
        normalized.name,
        normalized.type,
        normalized.currency,
        normalized.balanceCurrent,
        normalized.balanceAvailable,
        normalized.lastFour,
      ]);
      accountsSynced++;
    }

    // Get account mapping (external_account_id → our UUID) for transaction inserts
    const dbAccounts = await all(
      'SELECT id, external_account_id FROM bank_accounts WHERE connection_id = $1',
      [connection.id]
    );
    const accountMap = new Map(dbAccounts.map(a => [a.external_account_id, a.id]));

    // Normalize and upsert transactions
    for (const tx of rawTx) {
      const normalized = normalizePlaidTransaction(tx);

      const accountId = accountMap.get(normalized.externalAccountId);
      if (!accountId) continue; // skip orphaned transactions

      await run(`
        INSERT INTO bank_transactions (account_id, external_transaction_id, amount, currency, description, merchant_name, category, subcategory, transaction_date, transaction_type, status, raw_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (account_id, external_transaction_id)
        DO UPDATE SET
          amount = EXCLUDED.amount, description = EXCLUDED.description,
          merchant_name = EXCLUDED.merchant_name, category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory, transaction_type = EXCLUDED.transaction_type,
          status = EXCLUDED.status, raw_data = EXCLUDED.raw_data
      `, [
        accountId,
        normalized.externalTransactionId,
        normalized.amount,
        normalized.currency,
        normalized.description,
        normalized.merchantName,
        normalized.category,
        normalized.subcategory,
        normalized.transactionDate,
        normalized.transactionType,
        normalized.status,
        JSON.stringify(tx),
      ]);
      transactionsSynced++;
    }

    // Update connection timestamp
    await run(
      'UPDATE bank_connections SET last_synced_at = NOW(), updated_at = NOW(), status = $1 WHERE id = $2',
      ['active', connection.id]
    );

    return { accountsSynced, transactionsSynced };
  },

  /**
   * Revoke a Plaid item (bank link).
   */
  async deleteLink(_provider, externalLinkId) {
    const res = await fetch(`${getBaseUrl()}/item/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_token: externalLinkId,
      }),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Plaid item remove failed: ${res.status}`);
    }
  },
};

// ─── Normalizers ────────────────────────────────────────────────

function normalizePlaidAccount(acct) {
  const typeMap = { depository: acct.subtype === 'savings' ? 'savings' : 'checking', credit: 'credit_card', loan: 'loan', investment: 'investment' };
  return {
    externalAccountId: acct.account_id,
    name: acct.name || acct.official_name || 'Account',
    type: typeMap[acct.type] || 'other',
    currency: acct.balances?.iso_currency_code || 'MXN',
    balanceCurrent: acct.balances?.current ?? null,
    balanceAvailable: acct.balances?.available ?? null,
    lastFour: acct.mask || null,
  };
}

function normalizePlaidTransaction(tx) {
  let txType = 'OUTFLOW';
  if (tx.amount < 0) txType = 'INFLOW'; // Plaid: negative = money in
  if (tx.transaction_type === 'special' || tx.transaction_type === 'transfer') txType = 'TRANSFER';

  return {
    externalTransactionId: tx.transaction_id,
    externalAccountId: tx.account_id,
    amount: Math.abs(tx.amount),
    currency: tx.iso_currency_code || 'MXN',
    description: tx.name || '',
    merchantName: tx.merchant_name || null,
    category: tx.personal_finance_category?.primary || tx.category?.[0] || null,
    subcategory: tx.personal_finance_category?.detailed || tx.category?.[1] || null,
    transactionDate: tx.date,
    transactionType: txType,
    status: tx.pending ? 'pending' : 'posted',
  };
}

export default BankingService;
