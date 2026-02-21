/**
 * Seed script for the Juanberto's tenant.
 *
 * Creates (or re-seeds) the "juanbertos" tenant in the master registry
 * and populates its database with employees, a Mexican menu, inventory,
 * modifiers, combos, delivery platforms, and loyalty test data.
 *
 * Usage:
 *   node apps/pos/server/seed-tenant-juanbertos.js
 *
 * Run from the repo root (or apps/pos/).
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applySchema } from './db/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');
const tenantsDir = path.join(dataDir, 'tenants');
const masterDbPath = path.join(dataDir, 'master.db');

// Ensure directories exist
for (const dir of [dataDir, tenantsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ==================== Constants ====================

const TENANT_ID = 'juanbertos';
const TENANT_NAME = "Juanberto's";
const TENANT_SUBDOMAIN = 'juanbertos';
const OWNER_EMAIL = 'admin@juanbertos.com';
const OWNER_PASSWORD = 'juanbertos2024'; // change after first login
const PLAN = 'pro';

const BRANDING = {
  primaryColor: '#dc2626',  // Red
  restaurantName: "Juanberto's",
  logoUrl: null,
};

// ==================== Master DB ====================

const masterDb = new Database(masterDbPath);
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

(async () => {
  try {
    const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 10);

    // Upsert the tenant in master DB
    const existing = masterDb.prepare('SELECT id FROM tenants WHERE id = ?').get(TENANT_ID);
    if (existing) {
      masterDb.prepare(`
        UPDATE tenants SET name = ?, subdomain = ?, plan = ?, owner_email = ?,
          owner_password_hash = ?, branding_json = ?, active = 1
        WHERE id = ?
      `).run(TENANT_NAME, TENANT_SUBDOMAIN, PLAN, OWNER_EMAIL, passwordHash,
        JSON.stringify(BRANDING), TENANT_ID);
      console.log(`Updated existing tenant "${TENANT_ID}" in master DB`);
    } else {
      masterDb.prepare(`
        INSERT INTO tenants (id, name, subdomain, plan, owner_email, owner_password_hash, branding_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(TENANT_ID, TENANT_NAME, TENANT_SUBDOMAIN, PLAN, OWNER_EMAIL, passwordHash,
        JSON.stringify(BRANDING));
      console.log(`Created tenant "${TENANT_ID}" in master DB`);
    }

    // ==================== Tenant DB ====================

    const tenantDbPath = path.join(tenantsDir, `${TENANT_ID}.db`);
    const tenantDb = new Database(tenantDbPath);
    tenantDb.pragma('journal_mode = WAL');
    tenantDb.pragma('foreign_keys = ON');

    // Apply the full POS schema
    applySchema(tenantDb);
    console.log('Applied POS schema to tenant DB');

    // Helper
    const run = (sql, params = []) => tenantDb.prepare(sql).run(...params);
    const exec = (sql) => tenantDb.exec(sql);

    // Clear existing data
    exec('PRAGMA foreign_keys = OFF');
    try {
      exec(`
        DELETE FROM menu_item_ingredients;
        DELETE FROM order_item_modifiers;
        DELETE FROM order_items;
        DELETE FROM orders;
        DELETE FROM menu_item_modifier_groups;
        DELETE FROM modifiers;
        DELETE FROM modifier_groups;
        DELETE FROM combo_slots;
        DELETE FROM combo_definitions;
        DELETE FROM virtual_brand_items;
        DELETE FROM virtual_brands;
        DELETE FROM delivery_orders;
        DELETE FROM delivery_platforms;
        DELETE FROM menu_items;
        DELETE FROM menu_categories;
        DELETE FROM inventory_items;
        DELETE FROM employees;
      `);
    } catch (e) { /* tables may not exist */ }

    try { exec('DELETE FROM sqlite_sequence;'); } catch {}
    exec('PRAGMA foreign_keys = ON');

    // ==================== Employees ====================

    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Manager', '1234', 'admin']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Maria', '5678', 'cashier']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Carlos', '9012', 'cashier']);
    console.log('✓ Seeded 3 employees');

    // ==================== Menu Categories ====================

    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Tacos', 1, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Burritos', 2, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Quesadillas', 3, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Tortas', 4, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Platos Fuertes', 5, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Sides', 6, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Bebidas', 7, 'bar']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Postres', 8, 'kitchen']);
    console.log('✓ Seeded 8 menu categories');

    // ==================== Menu Items (MXN) ====================

    const ins = 'INSERT INTO menu_items (category_id, name, price, description, image_url, active) VALUES (?, ?, ?, ?, ?, 1)';

    // Tacos (category_id = 1)
    run(ins, [1, 'Taco al Pastor', 35, 'Marinated pork with pineapple, cilantro, and onion', null]);
    run(ins, [1, 'Taco de Carne Asada', 40, 'Grilled steak with cilantro and onion', null]);
    run(ins, [1, 'Taco de Pollo', 35, 'Seasoned chicken with guacamole', null]);
    run(ins, [1, 'Taco de Carnitas', 38, 'Slow-cooked pulled pork', null]);
    run(ins, [1, 'Taco de Birria', 45, 'Braised beef birria with consommé', null]);
    run(ins, [1, 'Taco de Chorizo', 35, 'Mexican chorizo with onion and cilantro', null]);

    // Burritos (category_id = 2)
    run(ins, [2, 'Burrito de Carne Asada', 120, 'Grilled steak, rice, beans, cheese, and salsa', null]);
    run(ins, [2, 'Burrito al Pastor', 110, 'Pastor pork, rice, beans, pineapple, and salsa', null]);
    run(ins, [2, 'Burrito de Pollo', 105, 'Chicken, rice, beans, cheese, and crema', null]);
    run(ins, [2, 'Burrito Vegetariano', 95, 'Beans, rice, cheese, guacamole, and veggies', null]);

    // Quesadillas (category_id = 3)
    run(ins, [3, 'Quesadilla de Queso', 55, 'Melted Oaxaca cheese in a flour tortilla', null]);
    run(ins, [3, 'Quesadilla de Pollo', 75, 'Chicken and cheese with salsa verde', null]);
    run(ins, [3, 'Quesadilla de Carne Asada', 85, 'Steak and cheese with guacamole', null]);
    run(ins, [3, 'Quesadilla de Chorizo', 70, 'Chorizo and melted cheese', null]);

    // Tortas (category_id = 4)
    run(ins, [4, 'Torta de Milanesa', 85, 'Breaded beef, beans, avocado, lettuce, tomato', null]);
    run(ins, [4, 'Torta de Jamón', 70, 'Ham, cheese, beans, lettuce, tomato', null]);
    run(ins, [4, 'Torta Cubana', 95, 'Ham, pork leg, chorizo, cheese, beans, avocado', null]);
    run(ins, [4, 'Torta Ahogada', 90, 'Carnitas in a spicy tomato broth', null]);

    // Platos Fuertes (category_id = 5)
    run(ins, [5, 'Enchiladas Rojas', 130, 'Three chicken enchiladas with red sauce, crema, and cheese', null]);
    run(ins, [5, 'Enchiladas Verdes', 130, 'Three chicken enchiladas with green tomatillo sauce', null]);
    run(ins, [5, 'Chilaquiles', 95, 'Fried tortilla chips in salsa with crema, cheese, and egg', null]);
    run(ins, [5, 'Carne Asada Plate', 180, 'Grilled steak with rice, beans, guacamole, and tortillas', null]);

    // Sides (category_id = 6)
    run(ins, [6, 'Arroz Rojo', 35, 'Mexican red rice', null]);
    run(ins, [6, 'Frijoles Refritos', 30, 'Refried pinto beans with cheese', null]);
    run(ins, [6, 'Chips y Guacamole', 65, 'Warm tortilla chips with fresh guacamole', null]);
    run(ins, [6, 'Chips y Salsa', 40, 'Warm tortilla chips with house salsa', null]);
    run(ins, [6, 'Elote en Vaso', 45, 'Corn in a cup with mayo, chili, lime, and cheese', null]);

    // Bebidas (category_id = 7)
    run(ins, [7, 'Agua de Horchata', 40, 'Classic rice and cinnamon drink', null]);
    run(ins, [7, 'Agua de Jamaica', 40, 'Hibiscus flower water', null]);
    run(ins, [7, 'Limonada', 35, 'Fresh-squeezed lemonade', null]);
    run(ins, [7, 'Coca-Cola', 30, 'Coca-Cola Mexicana (glass bottle)', null]);
    run(ins, [7, 'Agua Natural', 20, 'Bottled water', null]);
    run(ins, [7, 'Café de Olla', 35, 'Traditional Mexican cinnamon coffee', null]);

    // Postres (category_id = 8)
    run(ins, [8, 'Churros (3 pcs)', 50, 'Cinnamon sugar churros with chocolate sauce', null]);
    run(ins, [8, 'Flan Napolitano', 55, 'Creamy custard with caramel', null]);
    run(ins, [8, 'Tres Leches', 65, 'Three-milk soaked cake with whipped cream', null]);

    console.log('✓ Seeded 38 menu items');

    // ==================== Inventory ====================

    const invIns = 'INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)';
    run(invIns, ['carne asada (steak)', 40, 'lbs', 8, 'Meats', 200]);
    run(invIns, ['pork (pastor)', 50, 'lbs', 10, 'Meats', 120]);
    run(invIns, ['chicken breast', 40, 'lbs', 10, 'Meats', 90]);
    run(invIns, ['carnitas', 30, 'lbs', 8, 'Meats', 140]);
    run(invIns, ['birria beef', 25, 'lbs', 5, 'Meats', 180]);
    run(invIns, ['chorizo', 20, 'lbs', 5, 'Meats', 100]);
    run(invIns, ['ham', 15, 'lbs', 5, 'Meats', 80]);
    run(invIns, ['milanesa (breaded beef)', 20, 'lbs', 5, 'Meats', 160]);
    run(invIns, ['tortillas (corn)', 500, 'count', 100, 'Dry Goods', 2]);
    run(invIns, ['tortillas (flour)', 300, 'count', 50, 'Dry Goods', 3]);
    run(invIns, ['bolillo rolls', 100, 'count', 20, 'Dry Goods', 5]);
    run(invIns, ['rice', 100, 'lbs', 20, 'Dry Goods', 20]);
    run(invIns, ['beans (pinto)', 80, 'lbs', 15, 'Dry Goods', 25]);
    run(invIns, ['oaxaca cheese', 30, 'lbs', 8, 'Dairy', 120]);
    run(invIns, ['crema', 20, 'liters', 5, 'Dairy', 50]);
    run(invIns, ['avocado', 100, 'count', 20, 'Produce', 25]);
    run(invIns, ['limes', 200, 'count', 50, 'Produce', 3]);
    run(invIns, ['cilantro', 40, 'bunches', 10, 'Produce', 8]);
    run(invIns, ['onions', 80, 'lbs', 15, 'Produce', 15]);
    run(invIns, ['tomatoes', 50, 'lbs', 10, 'Produce', 30]);
    run(invIns, ['chiles (various)', 30, 'lbs', 5, 'Produce', 40]);
    run(invIns, ['cooking oil', 40, 'liters', 10, 'Supplies', 30]);
    run(invIns, ['pineapple', 20, 'count', 5, 'Produce', 35]);

    console.log('✓ Seeded 23 inventory items');

    // ==================== Modifier Groups ====================

    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      ['Salsa', 'multi', 0, 0, 3, 1]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      ['Extras', 'multi', 0, 0, 5, 2]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      ['Tortilla', 'single', 0, 0, 1, 3]);

    // Salsa modifiers (group_id=1)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Salsa Verde', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Salsa Roja', 0, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Habanero', 0, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Pico de Gallo', 0, 4]);

    // Extras (group_id=2)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Extra Queso', 15, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Guacamole', 20, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Crema', 10, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Jalapeños', 0, 4]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Extra Carne', 25, 5]);

    // Tortilla (group_id=3)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Maíz (Corn)', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Harina (Flour)', 0, 2]);

    // Assign modifiers: Tacos get Salsa, Extras, Tortilla
    for (let itemId = 1; itemId <= 6; itemId++) {
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 1, 1]);
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 2, 2]);
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 3, 3]);
    }
    // Burritos get Salsa, Extras
    for (let itemId = 7; itemId <= 10; itemId++) {
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 1, 1]);
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 2, 2]);
    }
    // Quesadillas get Salsa, Extras
    for (let itemId = 11; itemId <= 14; itemId++) {
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 1, 1]);
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 2, 2]);
    }

    console.log('✓ Seeded modifier groups and modifiers');

    // ==================== Combo Definitions ====================

    run('INSERT INTO combo_definitions (name, description, combo_price, active) VALUES (?, ?, ?, 1)',
      ['Combo Tacos (3)', '3 tacos of your choice with a drink — save $15!', 130]);
    run('INSERT INTO combo_definitions (name, description, combo_price, active) VALUES (?, ?, ?, 1)',
      ['Combo Burrito', 'Any burrito with a side and a drink — save $20!', 170]);

    // Combo slots
    // Combo Tacos (combo_id=1): 3x taco (category 1) + drink (category 7)
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Taco 1', 1, 1]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Taco 2', 1, 2]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Taco 3', 1, 3]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Bebida', 7, 4]);

    // Combo Burrito (combo_id=2): burrito (category 2) + side (category 6) + drink (category 7)
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [2, 'Burrito', 2, 1]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [2, 'Side', 6, 2]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [2, 'Bebida', 7, 3]);

    console.log('✓ Seeded combo definitions');

    // ==================== Delivery Platforms ====================

    run('INSERT INTO delivery_platforms (name, display_name, commission_percent, active) VALUES (?, ?, ?, 1)', ['uber_eats', 'Uber Eats', 30]);
    run('INSERT INTO delivery_platforms (name, display_name, commission_percent, active) VALUES (?, ?, ?, 1)', ['rappi', 'Rappi', 25]);
    run('INSERT INTO delivery_platforms (name, display_name, commission_percent, active) VALUES (?, ?, ?, 1)', ['didi_food', 'DiDi Food', 22]);
    console.log('✓ Seeded 3 delivery platforms');

    // ==================== AI Config ====================

    try { exec('DELETE FROM ai_config'); } catch {}
    const configEntries = [
      ['restaurant_name', "Juanberto's", 'Restaurant display name'],
      ['currency', 'MXN', 'Currency code'],
      ['tax_rate', '0.16', 'Tax rate (16% IVA)'],
      ['rush_hours', '11-14,18-21', 'Rush hour ranges (24h format)'],
      ['slow_hours', '15-17', 'Slow period ranges (24h format)'],
      ['max_suggestions_per_order', '2', 'Max AI suggestions shown per order'],
      ['suggestion_display_timeout', '15', 'Seconds before suggestion auto-hides'],
      ['upsell_enabled', '1', 'Enable upsell suggestions'],
      ['inventory_push_enabled', '1', 'Enable inventory-aware item pushing'],
      ['combo_upgrade_enabled', '1', 'Enable combo upgrade suggestions'],
      ['dynamic_pricing_enabled', '0', 'Enable dynamic pricing (requires manager approval)'],
      ['grok_api_enabled', '0', 'Enable Grok API for enhanced analysis'],
    ];
    for (const [key, value, description] of configEntries) {
      run('INSERT INTO ai_config (key, value, description) VALUES (?, ?, ?)', [key, value, description]);
    }
    console.log('✓ Seeded AI config');

    // ==================== AI Category Roles ====================

    try { exec('DELETE FROM ai_category_roles'); } catch {}
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [1, 'main']);    // Tacos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [2, 'main']);    // Burritos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [3, 'main']);    // Quesadillas
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [4, 'main']);    // Tortas
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [5, 'main']);    // Platos Fuertes
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [6, 'side']);    // Sides
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [7, 'drink']);   // Bebidas
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [8, 'side']);    // Postres
    console.log('✓ Seeded AI category roles');

    // ==================== Loyalty Config ====================

    try { exec('DELETE FROM loyalty_config'); } catch {}
    const loyaltyEntries = [
      ['stamps_required', '10'],
      ['reward_description', 'Free taco or drink of your choice'],
      ['sms_enabled', '1'],
      ['referral_bonus_stamps', '2'],
    ];
    for (const [key, value] of loyaltyEntries) {
      run('INSERT OR REPLACE INTO loyalty_config (key, value) VALUES (?, ?)', [key, value]);
    }
    console.log('✓ Seeded loyalty config');

    // ==================== Done ====================

    tenantDb.close();
    masterDb.close();

    console.log(`\n✅ Juanberto's tenant seeded successfully!`);
    console.log(`   Tenant ID:  ${TENANT_ID}`);
    console.log(`   Subdomain:  ${TENANT_SUBDOMAIN}.desktop.kitchen`);
    console.log(`   Owner:      ${OWNER_EMAIL}`);
    console.log(`   Plan:       ${PLAN}`);
    console.log(`   Branding:   Red (#dc2626)`);
    console.log(`   DB file:    data/tenants/${TENANT_ID}.db`);
  } catch (error) {
    console.error('Error seeding Juanberto\'s tenant:', error);
    process.exit(1);
  }
})();
