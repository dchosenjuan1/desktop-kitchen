export const version = 33;
export const name = 'expenses';

export async function up(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
      category TEXT NOT NULL CHECK (category IN ('food_cost','supplies','utilities','rent','marketing','other')),
      vendor TEXT,
      description TEXT,
      amount NUMERIC(10,2) NOT NULL,
      tax_amount NUMERIC(10,2) DEFAULT 0,
      receipt_image_url TEXT,
      receipt_data JSONB,
      expense_date DATE NOT NULL,
      payment_method TEXT CHECK (payment_method IS NULL OR payment_method IN ('cash','card','transfer')),
      notes TEXT,
      created_by INTEGER REFERENCES employees(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE expenses ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE expenses FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON expenses`;
  await sql`
    CREATE POLICY tenant_isolation ON expenses
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_tenant
    ON expenses(tenant_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_expenses_date
    ON expenses(tenant_id, expense_date)`;

  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON expenses TO app_user`;
  await sql`GRANT USAGE, SELECT ON expenses_id_seq TO app_user`;
}
