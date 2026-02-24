export const version = 12;
export const name = 'audit_log';

export async function up(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT,
      details JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(tenant_id, resource, resource_id)`;
}
