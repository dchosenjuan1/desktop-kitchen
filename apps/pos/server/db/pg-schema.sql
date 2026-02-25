-- =============================================================
-- Desktop Kitchen POS — Postgres Schema (Neon)
-- Converted from SQLite (better-sqlite3) to Postgres (postgres.js)
-- Multi-tenant via tenant_id column + Row-Level Security
-- =============================================================

-- ==================== Master / Platform Tables ====================
-- These tables are NOT tenant-scoped (no RLS)

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
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Tenant-Scoped Tables ====================
-- All include tenant_id with RLS policies

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT DEFAULT 'cashier',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  sort_order INTEGER,
  active BOOLEAN DEFAULT true,
  printer_target TEXT DEFAULT 'kitchen'
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  category_id INTEGER NOT NULL REFERENCES menu_categories(id),
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  order_number BIGINT NOT NULL,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  status TEXT DEFAULT 'pending',
  subtotal NUMERIC(10,2),
  tax NUMERIC(10,2),
  tip NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2),
  payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  offline_temp_id TEXT,
  payment_method TEXT DEFAULT NULL,
  source TEXT DEFAULT 'pos',
  delivery_order_id INTEGER DEFAULT NULL,
  refund_total NUMERIC(10,2) DEFAULT 0,
  crypto_payment_id INTEGER DEFAULT NULL,
  loyalty_customer_id INTEGER DEFAULT NULL
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  menu_item_id INTEGER REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  was_ai_suggested BOOLEAN DEFAULT false,
  combo_instance_id TEXT DEFAULT NULL,
  virtual_brand_id INTEGER DEFAULT NULL
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT,
  low_stock_threshold REAL,
  category TEXT,
  cost_price NUMERIC(10,2) DEFAULT 0,
  last_counted_at TIMESTAMPTZ
);

-- Menu Item Ingredients (junction table)
CREATE TABLE IF NOT EXISTS menu_item_ingredients (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity_used REAL NOT NULL,
  PRIMARY KEY(menu_item_id, inventory_item_id)
);

