export const version = 29;
export const name = 'financing_engine';

export async function up(sql) {
  // ─── Platform-level tables (NO RLS — accessed via adminSql) ────────

  // Merchant financial profiles — one per tenant
  await sql`
    CREATE TABLE IF NOT EXISTS merchant_financial_profiles (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      monthly_avg_revenue NUMERIC(12,2) DEFAULT 0,
      monthly_avg_orders INTEGER DEFAULT 0,
      avg_ticket_size NUMERIC(10,2) DEFAULT 0,
      revenue_trend TEXT DEFAULT 'stable',
      revenue_volatility NUMERIC(6,4) DEFAULT 0,
      refund_rate NUMERIC(6,4) DEFAULT 0,
      days_active INTEGER DEFAULT 0,
      card_revenue_percent NUMERIC(5,2) DEFAULT 0,
      cash_revenue_percent NUMERIC(5,2) DEFAULT 0,
      peak_hour_concentration NUMERIC(5,2) DEFAULT 0,
      avg_daily_orders NUMERIC(8,2) DEFAULT 0,
      risk_score NUMERIC(5,2) DEFAULT 0,
      eligibility_status TEXT DEFAULT 'pending' CHECK (eligibility_status IN ('eligible', 'pre_eligible', 'ineligible', 'pending', 'under_review')),
      max_advance_amount NUMERIC(12,2) DEFAULT 0,
      suggested_holdback_percent NUMERIC(5,2) DEFAULT 10,
      last_calculated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id)
    )
  `;

  // Financing offers
  await sql`
    CREATE TABLE IF NOT EXISTS merchant_financing_offers (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      offer_amount NUMERIC(12,2) NOT NULL,
      holdback_percent NUMERIC(5,2) NOT NULL,
      factor_rate NUMERIC(4,2) NOT NULL,
      total_repayment NUMERIC(12,2) NOT NULL,
      estimated_repayment_days INTEGER NOT NULL,
      status TEXT DEFAULT 'available' CHECK (status IN ('available', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn')),
      accepted_at TIMESTAMPTZ,
      declined_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      admin_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Financing event log
  await sql`
    CREATE TABLE IF NOT EXISTS merchant_financing_events (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      details JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Indexes for platform-level tables
  await sql`CREATE INDEX IF NOT EXISTS idx_mfp_tenant ON merchant_financial_profiles(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mfp_eligibility ON merchant_financial_profiles(eligibility_status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mfp_score ON merchant_financial_profiles(risk_score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mfo_tenant ON merchant_financing_offers(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mfo_status ON merchant_financing_offers(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mfe_tenant ON merchant_financing_events(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mfe_type ON merchant_financing_events(event_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mfe_created ON merchant_financing_events(created_at DESC)`;

  // ─── Tenant consent columns ────────────────────────────────────────

  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS financing_consent_at TIMESTAMPTZ`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS financing_consent_ip TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS financing_consent_version TEXT DEFAULT '1.0'`;

  // ─── Tenant-scoped table (WITH RLS) ────────────────────────────────

  await sql`
    CREATE TABLE IF NOT EXISTS data_processing_consent (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id'),
      consent_type TEXT NOT NULL,
      accepted BOOLEAN DEFAULT false,
      accepted_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      ip_address TEXT,
      user_agent TEXT,
      consent_version TEXT DEFAULT '1.0',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE data_processing_consent ENABLE ROW LEVEL SECURITY`;
  await sql`
    CREATE POLICY data_processing_consent_isolation ON data_processing_consent
    FOR ALL USING (tenant_id = current_setting('app.tenant_id'))
  `;

  // Grant app_user access to RLS-enforced table
  await sql`GRANT ALL ON data_processing_consent TO app_user`;
  await sql`GRANT USAGE, SELECT ON SEQUENCE data_processing_consent_id_seq TO app_user`;
}
