export const version = 8;
export const name = 'dynamic_pricing';

export async function up(sql) {
  // ==================== price_history ====================
  await sql`
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      old_price NUMERIC(10,2) NOT NULL,
      new_price NUMERIC(10,2) NOT NULL,
      change_percent REAL,
      reason TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      pricing_rule_id INTEGER,
      experiment_id INTEGER,
      created_by INTEGER REFERENCES employees(id),
      reverted_at TIMESTAMPTZ,
      reverted_by INTEGER REFERENCES employees(id),
      revenue_before_daily NUMERIC(10,2),
      revenue_after_daily NUMERIC(10,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE price_history ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE price_history FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON price_history`;
  await sql`
    CREATE POLICY tenant_isolation ON price_history
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_price_history_tenant ON price_history(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(tenant_id, menu_item_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_price_history_source ON price_history(tenant_id, source)`;
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON price_history TO app_user`;
  await sql`GRANT USAGE, SELECT ON price_history_id_seq TO app_user`;

  // ==================== pricing_rules ====================
  await sql`
    CREATE TABLE IF NOT EXISTS pricing_rules (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      description TEXT,
      conditions JSONB NOT NULL DEFAULT '{}',
      adjustment_type TEXT NOT NULL DEFAULT 'percent',
      adjustment_value REAL NOT NULL,
      applies_to JSONB NOT NULL DEFAULT '{"scope":"all"}',
      priority INTEGER DEFAULT 0,
      max_stack BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      auto_apply BOOLEAN DEFAULT false,
      created_by INTEGER REFERENCES employees(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE pricing_rules FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON pricing_rules`;
  await sql`
    CREATE POLICY tenant_isolation ON pricing_rules
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant ON pricing_rules(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(tenant_id, active) WHERE active = true`;
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_rules TO app_user`;
  await sql`GRANT USAGE, SELECT ON pricing_rules_id_seq TO app_user`;

  // ==================== pricing_experiments ====================
  await sql`
    CREATE TABLE IF NOT EXISTS pricing_experiments (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      name TEXT NOT NULL,
      description TEXT,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      variant_a_price NUMERIC(10,2) NOT NULL,
      variant_b_price NUMERIC(10,2) NOT NULL,
      split_percent INTEGER DEFAULT 50,
      status TEXT DEFAULT 'draft',
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      results JSONB DEFAULT '{}',
      created_by INTEGER REFERENCES employees(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE pricing_experiments ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE pricing_experiments FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON pricing_experiments`;
  await sql`
    CREATE POLICY tenant_isolation ON pricing_experiments
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pricing_experiments_tenant ON pricing_experiments(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pricing_experiments_active ON pricing_experiments(tenant_id, status) WHERE status = 'running'`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pricing_experiments_item ON pricing_experiments(tenant_id, menu_item_id)`;
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_experiments TO app_user`;
  await sql`GRANT USAGE, SELECT ON pricing_experiments_id_seq TO app_user`;

  // ==================== pricing_guardrails ====================
  await sql`
    CREATE TABLE IF NOT EXISTS pricing_guardrails (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      min_change_percent REAL DEFAULT -20,
      max_change_percent REAL DEFAULT 15,
      max_daily_changes INTEGER DEFAULT 10,
      require_approval_above REAL DEFAULT 10,
      protected_item_ids JSONB DEFAULT '[]',
      notification_email TEXT,
      cooldown_hours INTEGER DEFAULT 24,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id)
    )
  `;

  await sql`ALTER TABLE pricing_guardrails ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE pricing_guardrails FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON pricing_guardrails`;
  await sql`
    CREATE POLICY tenant_isolation ON pricing_guardrails
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_pricing_guardrails_tenant ON pricing_guardrails(tenant_id)`;
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON pricing_guardrails TO app_user`;
  await sql`GRANT USAGE, SELECT ON pricing_guardrails_id_seq TO app_user`;

  // Add FK from price_history to pricing_rules and pricing_experiments
  await sql`ALTER TABLE price_history ADD CONSTRAINT fk_price_history_rule FOREIGN KEY (pricing_rule_id) REFERENCES pricing_rules(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE price_history ADD CONSTRAINT fk_price_history_experiment FOREIGN KEY (experiment_id) REFERENCES pricing_experiments(id) ON DELETE SET NULL`;
}
