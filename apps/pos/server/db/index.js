import postgres from 'postgres';
import { AsyncLocalStorage } from 'node:async_hooks';

// ==================== Tenant Context ====================
export const tenantContext = new AsyncLocalStorage();

// ==================== Connection Pools ====================

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

/**
 * Admin pool — connects as neondb_owner (table owner, bypasses RLS).
 * Used by: admin routes, auth routes, AI scheduler, tenant CRUD, migrations, seeds.
 */
export const adminSql = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

/**
 * Tenant pool — connects as app_user (RLS enforced).
 * Used by: all /api/* tenant-scoped routes via reserve() + set_config.
 */
const PG_APP_USER = process.env.PG_APP_USER || 'app_user';
const PG_APP_PASSWORD = process.env.PG_APP_PASSWORD || '';

// Build tenant connection URL by replacing credentials in DATABASE_URL
function buildTenantUrl() {
  const url = new URL(DATABASE_URL);
  url.username = PG_APP_USER;
  url.password = PG_APP_PASSWORD;
  return url.toString();
}

export const tenantSql = postgres(buildTenantUrl(), {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

// ==================== Parameter Conversion ====================

/**
 * Convert SQLite-style `?` placeholders to Postgres `$1, $2, ...` placeholders.
 * Handles quoted strings (single and double) so `?` inside strings are not replaced.
 */
export function convertParams(sql) {
  let idx = 0;
  let result = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    // Skip single-quoted strings
    if (ch === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") break;
        j++;
      }
      result += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    // Skip double-quoted identifiers
    if (ch === '"') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '"') j++;
      result += sql.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '?') {
      idx++;
      result += '$' + idx;
      i++;
      continue;
    }
    result += ch;
    i++;
  }
  return result;
}

// ==================== Connection Resolution ====================

/**
 * Get the current connection. Checks AsyncLocalStorage for a reserved
 * tenant connection first, falls back to adminSql.
 */
export function getConn() {
  const store = tenantContext.getStore();
  if (store?.conn) return store.conn;
  return adminSql;
}

// ==================== Query Helpers ====================

/**
 * Execute INSERT/UPDATE/DELETE and return { lastInsertRowid }.
 * For INSERTs without RETURNING, auto-appends RETURNING id.
 */
export async function run(sql, params = []) {
  const conn = getConn();
  const pgSql = convertParams(sql);

  // Auto-append RETURNING id for INSERTs that don't already have RETURNING
  const isInsert = /^\s*INSERT\s/i.test(pgSql);
  const hasReturning = /\bRETURNING\b/i.test(pgSql);

  let finalSql = pgSql;
  if (isInsert && !hasReturning) {
    finalSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
  }

  const rows = await conn.unsafe(finalSql, params);

  if (isInsert && rows.length > 0 && rows[0].id != null) {
    return { lastInsertRowid: Number(rows[0].id) };
  }

  return { lastInsertRowid: 0, changes: rows.count ?? 0 };
}

/**
 * Execute a SELECT query and return a single row as an object (or undefined).
 */
export async function get(sql, params = []) {
  const conn = getConn();
  const pgSql = convertParams(sql);
  const rows = await conn.unsafe(pgSql, params);
  return rows[0] || undefined;
}

/**
 * Execute a SELECT query and return all rows as objects.
 */
export async function all(sql, params = []) {
  const conn = getConn();
  const pgSql = convertParams(sql);
  const rows = await conn.unsafe(pgSql, params);
  return Array.from(rows);
}

/**
 * Execute raw SQL (multi-statement DDL/DML without parameters).
 * Splits on semicolons and executes each statement.
 */
export async function exec(sql) {
  const conn = getConn();
  await conn.unsafe(sql);
}

// ==================== Init ====================

/**
 * Initialize the database connection. Tests connectivity and logs success.
 */
export async function initDb() {
  try {
    const result = await adminSql`SELECT 1 as connected`;
    if (result[0]?.connected === 1) {
      console.log('[DB] Postgres connection pools initialized');
    }
  } catch (err) {
    console.error('[DB] Failed to connect to Postgres:', err.message);
    throw err;
  }
}

// ==================== Bound Helpers ====================

/**
 * Create bound run/get/all/exec helpers for a specific connection.
 * Used when you need to run queries on a specific connection outside
 * of the AsyncLocalStorage context (e.g., admin operations).
 */
export function createDbHelpers(conn) {
  return {
    async run(sql, params = []) {
      const pgSql = convertParams(sql);
      const isInsert = /^\s*INSERT\s/i.test(pgSql);
      const hasReturning = /\bRETURNING\b/i.test(pgSql);
      let finalSql = pgSql;
      if (isInsert && !hasReturning) {
        finalSql = pgSql.replace(/;?\s*$/, ' RETURNING id');
      }
      const rows = await conn.unsafe(finalSql, params);
      if (isInsert && rows.length > 0 && rows[0].id != null) {
        return { lastInsertRowid: Number(rows[0].id) };
      }
      return { lastInsertRowid: 0, changes: rows.count ?? 0 };
    },
    async get(sql, params = []) {
      const pgSql = convertParams(sql);
      const rows = await conn.unsafe(pgSql, params);
      return rows[0] || undefined;
    },
    async all(sql, params = []) {
      const pgSql = convertParams(sql);
      const rows = await conn.unsafe(pgSql, params);
      return Array.from(rows);
    },
    async exec(sql) {
      await conn.unsafe(sql);
    },
  };
}

// ==================== Shutdown ====================

async function shutdown() {
  try {
    await adminSql.end({ timeout: 5 });
    await tenantSql.end({ timeout: 5 });
  } catch {}
}

process.on('SIGINT', async () => { await shutdown(); process.exit(); });
process.on('SIGTERM', async () => { await shutdown(); process.exit(); });

// No-ops for backward compatibility
export function saveDb() {}
export function saveDbSync() {}

// Proxy object for backward compatibility (now async — callers must await)
const dbProxy = {
  run: (sql, params) => run(sql, params),
  get: (sql, params) => get(sql, params),
  all: (sql, params) => all(sql, params),
  exec: (sql) => exec(sql),
};

export default dbProxy;
