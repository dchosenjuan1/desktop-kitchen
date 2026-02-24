export const version = 10;
export const name = 'mercado_pago';

export async function up(sql) {
  // Tenant MP credentials (OAuth tokens stored per-tenant)
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_access_token TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_refresh_token TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_user_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_token_expires_at TIMESTAMPTZ`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_default_terminal_id TEXT`;

  // Order MP tracking
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS mp_order_id TEXT`;

  // Index for webhook lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_mp_order_id ON orders (mp_order_id) WHERE mp_order_id IS NOT NULL`;
}
