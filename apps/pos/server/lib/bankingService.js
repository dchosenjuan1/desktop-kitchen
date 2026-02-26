/**
 * BankingService — abstraction layer for open banking providers (Belvo / Plaid).
 *
 * Delegates to the configured provider based on tenant settings or env vars.
 * Each provider adapter implements: createWidgetToken, exchangeToken, syncConnection, deleteLink.
 */

import { all, get, run } from '../db/index.js';

// ─── Provider Configuration ─────────────────────────────────────────

const BELVO_API_URL = process.env.BELVO_API_URL || 'https://sandbox.belvo.com';
const BELVO_SECRET_ID = process.env.BELVO_SECRET_ID || '';
const BELVO_SECRET_PASSWORD = process.env.BELVO_SECRET_PASSWORD || '';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID || '';
const PLAID_SECRET = process.env.PLAID_SECRET || '';
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

const PLAID_BASE_URLS = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

function getProvider(tenant) {
  // Prefer tenant-level override, fall back to env-based detection
  if (BELVO_SECRET_ID) return 'belvo';
  if (PLAID_CLIENT_ID) return 'plaid';
  return 'belvo'; // default for LATAM
}

// ─── Belvo Adapter ──────────────────────────────────────────────────

const belvo = {
  async createWidgetToken(tenant) {
    const res = await fetch(`${BELVO_API_URL}/api/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${BELVO_SECRET_ID}:${BELVO_SECRET_PASSWORD}`).toString('base64'),
      },
      body: JSON.stringify({
        id: BELVO_SECRET_ID,
        password: BELVO_SECRET_PASSWORD,
        scopes: 'read_institutions,connect_widget,read_accounts,read_transactions',
        widget: {
          branding: { company_name: tenant.name || 'Desktop Kitchen' },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Belvo widget token failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    return {
      token: data.access,
      provider: 'belvo',
      widgetJsUrl: 'https://cdn.belvo.io/belvo-widget-1-stable.js',
    };
  },

  async exchangeToken(_tenant, publicToken) {
    // In Belvo, the widget returns a link_id directly (not a public token exchange).
    // The publicToken here IS the link_id from Belvo's widget callback.
    return { linkId: publicToken, provider: 'belvo' };
  },

  async syncConnection(connection) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${BELVO_SECRET_ID}:${BELVO_SECRET_PASSWORD}`).toString('base64'),
    };

    // Fetch accounts
    const accountsRes = await fetch(`${BELVO_API_URL}/api/accounts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ link: connection.external_link_id }),
    });

    let accounts = [];
    if (accountsRes.ok) {
      accounts = await accountsRes.json();
    }

    // Fetch transactions (last 90 days)
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    const dateTo = now.toISOString().split('T')[0];
    const dateFrom = from.toISOString().split('T')[0];

    const txRes = await fetch(`${BELVO_API_URL}/api/transactions/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        link: connection.external_link_id,
        date_from: dateFrom,
        date_to: dateTo,
      }),
    });

    let transactions = [];
    if (txRes.ok) {
      transactions = await txRes.json();
    }

    return { accounts, transactions };
  },

  async deleteLink(externalLinkId) {
    const res = await fetch(`${BELVO_API_URL}/api/links/${externalLinkId}/`, {
      method: 'DELETE',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${BELVO_SECRET_ID}:${BELVO_SECRET_PASSWORD}`).toString('base64'),
      },
    });
    // 204 = success, 404 = already deleted — both acceptable
    if (!res.ok && res.status !== 404) {
      throw new Error(`Belvo delete link failed: ${res.status}`);
    }
  },
};

// ─── Plaid Adapter ──────────────────────────────────────────────────

