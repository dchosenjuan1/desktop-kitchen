export const version = 26;
export const name = 'trial_ends_at';

export async function up(sql) {
  // Add trial_ends_at column to tenants table
  await sql`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ
  `;

  // Backfill existing trial tenants: trial_ends_at = created_at + 14 days
  await sql`
    UPDATE tenants
    SET trial_ends_at = created_at + INTERVAL '14 days'
    WHERE plan = 'trial' AND trial_ends_at IS NULL
  `;
}
