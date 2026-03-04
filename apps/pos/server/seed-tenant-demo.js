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
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { adminSql, initDb } from './db/index.js';

// ==================== Constants ====================

const TENANT_ID = 'demo';
const TENANT_NAME = 'Desktop Kitchen Demo';
const TENANT_SUBDOMAIN = 'demo';
const OWNER_EMAIL = 'admin@desktop.kitchen';
const OWNER_PASSWORD = process.env.DEMO_OWNER_PASSWORD || crypto.randomBytes(16).toString('hex');
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
        ('Burgers', 1, true, 'kitchen', ${TENANT_ID}),
        ('Chicken', 2, true, 'kitchen', ${TENANT_ID}),
        ('Sides', 3, true, 'kitchen', ${TENANT_ID}),
        ('Drinks', 4, true, 'bar', ${TENANT_ID}),
        ('Desserts', 5, true, 'kitchen', ${TENANT_ID})
      RETURNING id, name
    `;
    const catId = {};
    for (const row of catRows) catId[row.name] = row.id;
    console.log('Seeded 5 menu categories');

    // ==================== Menu Items (MXN) ====================

    const items = [
      // Burgers
      [catId['Burgers'], 'Classic Burger', 95, 'Beef patty, lettuce, tomato, onion, pickles'],
      [catId['Burgers'], 'Cheeseburger', 110, 'Beef patty with melted American cheese'],
      [catId['Burgers'], 'Double Burger', 145, 'Two beef patties, cheese, special sauce'],
      [catId['Burgers'], 'Bacon Burger', 130, 'Beef patty, crispy bacon, cheese, BBQ sauce'],
      [catId['Burgers'], 'Chicken Burger', 105, 'Grilled chicken breast, lettuce, mayo'],
      // Chicken
      [catId['Chicken'], 'Chicken Tenders (4 pcs)', 85, 'Crispy breaded chicken strips'],
      [catId['Chicken'], 'Chicken Wings (6 pcs)', 95, 'Fried wings with your choice of sauce'],
      [catId['Chicken'], 'Chicken Wrap', 90, 'Grilled chicken, lettuce, ranch, flour tortilla'],
      // Sides
      [catId['Sides'], 'French Fries', 45, 'Classic golden fries'],
      [catId['Sides'], 'Onion Rings', 55, 'Crispy battered onion rings'],
      [catId['Sides'], 'Coleslaw', 35, 'Fresh creamy coleslaw'],
      [catId['Sides'], 'Side Salad', 50, 'Mixed greens, tomato, cucumber, dressing'],
      // Drinks
      [catId['Drinks'], 'Coca-Cola', 30, 'Coca-Cola (500ml)'],
      [catId['Drinks'], 'Sprite', 30, 'Sprite (500ml)'],
      [catId['Drinks'], 'Lemonade', 35, 'Fresh-squeezed lemonade'],
      [catId['Drinks'], 'Water', 20, 'Bottled water'],
      [catId['Drinks'], 'Coffee', 35, 'Freshly brewed coffee'],
      // Desserts
      [catId['Desserts'], 'Milkshake', 65, 'Vanilla, chocolate, or strawberry'],
      [catId['Desserts'], 'Brownie', 50, 'Warm chocolate brownie'],
      [catId['Desserts'], 'Ice Cream Cup', 45, 'Two scoops, your choice of flavor'],
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
      ['beef patties', 200, 'count', 40, 'Meats', 25],
      ['chicken breast', 50, 'lbs', 10, 'Meats', 90],
      ['bacon', 30, 'lbs', 5, 'Meats', 120],
      ['burger buns', 200, 'count', 40, 'Dry Goods', 5],
      ['french fries (frozen)', 100, 'lbs', 20, 'Frozen', 15],
      ['chicken tenders (frozen)', 80, 'lbs', 15, 'Frozen', 50],
      ['American cheese', 30, 'lbs', 8, 'Dairy', 80],
      ['lettuce', 30, 'heads', 5, 'Produce', 15],
      ['tomatoes', 50, 'lbs', 10, 'Produce', 30],
      ['onions', 40, 'lbs', 8, 'Produce', 15],
      ['pickles', 20, 'jars', 5, 'Supplies', 40],
      ['cooking oil', 40, 'liters', 10, 'Supplies', 30],
      ['Coca-Cola (500ml)', 100, 'count', 20, 'Beverages', 12],
      ['Sprite (500ml)', 80, 'count', 15, 'Beverages', 12],
      ['coffee beans', 20, 'lbs', 5, 'Beverages', 150],
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
        ('Extras', 'multi', false, 0, 5, 1, true, ${TENANT_ID}),
        ('Sauce', 'single', false, 0, 1, 2, true, ${TENANT_ID})
      RETURNING id, name
    `;
    const mgId = {};
    for (const row of mgRows) mgId[row.name] = row.id;

    // Extras
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Extra Cheese', 15, 1, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Bacon', 20, 2, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Jalapenos', 0, 3, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Extras']}, 'Extra Patty', 35, 4, true, ${TENANT_ID})`;

    // Sauce
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Sauce']}, 'Ketchup', 0, 1, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Sauce']}, 'BBQ', 0, 2, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Sauce']}, 'Ranch', 0, 3, true, ${TENANT_ID})`;
    await adminSql`INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active, tenant_id) VALUES (${mgId['Sauce']}, 'Buffalo', 0, 4, true, ${TENANT_ID})`;

    // Assign Extras to burgers
    const burgerNames = ['Classic Burger', 'Cheeseburger', 'Double Burger', 'Bacon Burger', 'Chicken Burger'];
    for (const name of burgerNames) {
      const mid = itemId[name];
      if (!mid) continue;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Extras']}, 1, ${TENANT_ID})`;
    }
    // Assign Sauce to chicken items
    const chickenNames = ['Chicken Tenders (4 pcs)', 'Chicken Wings (6 pcs)', 'Chicken Wrap'];
    for (const name of chickenNames) {
      const mid = itemId[name];
      if (!mid) continue;
      await adminSql`INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order, tenant_id) VALUES (${mid}, ${mgId['Sauce']}, 1, ${TENANT_ID})`;
    }

    console.log('Seeded modifier groups and modifiers');

    // ==================== Combo Definitions ====================

    const comboRows = await adminSql`
      INSERT INTO combo_definitions (name, description, combo_price, active, tenant_id) VALUES
        ('Burger Combo', 'Any burger + fries + drink', 155, true, ${TENANT_ID}),
        ('Chicken Combo', 'Tenders or wings + side + drink', 150, true, ${TENANT_ID})
      RETURNING id, name
    `;
    const comboId = {};
    for (const row of comboRows) comboId[row.name] = row.id;

    // Burger Combo: burger + side + drink
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Burger Combo']}, 'Burger', ${catId['Burgers']}, 1, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Burger Combo']}, 'Side', ${catId['Sides']}, 2, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Burger Combo']}, 'Drink', ${catId['Drinks']}, 3, ${TENANT_ID})`;

    // Chicken Combo: chicken + side + drink
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Chicken Combo']}, 'Chicken', ${catId['Chicken']}, 1, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Chicken Combo']}, 'Side', ${catId['Sides']}, 2, ${TENANT_ID})`;
    await adminSql`INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order, tenant_id) VALUES (${comboId['Chicken Combo']}, 'Drink', ${catId['Drinks']}, 3, ${TENANT_ID})`;

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

    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Burgers']}, 'main', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Chicken']}, 'main', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Sides']}, 'side', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Drinks']}, 'drink', ${TENANT_ID})`;
    await adminSql`INSERT INTO ai_category_roles (category_id, role, tenant_id) VALUES (${catId['Desserts']}, 'side', ${TENANT_ID})`;
    console.log('Seeded AI category roles');

    // ==================== Loyalty Config ====================

    const loyaltyEntries = [
      ['stamps_required', '10'],
      ['reward_description', 'Free item of your choice'],
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
    console.log(`   Password:   ${OWNER_PASSWORD}`);
    console.log(`   Plan:       ${PLAN}`);
    console.log(`   Branding:   Teal (#0d9488)`);
  } catch (error) {
    console.error('Error seeding demo tenant:', error);
    process.exit(1);
  }
})();
