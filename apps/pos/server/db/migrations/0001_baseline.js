/**
 * Baseline migration — no-op for fresh Postgres installs.
 * The full schema is already defined in pg-schema.sql.
 * Kept for version tracking consistency.
 */

export const version = 1;
export const name = 'baseline';

export async function up(sql) {
  // All columns already exist in the Postgres schema.
  // This migration exists only to record version 1 in schema_version.
}
