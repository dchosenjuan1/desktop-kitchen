import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const dbPath = path.join(dataDir, 'juanbertos.db');

let db = null;
let SQL = null;

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Initialize sql.js database
 */
export async function initDb() {
  if (db !== null) return db;

  // Initialize sql.js
  SQL = await initSqlJs();

  // Try to load existing database file
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT DEFAULT 'cashier',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER,
      active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES menu_categories(id),
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      image_url TEXT,
      active INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number INTEGER NOT NULL,
      employee_id INTEGER NOT NULL REFERENCES employees(id),
      status TEXT DEFAULT 'pending',
      subtotal REAL,
      tax REAL,
      tip REAL DEFAULT 0,
      total REAL,
      payment_intent_id TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      completed_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      menu_item_id INTEGER REFERENCES menu_items(id),
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      notes TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      low_stock_threshold REAL,
      category TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS menu_item_ingredients (
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      quantity_used REAL NOT NULL,
      PRIMARY KEY(menu_item_id, inventory_item_id)
    )
  `);

  // ==================== AI Intelligence Layer Tables ====================

  // Pre-computed suggestions the frontend reads from
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_suggestion_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_type TEXT NOT NULL,
      trigger_context TEXT,
      suggestion_data TEXT NOT NULL,
      priority INTEGER DEFAULT 50,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Maps categories to roles for generalizability
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_category_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES menu_categories(id),
      role TEXT NOT NULL,
      UNIQUE(category_id)
    )
  `);

  // Key-value config store for restaurant-specific AI settings
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Tracks if cashier accepted/dismissed suggestions
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_suggestion_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_type TEXT NOT NULL,
      suggestion_data TEXT,
      action TEXT NOT NULL,
      employee_id INTEGER REFERENCES employees(id),
      order_id INTEGER REFERENCES orders(id),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Hourly aggregated sales snapshots
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_hourly_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_hour TEXT NOT NULL,
      order_count INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      avg_ticket REAL DEFAULT 0,
      day_of_week INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Items frequently ordered together
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_item_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_a_id INTEGER NOT NULL REFERENCES menu_items(id),
      item_b_id INTEGER NOT NULL REFERENCES menu_items(id),
      pair_count INTEGER DEFAULT 1,
      last_seen TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(item_a_id, item_b_id)
    )
  `);

  // Daily consumption rate per inventory item
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_inventory_velocity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      date TEXT NOT NULL,
      quantity_used REAL DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      UNIQUE(inventory_item_id, date)
    )
  `);

  // Tracks restock events for pattern analysis
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_restock_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      quantity_before REAL,
      quantity_added REAL,
      quantity_after REAL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Add was_ai_suggested column to order_items if it doesn't exist
  try {
    db.run(`ALTER TABLE order_items ADD COLUMN was_ai_suggested INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Save to disk (note: just direct save here, not through saveDb() since we're not doing transforms)
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  return db;
}

/**
 * Get the database instance (must call initDb first)
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Save database to disk
 */
export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/**
 * Execute INSERT/UPDATE/DELETE with auto-save
 */
export function run(sql, params = []) {
  const database = getDb();
  database.run(sql, params);
  saveDb();
  // For sql.js, we need to get the lastInsertRowid differently
  // Get it from the database after the insert
  const result = database.exec('SELECT last_insert_rowid() as id');
  const lastId = result.length > 0 && result[0].values.length > 0
    ? result[0].values[0][0]
    : null;
  return { lastInsertRowid: lastId };
}

/**
 * Execute a SELECT query and return a single row as an object
 */
export function get(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }

  stmt.free();
  return undefined;
}

/**
 * Execute a SELECT query and return all rows as objects
 */
export function all(sql, params = []) {
  const database = getDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }

  stmt.free();
  return rows;
}

/**
 * Execute raw SQL (for DML/DDL that doesn't return rows)
 */
export function exec(sql) {
  const database = getDb();
  return database.exec(sql);
}

// Re-export helpers as named exports for convenience
const dbHelpers = {
  initDb,
  getDb,
  saveDb,
  run,
  get,
  all,
  exec,
};

// Create a proxy object that looks like the old db for backward compatibility
const dbProxy = {
  prepare: (sql) => ({
    run: (...params) => run(sql, params),
    get: (param) => get(sql, [param]),
    all: (...params) => all(sql, ...params),
  }),
  exec: (sql) => exec(sql),
  run: (sql, params) => run(sql, params),
  get: (sql, params) => get(sql, params),
  all: (sql, params) => all(sql, params),
};

export default dbProxy;
