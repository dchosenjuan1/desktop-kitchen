/**
 * Migration 0020 — Fix missing RLS on tenant_credentials and leads tables.
 *
 * tenant_credentials: stored OAuth credentials were readable by any tenant (CRITICAL).
 * leads: cross-tenant lead data was visible (HIGH).
 */

export const version = 20;
export const name = 'rls_fixes';

export async function up(sql) {
  // ── tenant_credentials: enable RLS, add policy, index, grants ──
  await sql`ALTER TABLE tenant_credentials ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE tenant_credentials FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON tenant_credentials`;
  await sql`
    CREATE POLICY tenant_isolation ON tenant_credentials
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_tenant_credentials_tenant
    ON tenant_credentials(tenant_id)`;
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_credentials TO app_user`;

  // ── leads: enable RLS, add policy, fix unique constraint, grants ──
  await sql`ALTER TABLE leads ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE leads FORCE ROW LEVEL SECURITY`;
  await sql`DROP POLICY IF EXISTS tenant_isolation ON leads`;
  await sql`
    CREATE POLICY tenant_isolation ON leads
      USING (tenant_id = current_setting('app.tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
  `;
  // Replace email-only unique index with (tenant_id, email) to prevent cross-tenant collisions
  await sql`DROP INDEX IF EXISTS leads_email_unique`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS leads_tenant_email_unique
    ON leads (tenant_id, email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_leads_tenant
    ON leads(tenant_id)`;
  await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO app_user`;
}
