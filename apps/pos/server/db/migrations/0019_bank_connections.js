export const version = 19;
export const name = 'bank_connections';

export async function up(sql) {
  // ── bank_connections ──────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS bank_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      provider TEXT NOT NULL CHECK (provider IN ('belvo', 'plaid')),
      external_link_id TEXT NOT NULL,
      institution_name TEXT,
      institution_logo_url TEXT,
      country_code CHAR(2) NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error', 'pending')),
      last_synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE bank_connections FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON bank_connections`;
  await sql`
    CREATE POLICY tenant_isolation ON bank_connections
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bank_connections_tenant
    ON bank_connections(tenant_id)`;

  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON bank_connections TO app_user`;

  // ── bank_accounts ─────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
      external_account_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK (type IN ('checking', 'savings', 'credit_card', 'loan', 'investment', 'other')),
      currency CHAR(3) DEFAULT 'MXN',
      balance_current NUMERIC(14,2),
      balance_available NUMERIC(14,2),
      last_four TEXT,
      is_primary BOOLEAN DEFAULT false,
      synced_at TIMESTAMPTZ,
      UNIQUE(connection_id, external_account_id)
    )
  `;

  await sql`ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE bank_accounts FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON bank_accounts`;
  await sql`
    CREATE POLICY tenant_isolation ON bank_accounts
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant
    ON bank_accounts(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection
    ON bank_accounts(connection_id)`;

  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON bank_accounts TO app_user`;

  // ── bank_transactions ─────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
      external_transaction_id TEXT,
      amount NUMERIC(14,2) NOT NULL,
      currency CHAR(3) DEFAULT 'MXN',
      description TEXT,
      merchant_name TEXT,
      category TEXT,
      subcategory TEXT,
      transaction_date DATE NOT NULL,
      transaction_type TEXT CHECK (transaction_type IN ('INFLOW', 'OUTFLOW', 'TRANSFER')),
      status TEXT DEFAULT 'posted' CHECK (status IN ('posted', 'pending')),
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(account_id, external_transaction_id)
    )
  `;

  await sql`ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE bank_transactions FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON bank_transactions`;
  await sql`
    CREATE POLICY tenant_isolation ON bank_transactions
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bank_transactions_tenant
    ON bank_transactions(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bank_transactions_account
    ON bank_transactions(account_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bank_transactions_date
    ON bank_transactions(tenant_id, transaction_date DESC)`;

  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON bank_transactions TO app_user`;

  // ── bank_sync_logs ────────────────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS bank_sync_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      connection_id UUID REFERENCES bank_connections(id) ON DELETE SET NULL,
      sync_type TEXT CHECK (sync_type IN ('manual', 'scheduled', 'webhook')),
      status TEXT CHECK (status IN ('success', 'partial', 'failed')),
      accounts_synced INTEGER DEFAULT 0,
      transactions_synced INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `;

  await sql`ALTER TABLE bank_sync_logs ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE bank_sync_logs FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON bank_sync_logs`;
  await sql`
    CREATE POLICY tenant_isolation ON bank_sync_logs
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_bank_sync_logs_tenant
    ON bank_sync_logs(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bank_sync_logs_connection
    ON bank_sync_logs(connection_id)`;

  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON bank_sync_logs TO app_user`;
}
