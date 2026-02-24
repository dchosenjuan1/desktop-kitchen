/**
 * Seed script for the demo tenant.
 *
 * Creates (or re-seeds) the "demo" tenant in the tenants table
 * and populates its data with employees, a sample menu, inventory,
 * modifiers, combos, delivery platforms, and loyalty test data.
 *
 * Usage:
 *   node apps/pos/server/seed-tenant-demo.js
 *
 * Run from the repo root (or apps/pos/).
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { adminSql, initDb } from './db/index.js';

// ==================== Constants ====================

const TENANT_ID = 'demo';
const TENANT_NAME = 'Desktop Kitchen Demo';
const TENANT_SUBDOMAIN = 'demo';
const OWNER_EMAIL = 'admin@desktop.kitchen';
const OWNER_PASSWORD = 'desktopkitchen2024'; // change after first login
const PLAN = 'pro';

const BRANDING = {
  primaryColor: '#0d9488',  // Teal (brand default)
  restaurantName: 'Desktop Kitchen Demo',
  logoUrl: null,
};

(async () => {
  try {
    await initDb();
    const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 10);

    // ==================== Upsert Tenant ====================

    const existing = await adminSql`SELECT id FROM tenants WHERE id = ${TENANT_ID}`;
    if (existing.length > 0) {
      await adminSql`
        UPDATE tenants SET
          name = ${TENANT_NAME},
          subdomain = ${TENANT_SUBDOMAIN},
          plan = ${PLAN},
          owner_email = ${OWNER_EMAIL},
          owner_password_hash = ${passwordHash},
          branding_json = ${JSON.stringify(BRANDING)},
          active = true
        WHERE id = ${TENANT_ID}
      `;
      console.log(`Updated existing tenant "${TENANT_ID}"`);
    } else {
      await adminSql`
        INSERT INTO tenants (id, name, subdomain, plan, owner_email, owner_password_hash, branding_json)
        VALUES (${TENANT_ID}, ${TENANT_NAME}, ${TENANT_SUBDOMAIN}, ${PLAN}, ${OWNER_EMAIL}, ${passwordHash}, ${JSON.stringify(BRANDING)})
      `;
      console.log(`Created tenant "${TENANT_ID}"`);
    }

    // ==================== Set tenant context for RLS ====================

    await adminSql`SELECT set_config('app.tenant_id', ${TENANT_ID}, false)`;

    // Clear existing data for this tenant (FK-safe order: children before parents)
    const tenantTables = [
      // Deepest children first
      'stamp_events', 'referral_events', 'loyalty_messages', 'stamp_cards', 'loyalty_customers',
      'ai_suggestion_events', 'ai_suggestion_cache', 'ai_hourly_snapshots',
      'ai_item_pairs', 'ai_inventory_velocity', 'ai_category_roles', 'ai_config',
      'virtual_brand_items', 'virtual_brands',
      'delivery_orders', 'delivery_markup_rules', 'delivery_recapture', 'delivery_platforms',
      'order_item_modifiers', 'order_items',
      'order_payment_items', 'order_payments', 'orders',
      'menu_item_modifier_groups', 'menu_item_ingredients',
      'combo_slots', 'combo_definitions',
      'modifiers', 'modifier_groups',
      'category_printer_routes', 'printers',
      'menu_items', 'menu_categories',
      'inventory_items',
      'loyalty_config', 'role_permissions', 'employees',
    ];
    for (const table of tenantTables) {
      try {
        await adminSql.unsafe(`DELETE FROM ${table} WHERE tenant_id = '${TENANT_ID}'`);
      } catch (e) { /* table may not exist */ }
    }

    // ==================== Employees (hash PINs with bcrypt) ====================

    const pin1234 = await bcrypt.hash('1234', 12);
    const pin5678 = await bcrypt.hash('5678', 12);
    const pin9012 = await bcrypt.hash('9012', 12);
    await adminSql`INSERT INTO employees (name, pin, role, active, tenant_id) VALUES ('Manager', ${pin1234}, 'admin', true, ${TENANT_ID})`;
    await adminSql`INSERT INTO employees (name, pin, role, active, tenant_id) VALUES ('Maria', ${pin5678}, 'cashier', true, ${TENANT_ID})`;
    await adminSql`INSERT INTO employees (name, pin, role, active, tenant_id) VALUES ('Carlos', ${pin9012}, 'cashier', true, ${TENANT_ID})`;
    console.log('Seeded 3 employees');

    // ==================== Menu Categories ====================

    const catRows = await adminSql`
      INSERT INTO menu_categories (name, sort_order, active, printer_target, tenant_id) VALUES
        ('Tacos', 1, true, 'kitchen', ${TENANT_ID}),
        ('Burritos', 2, true, 'kitchen', ${TENANT_ID}),
        ('Quesadillas', 3, true, 'kitchen', ${TENANT_ID}),
        ('Tortas', 4, true, 'kitchen', ${TENANT_ID}),
        ('Platos Fuertes', 5, true, 'kitchen', ${TENANT_ID}),
        ('Sides', 6, true, 'kitchen', ${TENANT_ID}),
        ('Bebidas', 7, true, 'bar', ${TENANT_ID}),
        ('Postres', 8, true, 'kitchen', ${TENANT_ID})
      RETURNING id, name
    `;
    const catId = {};
    for (const row of catRows) catId[row.name] = row.id;
    console.log('Seeded 8 menu categories');

    // ==================== Menu Items (MXN) ====================

    const items = [
      // Tacos
      [catId['Tacos'], 'Taco al Pastor', 35, 'Marinated pork with pineapple, cilantro, and onion'],
      [catId['Tacos'], 'Taco de Carne Asada', 40, 'Grilled steak with cilantro and onion'],
      [catId['Tacos'], 'Taco de Pollo', 35, 'Seasoned chicken with guacamole'],
      [catId['Tacos'], 'Taco de Carnitas', 38, 'Slow-cooked pulled pork'],
      [catId['Tacos'], 'Taco de Birria', 45, 'Braised beef birria with consomme'],
      [catId['Tacos'], 'Taco de Chorizo', 35, 'Mexican chorizo with onion and cilantro'],
      // Burritos
      [catId['Burritos'], 'Burrito de Carne Asada', 120, 'Grilled steak, rice, beans, cheese, and salsa'],
      [catId['Burritos'], 'Burrito al Pastor', 110, 'Pastor pork, rice, beans, pineapple, and salsa'],
      [catId['Burritos'], 'Burrito de Pollo', 105, 'Chicken, rice, beans, cheese, and crema'],
      [catId['Burritos'], 'Burrito Vegetariano', 95, 'Beans, rice, cheese, guacamole, and veggies'],
      // Quesadillas
      [catId['Quesadillas'], 'Quesadilla de Queso', 55, 'Melted Oaxaca cheese in a flour tortilla'],
      [catId['Quesadillas'], 'Quesadilla de Pollo', 75, 'Chicken and cheese with salsa verde'],
      [catId['Quesadillas'], 'Quesadilla de Carne Asada', 85, 'Steak and cheese with guacamole'],
      [catId['Quesadillas'], 'Quesadilla de Chorizo', 70, 'Chorizo and melted cheese'],
      // Tortas
      [catId['Tortas'], 'Torta de Milanesa', 85, 'Breaded beef, beans, avocado, lettuce, tomato'],
      [catId['Tortas'], 'Torta de Jamon', 70, 'Ham, cheese, beans, lettuce, tomato'],
      [catId['Tortas'], 'Torta Cubana', 95, 'Ham, pork leg, chorizo, cheese, beans, avocado'],
      [catId['Tortas'], 'Torta Ahogada', 90, 'Carnitas in a spicy tomato broth'],
      // Platos Fuertes
      [catId['Platos Fuertes'], 'Enchiladas Rojas', 130, 'Three chicken enchiladas with red sauce, crema, and cheese'],
      [catId['Platos Fuertes'], 'Enchiladas Verdes', 130, 'Three chicken enchiladas with green tomatillo sauce'],
      [catId['Platos Fuertes'], 'Chilaquiles', 95, 'Fried tortilla chips in salsa with crema, cheese, and egg'],
      [catId['Platos Fuertes'], 'Carne Asada Plate', 180, 'Grilled steak with rice, beans, guacamole, and tortillas'],
      // Sides
      [catId['Sides'], 'Arroz Rojo', 35, 'Mexican red rice'],
      [catId['Sides'], 'Frijoles Refritos', 30, 'Refried pinto beans with cheese'],
      [catId['Sides'], 'Chips y Guacamole', 65, 'Warm tortilla chips with fresh guacamole'],
      [catId['Sides'], 'Chips y Salsa', 40, 'Warm tortilla chips with house salsa'],
      [catId['Sides'], 'Elote en Vaso', 45, 'Corn in a cup with mayo, chili, lime, and cheese'],
      // Bebidas
      [catId['Bebidas'], 'Agua de Horchata', 40, 'Classic rice and cinnamon drink'],
      [catId['Bebidas'], 'Agua de Jamaica', 40, 'Hibiscus flower water'],
      [catId['Bebidas'], 'Limonada', 35, 'Fresh-squeezed lemonade'],
      [catId['Bebidas'], 'Coca-Cola', 30, 'Coca-Cola Mexicana (glass bottle)'],
      [catId['Bebidas'], 'Agua Natural', 20, 'Bottled water'],
      [catId['Bebidas'], 'Cafe de Olla', 35, 'Traditional Mexican cinnamon coffee'],
      // Postres
      [catId['Postres'], 'Churros (3 pcs)', 50, 'Cinnamon sugar churros with chocolate sauce'],
      [catId['Postres'], 'Flan Napolitano', 55, 'Creamy custard with caramel'],
      [catId['Postres'], 'Tres Leches', 65, 'Three-milk soaked cake with whipped cream'],
    ];

    const itemRows = [];
    for (const [categoryId, name, price, description] of items) {
      const rows = await adminSql`
        INSERT INTO menu_items (category_id, name, price, description, active, tenant_id)
        VALUES (${categoryId}, ${name}, ${price}, ${description}, true, ${TENANT_ID})
        RETURNING id, name
      `;
      itemRows.push(rows[0]);
    }
    const itemId = {};
    for (const row of itemRows) itemId[row.name] = row.id;
    console.log(`Seeded ${items.length} menu items`);

    // ==================== Inventory ====================

    const invItems = [
      ['carne asada (steak)', 40, 'lbs', 8, 'Meats', 200],
      ['pork (pastor)', 50, 'lbs', 10, 'Meats', 120],
      ['chicken breast', 40, 'lbs', 10, 'Meats', 90],
      ['carnitas', 30, 'lbs', 8, 'Meats', 140],
      ['birria beef', 25, 'lbs', 5, 'Meats', 180],
      ['chorizo', 20, 'lbs', 5, 'Meats', 100],
      ['ham', 15, 'lbs', 5, 'Meats', 80],
      ['milanesa (breaded beef)', 20, 'lbs', 5, 'Meats', 160],
      ['tortillas (corn)', 500, 'count', 100, 'Dry Goods', 2],
      ['tortillas (flour)', 300, 'count', 50, 'Dry Goods', 3],
      ['bolillo rolls', 100, 'count', 20, 'Dry Goods', 5],
      ['rice', 100, 'lbs', 20, 'Dry Goods', 20],
      ['beans (pinto)', 80, 'lbs', 15, 'Dry Goods', 25],
      ['oaxaca cheese', 30, 'lbs', 8, 'Dairy', 120],
      ['crema', 20, 'liters', 5, 'Dairy', 50],
      ['avocado', 100, 'count', 20, 'Produce', 25],
      ['limes', 200, 'count', 50, 'Produce', 3],
      ['cilantro', 40, 'bunches', 10, 'Produce', 8],
      ['onions', 80, 'lbs', 15, 'Produce', 15],
      ['tomatoes', 50, 'lbs', 10, 'Produce', 30],
      ['chiles (various)', 30, 'lbs', 5, 'Produce', 40],
      ['cooking oil', 40, 'liters', 10, 'Supplies', 30],
      ['pineapple', 20, 'count', 5, 'Produce', 35],
    ];
    for (const [name, qty, unit, threshold, category, cost] of invItems) {
      await adminSql`
        INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price, tenant_id)
        VALUES (${name}, ${qty}, ${unit}, ${threshold}, ${category}, ${cost}, ${TENANT_ID})
      `;
    }
    console.log(`Seeded ${invItems.length} inventory items`);

    // ==================== Modifier Groups ====================

    const mgRows = await adminSql`
      INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active, tenant_id) VALUES
        ('Salsa', 'multi', false, 0, 3, 1, true, ${TENANT_ID}),
        ('Extras', 'multi', false, 0, 5, 2, true, ${TENANT_ID}),
        ('Tortilla', 'single', false, 0, 1, 3, true, ${TENANT_ID})
      RETURNING id, name
    `;
    const mgId = {};
    for (const row of mgRows) mgId[row.name] = row.id;

    // Salsa modifiers
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Salsa']}, 'Salsa Verde', 0, 1, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Salsa']}, 'Salsa Roja', 0, 2, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Salsa']}, 'Habanero', 0, 3, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Salsa']}, 'Pico de Gallo', 0, 4, true, ${TENANT_ID})`;

    // Extras
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Extra Queso', 15, 1, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Guacamole', 20, 2, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Crema', 10, 3, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Jalapenos', 0, 4, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Extra Carne', 25, 5, true, ${TENANT_ID})`;

    // Tortilla
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Tortilla']}, 'Maiz (Corn)', 0, 1, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Tortilla']}, 'Harina (Flour)', 0, 2, true, ${TENANT_ID})`;

    // Assign modifiers to taco items (Salsa, Extras, Tortilla)
    const tacoNames = ['Taco al Pastor', 'Taco de Carne Asada', 'Taco de Pollo', 'Taco de Carnitas', 'Taco de Birria', 'Taco de Chorizo'];
    for (const name of tacoNames) {
      const mid = itemId[name];
      if (!mid) continue;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Salsa']}, 1, ${TENANT_ID})`;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Extras']}, 2, ${TENANT_ID})`;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Tortilla']}, 3, ${TENANT_ID})`;
    }
    // Burritos get Salsa, Extras
    const burritoNames = ['Burrito de Carne Asada', 'Burrito al Pastor', 'Burrito de Pollo', 'Burrito Vegetariano'];
    for (const name of burritoNames) {
      const mid = itemId[name];
      if (!mid) continue;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Salsa']}, 1, ${TENANT_ID})`;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Extras']}, 2, ${TENANT_ID})`;
    }
    // Quesadillas get Salsa, Extras
    const quesaNames = ['Quesadilla de Queso', 'Quesadilla de Pollo', 'Quesadilla de Carne Asada', 'Quesadilla de Chorizo'];
    for (const name of quesaNames) {
      const mid = itemId[name];
      if (!mid) continue;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Salsa']}, 1, ${TENANT_ID})`;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Extras']}, 2, ${TENANT_ID})`;
    }

    console.log('Seeded modifier groups and modifiers');

    // ==================== Combo Definitions ====================

    const comboRows = await adminSql`
      INSERT INTO combo_definitions (name, description, combo_price, active, tenant_id) VALUES
        ('Combo Tacos (3)', '3 tacos of your choice with a drink — save $15!', 130, true, ${TENANT_ID}),
        ('Combo Burrito', 'Any burrito with a side and a drink — save $20!', 170, true, ${TENANT_ID})
      RETURNING id, name
    `;
    const comboId = {};
    for (const row of comboRows) comboId[row.name] = row.id;

    // Combo Tacos: 3x taco (Tacos category) + drink (Bebidas category)
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Combo Tacos (3)']}, 'Taco 1', ${catId['Tacos']}, 1, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Combo Tacos (3)']}, 'Taco 2', ${catId['Tacos']}, 2, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Combo Tacos (3)']}, 'Taco 3', ${catId['Tacos']}, 3, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Combo Tacos (3)']}, 'Bebida', ${catId['Bebidas']}, 4, ${TENANT_ID})`;

    // Combo Burrito: burrito + side + drink
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Combo Burrito']}, 'Burrito', ${catId['Burritos']}, 1, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Combo Burrito']}, 'Side', ${catId['Sides']}, 2, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Combo Burrito']}, 'Bebida', ${catId['Bebidas']}, 3, ${TENANT_ID})`;

    console.log('Seeded combo definitions');

    // ==================== Delivery Platforms ====================

    await adminSql`INSERT INTO delivery_platforms (name, display_name, commission_percent, active, tenant_id) VALUES ('uber_eats', 'Uber Eats', 30, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO delivery_platforms (name, display_name, commission_percent, active, tenant_id) VALUES ('rappi', 'Rappi', 25, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO delivery_platforms (name, display_name, commission_percent, active, tenant_id) VALUES ('didi_food', 'DiDi Food', 22, true, ${TENANT_ID})`;
    console.log('Seeded 3 delivery platforms');

    // ==================== AI Config ====================

    const configEntries = [
      ['restaurant_name', 'Desktop Kitchen Demo', 'Restaurant display name'],
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
      await adminSql`
        INSERT INTO ai_config (key, value, description, tenant_id)
        VALUES (${key}, ${value}, ${description}, ${TENANT_ID})
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description
      `;
    }
    console.log('Seeded AI config');

    // ==================== AI Category Roles ====================

    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Tacos']}, 'main', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Burritos']}, 'main', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Quesadillas']}, 'main', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Tortas']}, 'main', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Platos Fuertes']}, 'main', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Sides']}, 'side', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Bebidas']}, 'drink', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Postres']}, 'side', ${TENANT_ID})`;
    console.log('Seeded AI category roles');

    // ==================== Loyalty Config ====================

    const loyaltyEntries = [
      ['stamps_required', '10'],
      ['reward_description', 'Free taco or drink of your choice'],
      ['sms_enabled', '1'],
      ['referral_bonus_stamps', '2'],
    ];
    for (const [key, value] of loyaltyEntries) {
      await adminSql`
        INSERT INTO loyalty_config (key, value, tenant_id)
        VALUES (${key}, ${value}, ${TENANT_ID})
        ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value
      `;
    }
    console.log('Seeded loyalty config');

    // ==================== Role Permissions ====================

    const roles = ['admin', 'manager', 'cashier', 'kitchen', 'bar'];
    const perms = [
      'pos_access', 'kitchen_access', 'bar_access', 'view_reports', 'manage_menu',
      'manage_inventory', 'manage_employees', 'manage_printers', 'manage_delivery',
      'manage_modifiers', 'manage_ai', 'process_refunds', 'void_orders',
      'apply_discounts', 'view_dashboard', 'manage_permissions', 'manage_purchase_orders',
      'manage_loyalty', 'manage_branding',
    ];
    const grants = {
      admin: perms,
      manager: perms.filter(p => p !== 'manage_permissions'),
      cashier: ['pos_access', 'view_dashboard'],
      kitchen: ['kitchen_access'],
      bar: ['bar_access'],
    };
    for (const role of roles) {
      for (const perm of perms) {
        const granted = (grants[role] || []).includes(perm);
        await adminSql`
          INSERT INTO role_permissions (role, permission, granted, tenant_id)
          VALUES (${role}, ${perm}, ${granted}, ${TENANT_ID})
          ON CONFLICT (tenant_id, role, permission) DO UPDATE SET granted = EXCLUDED.granted
        `;
      }
    }
    console.log('Seeded role permissions');

    // ==================== Done ====================

    await adminSql.end();

    console.log(`\nDemo tenant seeded successfully!`);
    console.log(`   Tenant ID:  ${TENANT_ID}`);
    console.log(`   Subdomain:  ${TENANT_SUBDOMAIN}.desktop.kitchen`);
    console.log(`   Owner:      ${OWNER_EMAIL}`);
    console.log(`   Plan:       ${PLAN}`);
    console.log(`   Branding:   Red (#dc2626)`);
  } catch (error) {
    console.error('Error seeding demo tenant:', error);
    process.exit(1);
  }
})();