const plaid = {
  async createWidgetToken(tenant) {
    const baseUrl = PLAID_BASE_URLS[PLAID_ENV] || PLAID_BASE_URLS.sandbox;
    const res = await fetch(`${baseUrl}/link/token/create`, {
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

  async exchangeToken(_tenant, publicToken) {
    const baseUrl = PLAID_BASE_URLS[PLAID_ENV] || PLAID_BASE_URLS.sandbox;
    const res = await fetch(`${baseUrl}/item/public_token/exchange`, {
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

  async syncConnection(connection) {
    const baseUrl = PLAID_BASE_URLS[PLAID_ENV] || PLAID_BASE_URLS.sandbox;
    const headers = { 'Content-Type': 'application/json' };
    const auth = { client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, access_token: connection.external_link_id };

    // Fetch accounts
    const accountsRes = await fetch(`${baseUrl}/accounts/get`, {
      method: 'POST', headers,
      body: JSON.stringify(auth),
    });
    let accounts = [];
    if (accountsRes.ok) {
      const data = await accountsRes.json();
      accounts = data.accounts || [];
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
    let transactions = [];
    if (txRes.ok) {
      const data = await txRes.json();
      transactions = data.transactions || [];
    }

    return { accounts, transactions };
  },

  async deleteLink(externalLinkId) {
    const baseUrl = PLAID_BASE_URLS[PLAID_ENV] || PLAID_BASE_URLS.sandbox;
    const res = await fetch(`${baseUrl}/item/remove`, {
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

// ─── Provider Registry ──────────────────────────────────────────────

const providers = { belvo, plaid };

function getAdapter(provider) {
  return providers[provider] || providers.belvo;
}

// ─── Public API ─────────────────────────────────────────────────────

export const BankingService = {
  /**
   * Create a widget token for the frontend to initialize the bank link widget.
   */
  async createWidgetToken(tenant) {
    const provider = getProvider(tenant);
    const adapter = getAdapter(provider);
    return adapter.createWidgetToken(tenant);
  },

  /**
   * Exchange a public/link token from the widget into a persistent connection.
   * Returns { linkId, provider }.
   */
  async exchangeToken(tenant, publicToken) {
    const provider = getProvider(tenant);
    const adapter = getAdapter(provider);
    return adapter.exchangeToken(tenant, publicToken);
  },

  /**
   * Sync accounts and transactions for a bank_connection row.
   * Upserts into bank_accounts and bank_transactions.
   * Returns { accountsSynced, transactionsSynced }.
   */
  async syncConnection(connection) {
    const adapter = getAdapter(connection.provider);
    const { accounts: rawAccounts, transactions: rawTx } = await adapter.syncConnection(connection);

    let accountsSynced = 0;
    let transactionsSynced = 0;

    // Normalize and upsert accounts
    for (const acct of rawAccounts) {
      const normalized = connection.provider === 'belvo'
        ? normalizeBelvoAccount(acct)
        : normalizePlaidAccount(acct);

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
      const normalized = connection.provider === 'belvo'
        ? normalizeBelvoTransaction(tx)
        : normalizePlaidTransaction(tx);

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
   * Revoke a link at the provider level.
   */
  async deleteLink(provider, externalLinkId) {
    const adapter = getAdapter(provider);
    await adapter.deleteLink(externalLinkId);
  },
};

// ─── Normalizers ────────────────────────────────────────────────────

const BELVO_ACCOUNT_TYPE_MAP = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT_CARD: 'credit_card',
  LOAN: 'loan',
  INVESTMENT: 'investment',
};

function normalizeBelvoAccount(acct) {
  return {
    externalAccountId: acct.id,
    name: acct.name || acct.number || 'Account',
    type: BELVO_ACCOUNT_TYPE_MAP[acct.category] || 'other',
    currency: acct.currency || 'MXN',
    balanceCurrent: acct.balance?.current ?? null,
    balanceAvailable: acct.balance?.available ?? null,
    lastFour: acct.number ? acct.number.slice(-4) : null,
  };
}

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

function normalizeBelvoTransaction(tx) {
  let txType = 'OUTFLOW';
  if (tx.type === 'INFLOW') txType = 'INFLOW';
  else if (tx.type === 'OUTFLOW') txType = 'OUTFLOW';
  else if (typeof tx.amount === 'number' && tx.amount > 0) txType = 'INFLOW';

  return {
    externalTransactionId: tx.id,
    externalAccountId: tx.account?.id || tx.account,
    amount: Math.abs(tx.amount),
    currency: tx.currency || 'MXN',
    description: tx.description || '',
    merchantName: tx.merchant?.name || null,
    category: tx.category || null,
    subcategory: tx.subcategory || null,
    transactionDate: tx.value_date || tx.accounting_date,
    transactionType: txType,
    status: tx.status === 'PENDING' ? 'pending' : 'posted',
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
