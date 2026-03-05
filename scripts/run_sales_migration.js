#!/usr/bin/env node

/**
 * Run the sales team commission tracking migration.
 *
 * Uses the same postgres.js connection pattern as the POS backend.
 * Requires DATABASE_URL environment variable (Neon Postgres).
 *
 * Usage:
 *   node scripts/run_sales_migration.js
 *   # or with explicit env:
 *   DATABASE_URL=postgres://... node scripts/run_sales_migration.js
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  console.error('  export DATABASE_URL=postgres://neondb_owner:...@.../neondb?sslmode=require');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  max: 1,
  idle_timeout: 10,
  connect_timeout: 10,
});

async function run() {
  const migrationPath = resolve(__dirname, '..', 'migrations', 'sales_team.sql');
  const migrationSql = readFileSync(migrationPath, 'utf-8');

  console.log('[migration] Connecting to database...');
  const [{ connected }] = await sql`SELECT 1 as connected`;
  if (connected !== 1) throw new Error('Database connection check failed');
  console.log('[migration] Connected.');

  console.log('[migration] Applying sales_team migration...');
  await sql.begin(async (tx) => {
    await tx.unsafe(migrationSql);
  });
  console.log('[migration] Done. Tables created:');
  console.log('  - sales_reps');
  console.log('  - prospects');
  console.log('  - commissions');

  // Verify tables exist
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('sales_reps', 'prospects', 'commissions')
    ORDER BY table_name
  `;
  console.log(`[migration] Verified ${tables.length}/3 tables present.`);

  if (tables.length !== 3) {
    console.error('[migration] WARNING: Expected 3 tables but found', tables.length);
    process.exit(1);
  }
}

run()
  .catch((err) => {
    console.error('[migration] FAILED:', err.message);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
