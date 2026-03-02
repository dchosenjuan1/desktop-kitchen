export const version = 25;
export const name = 'demo_batch_id';

export async function up(sql) {
  // Tracking table for demo data generation runs
  await sql`
    CREATE TABLE IF NOT EXISTS stress_test_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      config JSONB,
      summary JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  // Add demo_batch_id to loyalty tables
  const loyaltyTables = ['loyalty_customers', 'stamp_cards', 'stamp_events', 'referral_events'];
  for (const table of loyaltyTables) {
    await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS demo_batch_id UUID`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_${table}_demo ON ${table} (demo_batch_id) WHERE demo_batch_id IS NOT NULL`);
  }

  // Add demo_batch_id to AI tables
  const aiTables = ['ai_hourly_snapshots', 'ai_item_pairs', 'ai_inventory_velocity', 'ai_suggestion_cache'];
  for (const table of aiTables) {
    await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS demo_batch_id UUID`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_${table}_demo ON ${table} (demo_batch_id) WHERE demo_batch_id IS NOT NULL`);
  }

  // Add demo_batch_id to financial/waste tables
  const otherTables = ['financial_actuals', 'waste_log'];
  for (const table of otherTables) {
    await sql.unsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS demo_batch_id UUID`);
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_${table}_demo ON ${table} (demo_batch_id) WHERE demo_batch_id IS NOT NULL`);
  }
}
