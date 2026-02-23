export const version = 5;
export const name = 'waste_log';

export async function up(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS waste_log (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      quantity REAL NOT NULL CHECK (quantity > 0),
      unit TEXT,
      reason TEXT NOT NULL CHECK (reason IN ('spoilage','prep_error','dropped','expired','other')),
      cost_at_time NUMERIC(10,2) DEFAULT 0,
      notes TEXT,
      logged_by INTEGER REFERENCES employees(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE waste_log ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE waste_log FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON waste_log`;
  await sql`
    CREATE POLICY tenant_isolation ON waste_log
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_waste_log_tenant
    ON waste_log(tenant_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_waste_log_item
    ON waste_log(tenant_id, inventory_item_id)`;

  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON waste_log TO app_user`;
  await sql`GRANT USAGE, SELECT ON waste_log_id_seq TO app_user`;
}
