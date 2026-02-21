import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applySchema, createDbHelpers } from './db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const tenantsDir = path.join(dataDir, 'tenants');
const masterDbPath = path.join(dataDir, 'master.db');

// Ensure directories exist
for (const dir of [dataDir, tenantsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let masterDb = null;

/** Open (or create) the master registry database */
export function initMasterDb() {
  if (masterDb) return masterDb;

  masterDb = new Database(masterDbPath);
  masterDb.pragma('journal_mode = WAL');
  masterDb.pragma('foreign_keys = ON');

  masterDb.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subdomain TEXT UNIQUE,
      plan TEXT DEFAULT 'trial',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT DEFAULT 'active',
      owner_email TEXT NOT NULL,
      owner_password_hash TEXT NOT NULL,
      branding_json TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  return masterDb;
}

/** Get the master DB (must call initMasterDb first) */
export function getMasterDb() {
  if (!masterDb) throw new Error('Master DB not initialized. Call initMasterDb() first.');
  return masterDb;
}

// ==================== Tenant DB Pool ====================

/** Cache of open tenant Database connections: tenantId -> Database */
const tenantPool = new Map();

/**
 * Open (or return cached) a tenant's SQLite database.
 * Creates the file and applies the full POS schema if it doesn't exist.
 */
export function openTenantDb(tenantId) {
  if (tenantPool.has(tenantId)) return tenantPool.get(tenantId);

  const tenantDbPath = path.join(tenantsDir, `${tenantId}.db`);
  const isNew = !fs.existsSync(tenantDbPath);

  const tenantDb = new Database(tenantDbPath);
  tenantDb.pragma('journal_mode = WAL');
  tenantDb.pragma('foreign_keys = ON');

  if (isNew) {
    applySchema(tenantDb);
    console.log(`[Tenants] Initialized new tenant DB: ${tenantId}`);
  }

  tenantPool.set(tenantId, tenantDb);
  return tenantDb;
}

/** Close all cached tenant connections (for graceful shutdown) */
export function closeAllTenantDbs() {
  for (const [id, tdb] of tenantPool) {
    try { tdb.close(); } catch {}
  }
  tenantPool.clear();
  if (masterDb) {
    try { masterDb.close(); } catch {}
    masterDb = null;
  }
}

// Cleanup on exit
process.on('exit', closeAllTenantDbs);

// ==================== Tenant CRUD ====================

/** Look up a tenant by ID */
export function getTenant(tenantId) {
  const db = getMasterDb();
  return db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
}

/** Look up a tenant by subdomain */
export function getTenantBySubdomain(subdomain) {
  const db = getMasterDb();
  return db.prepare('SELECT * FROM tenants WHERE subdomain = ? AND active = 1').get(subdomain);
}

/** Look up a tenant by email */
export function getTenantByEmail(email) {
  const db = getMasterDb();
  return db.prepare('SELECT * FROM tenants WHERE owner_email = ?').get(email);
}

/** Create a new tenant in the master registry and initialize its DB */
export function createTenant({ id, name, subdomain, owner_email, owner_password_hash, plan, branding_json }) {
  const db = getMasterDb();

  db.prepare(`
    INSERT INTO tenants (id, name, subdomain, owner_email, owner_password_hash, plan, branding_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, subdomain || id, owner_email, owner_password_hash, plan || 'trial', branding_json || null);

  // Initialize the tenant's POS database
  openTenantDb(id);

  return getTenant(id);
}

/** Update tenant fields */
export function updateTenant(tenantId, updates) {
  const db = getMasterDb();
  const fields = [];
  const values = [];

  for (const [key, val] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(val);
  }

  if (fields.length === 0) return;
  values.push(tenantId);
  db.prepare(`UPDATE tenants SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

/** List all tenants with optional stats */
export function listTenants() {
  const db = getMasterDb();
  const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();

  return tenants.map(t => {
    let stats = {};
    try {
      const tdb = openTenantDb(t.id);
      const helpers = createDbHelpers(tdb);
      const orderCount = helpers.get('SELECT COUNT(*) as cnt FROM orders');
      const employeeCount = helpers.get('SELECT COUNT(*) as cnt FROM employees');
      stats = {
        order_count: orderCount?.cnt || 0,
        employee_count: employeeCount?.cnt || 0,
      };
    } catch {}
    return { ...t, ...stats };
  });
}
