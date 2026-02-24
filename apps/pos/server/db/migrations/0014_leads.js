/**
 * Migration 0014 — Create leads table for campaign tracking (e.g. mexico50 flyer).
 */

export const version = 14;
export const name = '0014_leads';

export async function up(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      restaurant_name TEXT,
      name TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      promo_code TEXT,
      source TEXT DEFAULT 'mexico50_flyer',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      converted_at TIMESTAMPTZ DEFAULT NULL,
      tenant_id TEXT DEFAULT NULL
    )
  `;

  // Unique constraint on email for upsert behavior
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique ON leads (email)
  `;
}
