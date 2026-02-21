import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { applySchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'juanbertos.db');

let db = null;

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ==================== Tenant Context ====================
// AsyncLocalStorage allows tenant middleware to set a per-request DB
// so run/get/all/exec automatically resolve to the right tenant DB.
export const tenantContext = new AsyncLocalStorage();

// Re-export applySchema so existing imports still work
export { applySchema };

// ==================== Init ====================

/**
 * Initialize the default database with WAL mode and foreign keys.
 * Kept async for backward-compatible `await initDb()` call sites.
 */
export async function initDb() {
  if (db !== null) return db;

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applySchema(db);

  return db;
}

/**
 * Get the current database. Checks tenant context first (per-request),
 * falls back to the default singleton DB.
 */
export function getDb() {
  const store = tenantContext.getStore();
  if (store?.db) return store.db;
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/** No-op: better-sqlite3 writes are synchronous and durable. */
export function saveDb() {}
/** No-op: better-sqlite3 writes are synchronous and durable. */
export function saveDbSync() {}

// ==================== Query Helpers ====================

/** Execute INSERT/UPDATE/DELETE and return { lastInsertRowid } */
export function run(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  const result = stmt.run(...params);
  return { lastInsertRowid: Number(result.lastInsertRowid) };
}

/** Execute a SELECT query and return a single row as an object (or undefined) */
export function get(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.get(...params);
}

/** Execute a SELECT query and return all rows as objects */
export function all(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.all(...params);
}

/** Execute raw SQL (multi-statement DDL/DML without parameters) */
export function exec(sql) {
  const database = getDb();
  return database.exec(sql);
}

/**
 * Create bound run/get/all/exec helpers for a specific database instance.
 * Used by tenant system when direct DB access is needed outside of request context.
 */
export function createDbHelpers(database) {
  return {
    run(sql, params = []) {
      const result = database.prepare(sql).run(...params);
      return { lastInsertRowid: Number(result.lastInsertRowid) };
    },
    get(sql, params = []) {
      return database.prepare(sql).get(...params);
    },
    all(sql, params = []) {
      return database.prepare(sql).all(...params);
    },
    exec(sql) {
      return database.exec(sql);
    },
  };
}

// Graceful close on process exit
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

process.on('exit', closeDb);
process.on('SIGINT', () => { closeDb(); process.exit(); });
process.on('SIGTERM', () => { closeDb(); process.exit(); });

// Proxy object for backward compatibility
const dbProxy = {
  prepare: (sql) => ({
    run: (...params) => run(sql, params),
    get: (param) => get(sql, param !== undefined ? [param] : []),
    all: (...params) => all(sql, params),
  }),
  exec: (sql) => exec(sql),
  run: (sql, params) => run(sql, params),
  get: (sql, params) => get(sql, params),
  all: (sql, params) => all(sql, params),
};

export default dbProxy;