-- AI Suggestion Cache
CREATE TABLE IF NOT EXISTS ai_suggestion_cache (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  suggestion_type TEXT NOT NULL,
  trigger_context TEXT,
  suggestion_data TEXT NOT NULL,
  priority INTEGER DEFAULT 50,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Category Roles
CREATE TABLE IF NOT EXISTS ai_category_roles (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  category_id INTEGER NOT NULL REFERENCES menu_categories(id),
  role TEXT NOT NULL,
  UNIQUE(tenant_id, category_id)
);

-- AI Config
CREATE TABLE IF NOT EXISTS ai_config (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(tenant_id, key)
);

-- AI Suggestion Events
CREATE TABLE IF NOT EXISTS ai_suggestion_events (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  suggestion_type TEXT NOT NULL,
  suggestion_data TEXT,
  action TEXT NOT NULL,
  employee_id INTEGER REFERENCES employees(id),
  order_id INTEGER REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Hourly Snapshots
CREATE TABLE IF NOT EXISTS ai_hourly_snapshots (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  snapshot_hour TEXT NOT NULL,
  order_count INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  avg_ticket REAL DEFAULT 0,
  day_of_week INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Item Pairs
CREATE TABLE IF NOT EXISTS ai_item_pairs (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  item_a_id INTEGER NOT NULL REFERENCES menu_items(id),
  item_b_id INTEGER NOT NULL REFERENCES menu_items(id),
  pair_count INTEGER DEFAULT 1,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, item_a_id, item_b_id)
);

-- AI Inventory Velocity
CREATE TABLE IF NOT EXISTS ai_inventory_velocity (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  date DATE NOT NULL,
  quantity_used REAL DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  UNIQUE(tenant_id, inventory_item_id, date)
);

-- AI Restock Log
CREATE TABLE IF NOT EXISTS ai_restock_log (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity_before REAL,
  quantity_added REAL,
  quantity_after REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modifier Groups
CREATE TABLE IF NOT EXISTS modifier_groups (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  selection_type TEXT DEFAULT 'single',
  required BOOLEAN DEFAULT false,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

-- Modifiers
CREATE TABLE IF NOT EXISTS modifiers (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  group_id INTEGER NOT NULL REFERENCES modifier_groups(id),
  name TEXT NOT NULL,
  price_adjustment NUMERIC(10,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

-- Menu Item Modifier Groups (junction table)
CREATE TABLE IF NOT EXISTS menu_item_modifier_groups (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  modifier_group_id INTEGER NOT NULL REFERENCES modifier_groups(id),
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY(menu_item_id, modifier_group_id)
);

-- Order Item Modifiers
CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  order_item_id INTEGER NOT NULL REFERENCES order_items(id),
  modifier_id INTEGER,
  modifier_name TEXT NOT NULL,
  price_adjustment NUMERIC(10,2) DEFAULT 0
);

-- Combo Definitions
CREATE TABLE IF NOT EXISTS combo_definitions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  description TEXT,
  combo_price NUMERIC(10,2) NOT NULL,
  active BOOLEAN DEFAULT true
);

-- Combo Slots
CREATE TABLE IF NOT EXISTS combo_slots (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  combo_id INTEGER NOT NULL REFERENCES combo_definitions(id),
  slot_label TEXT NOT NULL,
  category_id INTEGER REFERENCES menu_categories(id),
  specific_item_id INTEGER REFERENCES menu_items(id),
  sort_order INTEGER DEFAULT 0
);

-- Order Payments
CREATE TABLE IF NOT EXISTS order_payments (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  payment_method TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  tip NUMERIC(10,2) DEFAULT 0,
  payment_intent_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Payment Items (junction table)
CREATE TABLE IF NOT EXISTS order_payment_items (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  payment_id INTEGER NOT NULL REFERENCES order_payments(id),
  order_item_id INTEGER NOT NULL REFERENCES order_items(id),
  amount NUMERIC(10,2) NOT NULL,
  PRIMARY KEY(payment_id, order_item_id)
);

-- Printers
CREATE TABLE IF NOT EXISTS printers (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  printer_type TEXT DEFAULT 'kitchen',
  address TEXT,
  active BOOLEAN DEFAULT true
);

-- Category Printer Routes (junction table)
CREATE TABLE IF NOT EXISTS category_printer_routes (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  category_id INTEGER NOT NULL REFERENCES menu_categories(id),
  printer_id INTEGER NOT NULL REFERENCES printers(id),
  PRIMARY KEY(category_id, printer_id)
);

-- Delivery Platforms
CREATE TABLE IF NOT EXISTS delivery_platforms (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  webhook_secret TEXT,
  commission_percent REAL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  default_markup_percent REAL DEFAULT 0,
  avg_delivery_time_min INTEGER DEFAULT 30,
  notes TEXT DEFAULT '',
  UNIQUE(tenant_id, name)
);

-- Delivery Orders
CREATE TABLE IF NOT EXISTS delivery_orders (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  platform_id INTEGER NOT NULL REFERENCES delivery_platforms(id),
  external_order_id TEXT,
  platform_status TEXT DEFAULT 'received',
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  platform_commission NUMERIC(10,2) DEFAULT 0,
  customer_name TEXT,
  delivery_address TEXT,
  raw_webhook_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Markup Rules
CREATE TABLE IF NOT EXISTS delivery_markup_rules (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  platform_id INTEGER NOT NULL REFERENCES delivery_platforms(id),
  menu_item_id INTEGER REFERENCES menu_items(id),
  category_id INTEGER REFERENCES menu_categories(id),
  markup_type TEXT NOT NULL DEFAULT 'percent',
  markup_value REAL NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, platform_id, menu_item_id),
  UNIQUE(tenant_id, platform_id, category_id)
);

-- Virtual Brands
CREATE TABLE IF NOT EXISTS virtual_brands (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  platform_id INTEGER REFERENCES delivery_platforms(id),
  description TEXT,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  display_type TEXT DEFAULT 'delivery',
  primary_color TEXT,
  secondary_color TEXT,
  font_family TEXT,
  dark_bg TEXT,
  slug TEXT,
  show_in_pos BOOLEAN DEFAULT true,
  template_slug TEXT DEFAULT NULL
);

-- Virtual Brand Items
CREATE TABLE IF NOT EXISTS virtual_brand_items (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  virtual_brand_id INTEGER NOT NULL REFERENCES virtual_brands(id),
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  custom_name TEXT,
  custom_price NUMERIC(10,2),
  active BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, virtual_brand_id, menu_item_id)
);

-- Delivery Recapture
CREATE TABLE IF NOT EXISTS delivery_recapture (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  platform TEXT NOT NULL,
  last_delivery_order_id INTEGER REFERENCES delivery_orders(id),
  sms_sent_at TIMESTAMPTZ,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted BOOLEAN DEFAULT true,
  UNIQUE(tenant_id, role, permission)
);

-- Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  stripe_refund_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  refund_type TEXT DEFAULT 'full',
  refunded_by INTEGER REFERENCES employees(id),
  items_json TEXT,
  inventory_restored BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crypto Payments
CREATE TABLE IF NOT EXISTS crypto_payments (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  order_id INTEGER NOT NULL REFERENCES orders(id),
  nowpayments_payment_id TEXT,
  pay_address TEXT,
  pay_amount REAL,
  pay_currency TEXT,
  price_amount NUMERIC(10,2),
  price_currency TEXT DEFAULT 'mxn',
  status TEXT DEFAULT 'waiting',
  actually_paid REAL DEFAULT 0,
  outcome_amount REAL,
  outcome_currency TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Counts
CREATE TABLE IF NOT EXISTS inventory_counts (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  counted_quantity REAL NOT NULL,
  system_quantity REAL NOT NULL,
  variance REAL NOT NULL,
  variance_percent REAL,
  counted_by INTEGER REFERENCES employees(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shrinkage Alerts
CREATE TABLE IF NOT EXISTS shrinkage_alerts (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  message TEXT,
  variance_amount REAL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Items (junction table)
CREATE TABLE IF NOT EXISTS vendor_items (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  vendor_sku TEXT,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  lead_time_days INTEGER DEFAULT 0,
  min_order_qty REAL DEFAULT 1,
  PRIMARY KEY(vendor_id, inventory_item_id)
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  po_number TEXT NOT NULL,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES employees(id),
  submitted_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, po_number)
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
  inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
  quantity_ordered REAL NOT NULL,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  quantity_received REAL DEFAULT 0,
  line_total NUMERIC(10,2) DEFAULT 0
);

-- Financial Targets
CREATE TABLE IF NOT EXISTS financial_targets (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  category TEXT NOT NULL,
  target_percent REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY(tenant_id, category)
);

-- Financial Actuals
CREATE TABLE IF NOT EXISTS financial_actuals (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  category TEXT NOT NULL,
  period TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  auto_calculated BOOLEAN DEFAULT false,
  UNIQUE(tenant_id, category, period)
);

-- Loyalty Customers
CREATE TABLE IF NOT EXISTS loyalty_customers (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  referral_code TEXT,
  referred_by INTEGER REFERENCES loyalty_customers(id),
  store_id INTEGER DEFAULT 1,
  stamps_earned INTEGER DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0,
  last_visit TIMESTAMPTZ,
  sms_opt_in BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, phone),
  UNIQUE(tenant_id, referral_code)
);

-- Stamp Cards
CREATE TABLE IF NOT EXISTS stamp_cards (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  customer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
  stamps_earned INTEGER DEFAULT 0,
  stamps_required INTEGER DEFAULT 10,
  reward_description TEXT DEFAULT 'Free item of your choice',
  completed BOOLEAN DEFAULT false,
  redeemed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stamp Events
CREATE TABLE IF NOT EXISTS stamp_events (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  stamp_card_id INTEGER NOT NULL REFERENCES stamp_cards(id),
  order_id INTEGER REFERENCES orders(id),
  stamps_added INTEGER NOT NULL,
  event_type TEXT DEFAULT 'purchase',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Events
CREATE TABLE IF NOT EXISTS referral_events (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  referrer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
  referee_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
  referrer_stamps_added INTEGER DEFAULT 0,
  referee_stamps_added INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Messages
CREATE TABLE IF NOT EXISTS loyalty_messages (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  customer_id INTEGER NOT NULL REFERENCES loyalty_customers(id),
  message_type TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loyalty Config
CREATE TABLE IF NOT EXISTS loyalty_config (
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(tenant_id, key)
);

-- Order Templates
CREATE TABLE IF NOT EXISTS order_templates (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT current_setting('app.tenant_id', true),
  name TEXT NOT NULL,
  description TEXT,
  items_json TEXT NOT NULL,
  created_by INTEGER,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== Indexes ====================
-- tenant_id is the first column in every composite index for RLS filter efficiency

CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_tenant ON menu_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant ON menu_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_employee ON orders(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant ON order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_cache_tenant ON ai_suggestion_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestion_cache_expires ON ai_suggestion_cache(tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_hourly_snapshots_tenant ON ai_hourly_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_item_pairs_tenant ON ai_item_pairs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_inventory_velocity_tenant ON ai_inventory_velocity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_modifier_groups_tenant ON modifier_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_tenant ON modifiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_group ON modifiers(tenant_id, group_id);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_tenant ON order_item_modifiers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_combo_definitions_tenant ON combo_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_combo_slots_tenant ON combo_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_tenant ON order_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_printers_tenant ON printers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_platforms_tenant ON delivery_platforms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_tenant ON delivery_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_markup_rules_tenant ON delivery_markup_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_virtual_brands_tenant ON virtual_brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_virtual_brand_items_tenant ON virtual_brand_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_recapture_tenant ON delivery_recapture(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_refunds_tenant ON refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON refunds(tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_crypto_payments_tenant ON crypto_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_tenant ON inventory_counts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shrinkage_alerts_tenant ON shrinkage_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_tenant ON purchase_order_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_customers_tenant ON loyalty_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_tenant ON stamp_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stamp_cards_customer ON stamp_cards(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_stamp_events_tenant ON stamp_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_messages_tenant ON loyalty_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_templates_tenant ON order_templates(tenant_id);

-- ==================== Row-Level Security ====================
-- Enable RLS on every tenant-scoped table.
-- Policy: app_user can only see/modify rows matching current_setting('app.tenant_id').
-- neondb_owner (adminSql) bypasses RLS automatically as table owner.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'employees', 'menu_categories', 'menu_items', 'orders', 'order_items',
      'inventory_items', 'menu_item_ingredients', 'ai_suggestion_cache',
      'ai_category_roles', 'ai_config', 'ai_suggestion_events',
      'ai_hourly_snapshots', 'ai_item_pairs', 'ai_inventory_velocity',
      'ai_restock_log', 'modifier_groups', 'modifiers',
      'menu_item_modifier_groups', 'order_item_modifiers',
      'combo_definitions', 'combo_slots', 'order_payments',
      'order_payment_items', 'printers', 'category_printer_routes',
      'delivery_platforms', 'delivery_orders', 'delivery_markup_rules',
      'virtual_brands', 'virtual_brand_items', 'delivery_recapture',
      'role_permissions', 'refunds', 'crypto_payments',
      'inventory_counts', 'shrinkage_alerts', 'vendors', 'vendor_items',
      'purchase_orders', 'purchase_order_items', 'financial_targets',
      'financial_actuals', 'loyalty_customers', 'stamp_cards',
      'stamp_events', 'referral_events', 'loyalty_messages',
      'loyalty_config', 'order_templates'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);

    -- Drop existing policy if present (idempotent)
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I', tbl
    );

    -- Create the isolation policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (tenant_id = current_setting(''app.tenant_id'', true))
         WITH CHECK (tenant_id = current_setting(''app.tenant_id'', true))',
      tbl
    );
  END LOOP;
END;
$$;

-- Grant permissions to app_user on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
