/**
 * Apply the full POS schema to a database. Used by initDb for the default DB
 * and by tenants.js when initializing new tenant databases.
 */
export function applySchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT DEFAULT 'cashier',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS menu_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sort_order INTEGER,
      active INTEGER DEFAULT 1
    )
  `);

  database.exec(`
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

  database.exec(`
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
      completed_at TEXT,
      offline_temp_id TEXT
    )
  `);

  database.exec(`
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

  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT,
      low_stock_threshold REAL,
      category TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS menu_item_ingredients (
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      quantity_used REAL NOT NULL,
      PRIMARY KEY(menu_item_id, inventory_item_id)
    )
  `);

  // AI Intelligence Layer
  database.exec(`
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

  database.exec(`
    CREATE TABLE IF NOT EXISTS ai_category_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES menu_categories(id),
      role TEXT NOT NULL,
      UNIQUE(category_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS ai_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
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

  database.exec(`
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

  database.exec(`
    CREATE TABLE IF NOT EXISTS ai_item_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_a_id INTEGER NOT NULL REFERENCES menu_items(id),
      item_b_id INTEGER NOT NULL REFERENCES menu_items(id),
      pair_count INTEGER DEFAULT 1,
      last_seen TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(item_a_id, item_b_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS ai_inventory_velocity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      date TEXT NOT NULL,
      quantity_used REAL DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      UNIQUE(inventory_item_id, date)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS ai_restock_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      quantity_before REAL,
      quantity_added REAL,
      quantity_after REAL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Column migrations (safe try/catch for existing DBs)
  const alterSafe = (sql) => { try { database.exec(sql); } catch {} };

  alterSafe(`ALTER TABLE order_items ADD COLUMN was_ai_suggested INTEGER DEFAULT 0`);
  alterSafe(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT NULL`);
  alterSafe(`ALTER TABLE inventory_items ADD COLUMN cost_price REAL DEFAULT 0`);
  alterSafe(`ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'pos'`);
  alterSafe(`ALTER TABLE menu_categories ADD COLUMN printer_target TEXT DEFAULT 'kitchen'`);

  // Modifier groups
  database.exec(`
    CREATE TABLE IF NOT EXISTS modifier_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      selection_type TEXT DEFAULT 'single',
      required INTEGER DEFAULT 0,
      min_selections INTEGER DEFAULT 0,
      max_selections INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES modifier_groups(id),
      name TEXT NOT NULL,
      price_adjustment REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      modifier_group_id INTEGER NOT NULL REFERENCES modifier_groups(id),
      sort_order INTEGER DEFAULT 0,
      PRIMARY KEY(menu_item_id, modifier_group_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS order_item_modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL REFERENCES order_items(id),
      modifier_id INTEGER,
      modifier_name TEXT NOT NULL,
      price_adjustment REAL DEFAULT 0
    )
  `);

  alterSafe(`ALTER TABLE order_items ADD COLUMN combo_instance_id TEXT DEFAULT NULL`);

  database.exec(`
    CREATE TABLE IF NOT EXISTS combo_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      combo_price REAL NOT NULL,
      active INTEGER DEFAULT 1
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS combo_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      combo_id INTEGER NOT NULL REFERENCES combo_definitions(id),
      slot_label TEXT NOT NULL,
      category_id INTEGER REFERENCES menu_categories(id),
      specific_item_id INTEGER REFERENCES menu_items(id),
      sort_order INTEGER DEFAULT 0
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS order_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      payment_method TEXT NOT NULL,
      amount REAL NOT NULL,
      tip REAL DEFAULT 0,
      payment_intent_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS order_payment_items (
      payment_id INTEGER NOT NULL REFERENCES order_payments(id),
      order_item_id INTEGER NOT NULL REFERENCES order_items(id),
      amount REAL NOT NULL,
      PRIMARY KEY(payment_id, order_item_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      printer_type TEXT DEFAULT 'kitchen',
      address TEXT,
      active INTEGER DEFAULT 1
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS category_printer_routes (
      category_id INTEGER NOT NULL REFERENCES menu_categories(id),
      printer_id INTEGER NOT NULL REFERENCES printers(id),
      PRIMARY KEY(category_id, printer_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS delivery_platforms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      webhook_secret TEXT,
      commission_percent REAL DEFAULT 0,
      active INTEGER DEFAULT 1
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS delivery_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      platform_id INTEGER NOT NULL REFERENCES delivery_platforms(id),
      external_order_id TEXT,
      platform_status TEXT DEFAULT 'received',
      delivery_fee REAL DEFAULT 0,
      platform_commission REAL DEFAULT 0,
      customer_name TEXT,
      delivery_address TEXT,
      raw_webhook_data TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  alterSafe(`ALTER TABLE orders ADD COLUMN delivery_order_id INTEGER DEFAULT NULL`);

  // Delivery intelligence — markup rules per platform per item
  database.exec(`
    CREATE TABLE IF NOT EXISTS delivery_markup_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform_id INTEGER NOT NULL REFERENCES delivery_platforms(id),
      menu_item_id INTEGER REFERENCES menu_items(id),
      category_id INTEGER REFERENCES menu_categories(id),
      markup_type TEXT NOT NULL DEFAULT 'percent',
      markup_value REAL NOT NULL DEFAULT 0,
      active INTEGER DEFAULT 1,
      UNIQUE(platform_id, menu_item_id),
      UNIQUE(platform_id, category_id)
    )
  `);

  // Virtual brands — different menu presentations per delivery platform
  database.exec(`
    CREATE TABLE IF NOT EXISTS virtual_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      platform_id INTEGER NOT NULL REFERENCES delivery_platforms(id),
      description TEXT,
      logo_url TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Virtual brand menu item assignments
  database.exec(`
    CREATE TABLE IF NOT EXISTS virtual_brand_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      virtual_brand_id INTEGER NOT NULL REFERENCES virtual_brands(id),
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      custom_name TEXT,
      custom_price REAL,
      active INTEGER DEFAULT 1,
      UNIQUE(virtual_brand_id, menu_item_id)
    )
  `);

  // Customer recapture tracking
  database.exec(`
    CREATE TABLE IF NOT EXISTS delivery_recapture (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone TEXT NOT NULL,
      customer_name TEXT,
      platform TEXT NOT NULL,
      last_delivery_order_id INTEGER REFERENCES delivery_orders(id),
      sms_sent_at TEXT,
      converted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Menu board columns on virtual_brands
  alterSafe(`ALTER TABLE virtual_brands ADD COLUMN display_type TEXT DEFAULT 'delivery'`);
  alterSafe(`ALTER TABLE virtual_brands ADD COLUMN primary_color TEXT`);
  alterSafe(`ALTER TABLE virtual_brands ADD COLUMN secondary_color TEXT`);
  alterSafe(`ALTER TABLE virtual_brands ADD COLUMN font_family TEXT`);
  alterSafe(`ALTER TABLE virtual_brands ADD COLUMN dark_bg TEXT`);
  alterSafe(`ALTER TABLE virtual_brands ADD COLUMN slug TEXT`);
  alterSafe(`ALTER TABLE virtual_brands ADD COLUMN show_in_pos INTEGER DEFAULT 1`);
  alterSafe(`ALTER TABLE order_items ADD COLUMN virtual_brand_id INTEGER DEFAULT NULL`);

  // Add markup-related columns to delivery_platforms
  alterSafe(`ALTER TABLE delivery_platforms ADD COLUMN default_markup_percent REAL DEFAULT 0`);
  alterSafe(`ALTER TABLE delivery_platforms ADD COLUMN avg_delivery_time_min INTEGER DEFAULT 30`);
  alterSafe(`ALTER TABLE delivery_platforms ADD COLUMN notes TEXT DEFAULT ''`);

  // Role-Based Permissions
  database.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      granted INTEGER DEFAULT 1,
      UNIQUE(role, permission)
    )
  `);

  // Seed default permissions (only if table is empty)
  const permRow = database.prepare("SELECT COUNT(*) as cnt FROM role_permissions").get();
  const permTotal = permRow?.cnt || 0;
  if (permTotal === 0) {
    const allPermissions = [
      'pos_access', 'kitchen_access', 'bar_access', 'view_reports', 'manage_menu',
      'manage_inventory', 'manage_employees', 'manage_printers', 'manage_delivery',
      'manage_modifiers', 'manage_ai', 'process_refunds', 'void_orders',
      'apply_discounts', 'view_dashboard', 'manage_permissions', 'manage_purchase_orders',
      'manage_loyalty'
    ];

    const roleDefaults = {
      admin: allPermissions,
      manager: allPermissions.filter(p => p !== 'manage_permissions'),
      cashier: ['pos_access', 'view_dashboard'],
      kitchen: ['kitchen_access'],
      bar: ['bar_access'],
    };

    const insertPerm = database.prepare(`INSERT OR IGNORE INTO role_permissions (role, permission, granted) VALUES (?, ?, ?)`);
    for (const [role, perms] of Object.entries(roleDefaults)) {
      for (const perm of allPermissions) {
        const granted = perms.includes(perm) ? 1 : 0;
        insertPerm.run(role, perm, granted);
      }
    }
  }

  // Backfill manage_loyalty
  try {
    const loyaltyPermRow = database.prepare("SELECT COUNT(*) as cnt FROM role_permissions WHERE permission = 'manage_loyalty'").get();
    if ((loyaltyPermRow?.cnt || 0) === 0 && permTotal > 0) {
      const loyaltyRoles = { admin: 1, manager: 1, cashier: 0, kitchen: 0, bar: 0 };
      const insertLoyalty = database.prepare(`INSERT OR IGNORE INTO role_permissions (role, permission, granted) VALUES (?, 'manage_loyalty', ?)`);
      for (const [role, granted] of Object.entries(loyaltyRoles)) {
        insertLoyalty.run(role, granted);
      }
    }
  } catch {}

  // Refunds
  database.exec(`
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      stripe_refund_id TEXT,
      amount REAL NOT NULL,
      reason TEXT,
      refund_type TEXT DEFAULT 'full',
      refunded_by INTEGER REFERENCES employees(id),
      items_json TEXT,
      inventory_restored INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  alterSafe(`ALTER TABLE orders ADD COLUMN refund_total REAL DEFAULT 0`);

  // Crypto Payments
  database.exec(`
    CREATE TABLE IF NOT EXISTS crypto_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      nowpayments_payment_id TEXT,
      pay_address TEXT,
      pay_amount REAL,
      pay_currency TEXT,
      price_amount REAL,
      price_currency TEXT DEFAULT 'mxn',
      status TEXT DEFAULT 'waiting',
      actually_paid REAL DEFAULT 0,
      outcome_amount REAL,
      outcome_currency TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  alterSafe(`ALTER TABLE orders ADD COLUMN crypto_payment_id INTEGER DEFAULT NULL`);

  // Advanced Inventory
  database.exec(`
    CREATE TABLE IF NOT EXISTS inventory_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      counted_quantity REAL NOT NULL,
      system_quantity REAL NOT NULL,
      variance REAL NOT NULL,
      variance_percent REAL,
      counted_by INTEGER REFERENCES employees(id),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS shrinkage_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      alert_type TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      message TEXT,
      variance_amount REAL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_by INTEGER REFERENCES employees(id),
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS vendor_items (
      vendor_id INTEGER NOT NULL REFERENCES vendors(id),
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      vendor_sku TEXT,
      unit_cost REAL DEFAULT 0,
      lead_time_days INTEGER DEFAULT 0,
      min_order_qty REAL DEFAULT 1,
      PRIMARY KEY(vendor_id, inventory_item_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT NOT NULL UNIQUE,
      vendor_id INTEGER NOT NULL REFERENCES vendors(id),
      status TEXT DEFAULT 'draft',
      total_amount REAL DEFAULT 0,
      notes TEXT,
      created_by INTEGER REFERENCES employees(id),
      submitted_at TEXT,
      received_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
      inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
      quantity_ordered REAL NOT NULL,
      unit_cost REAL DEFAULT 0,
      quantity_received REAL DEFAULT 0,
      line_total REAL DEFAULT 0
    )
  `);

  alterSafe(`ALTER TABLE inventory_items ADD COLUMN last_counted_at TEXT`);

  // Financial Projections
  database.exec(`
    CREATE TABLE IF NOT EXISTS financial_targets (
      category TEXT PRIMARY KEY,
      target_percent REAL NOT NULL DEFAULT 0,
      updated_at TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS financial_actuals (
      category TEXT NOT NULL,
      period TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      auto_calculated INTEGER DEFAULT 0,
      UNIQUE(category, period)
    )
  `);

  // Loyalty / CRM
  database.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      referral_code TEXT UNIQUE,
      referred_by INTEGER REFERENCES loyalty_customers(id),
      store_id INTEGER DEFAULT 1,
      stamps_earned INTEGER DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      last_visit TEXT,
      sms_opt_in INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS stamp_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
      stamps_earned INTEGER DEFAULT 0,
      stamps_required INTEGER DEFAULT 10,
      reward_description TEXT DEFAULT 'Free item of your choice',
      completed INTEGER DEFAULT 0,
      redeemed INTEGER DEFAULT 0,
      completed_at TEXT,
      redeemed_at TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS stamp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stamp_card_id INTEGER NOT NULL REFERENCES stamp_cards(id),
      order_id INTEGER REFERENCES orders(id),
      stamps_added INTEGER NOT NULL,
      event_type TEXT DEFAULT 'purchase',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS referral_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
      referee_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
      referrer_stamps_added INTEGER DEFAULT 0,
      referee_stamps_added INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
      message_type TEXT NOT NULL,
      twilio_sid TEXT,
      status TEXT DEFAULT 'sent',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // Seed loyalty config defaults
  const lcRow = database.prepare("SELECT COUNT(*) as cnt FROM loyalty_config").get();
  if ((lcRow?.cnt || 0) === 0) {
    const insertLC = database.prepare(`INSERT OR IGNORE INTO loyalty_config (key, value, description) VALUES (?, ?, ?)`);
    for (const [key, value, desc] of [
      ['stamps_required', '10', 'Number of stamps needed for a free reward'],
      ['reward_description', 'Free item of your choice', 'Default reward description'],
      ['referral_bonus_stamps', '2', 'Bonus stamps for referrer and referee'],
      ['sms_enabled', 'true', 'Enable SMS notifications for loyalty events'],
    ]) {
      insertLC.run(key, value, desc);
    }
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS order_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      items_json TEXT NOT NULL,
      created_by INTEGER,
      active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  alterSafe(`ALTER TABLE orders ADD COLUMN loyalty_customer_id INTEGER DEFAULT NULL`);
  alterSafe(`ALTER TABLE orders ADD COLUMN offline_temp_id TEXT`);

  // Seed financial targets defaults
  const ftRow = database.prepare("SELECT COUNT(*) as cnt FROM financial_targets").get();
  if ((ftRow?.cnt || 0) === 0) {
    const insertFT = database.prepare(`INSERT OR IGNORE INTO financial_targets (category, target_percent, updated_at) VALUES (?, ?, datetime('now','localtime'))`);
    for (const [cat, pct] of [
      ['food_cost', 30], ['labor', 25], ['rent', 8], ['utilities', 4],
      ['stripe_fees', 3], ['delivery_commissions', 5], ['marketing', 2],
      ['insurance', 2], ['supplies', 3],
    ]) {
      insertFT.run(cat, pct);
    }
  }
}
