import 'dotenv/config';
import bcrypt from 'bcrypt';
import { adminSql, initDb } from './db/index.js';

const BCRYPT_ROUNDS = 12;

/**
 * Seed script for Postgres. Uses adminSql with set_config for tenant context.
 * Usage: node server/seed.js [tenantId]
 */
const tenantId = process.argv[2] || 'default';

(async () => {
  try {
    await initDb();

    console.log(`Seeding for tenant: ${tenantId}`);

    // Set tenant context for RLS
    await adminSql`SELECT set_config('app.tenant_id', ${tenantId}, false)`;

    // Clear existing data for this tenant (FK-safe order: children before parents)
    const tenantTables = [
      'stamp_events', 'referral_events', 'loyalty_messages', 'stamp_cards', 'loyalty_customers',
      'ai_suggestion_events', 'ai_suggestion_cache', 'ai_hourly_snapshots',
      'ai_item_pairs', 'ai_inventory_velocity', 'ai_restock_log', 'ai_category_roles', 'ai_config',
      'virtual_brand_items', 'virtual_brands',
      'delivery_orders', 'delivery_markup_rules', 'delivery_recapture', 'delivery_platforms',
      'order_item_modifiers', 'order_items',
      'order_payment_items', 'order_payments', 'orders',
      'menu_item_modifier_groups', 'menu_item_ingredients',
      'combo_slots', 'combo_definitions',
      'modifiers', 'modifier_groups',
      'category_printer_routes', 'printers',
      'menu_items', 'menu_categories',
      'inventory_items', 'inventory_counts', 'shrinkage_alerts',
      'refunds', 'crypto_payments',
      'vendor_items', 'purchase_order_items', 'purchase_orders', 'vendors',
      'financial_actuals', 'financial_targets',
      'role_permissions', 'loyalty_config', 'order_templates',
      'employees',
    ];

    for (const table of tenantTables) {
      try {
        await adminSql.unsafe(`DELETE FROM ${table} WHERE tenant_id = $1`, [tenantId]);
      } catch (e) { /* table may not exist */ }
    }

    // We'll use adminSql tagged templates for safety
    const s = adminSql;

    // Seed employees (hash PINs with bcrypt)
    const pin1234 = await bcrypt.hash('1234', BCRYPT_ROUNDS);
    const pin5678 = await bcrypt.hash('5678', BCRYPT_ROUNDS);
    const pin9012 = await bcrypt.hash('9012', BCRYPT_ROUNDS);
    await s`INSERT INTO employees (tenant_id, name, pin, role, active) VALUES (${tenantId}, 'Manager', ${pin1234}, 'admin', true)`;
    await s`INSERT INTO employees (tenant_id, name, pin, role, active) VALUES (${tenantId}, 'Maria', ${pin5678}, 'cashier', true)`;
    await s`INSERT INTO employees (tenant_id, name, pin, role, active) VALUES (${tenantId}, 'Carlos', ${pin9012}, 'cashier', true)`;
    console.log('Seeded 3 employees');

    // Seed menu categories (5 streamlined categories)
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Burgers', 1, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Salads', 2, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Sides', 3, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Drinks', 4, true, 'bar')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Desserts', 5, true, 'kitchen')`;
    console.log('Seeded 5 menu categories');

    // Get category IDs
    const cats = await s`SELECT id, name FROM menu_categories WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
    const catId = Object.fromEntries(cats.map(c => [c.name, c.id]));

    // Seed menu items (prices in MXN)
    const menuItems = [
      // Burgers
      [catId['Burgers'], 'Classic Burger', 150, 'Beef patty, lettuce, tomato, onion, pickles'],
      [catId['Burgers'], 'Cheeseburger', 170, 'Beef patty with melted cheddar cheese'],
      [catId['Burgers'], 'Bacon Burger', 190, 'Beef patty, crispy bacon, cheddar, BBQ sauce'],
      [catId['Burgers'], 'Chicken Burger', 160, 'Grilled chicken breast, mayo, lettuce, tomato'],
      [catId['Burgers'], 'Veggie Burger', 145, 'Plant-based patty, avocado, sprouts, chipotle aioli'],
      // Salads
      [catId['Salads'], 'Caesar Salad', 120, 'Romaine, croutons, parmesan, Caesar dressing'],
      [catId['Salads'], 'Garden Salad', 95, 'Mixed greens, tomato, cucumber, carrot, vinaigrette'],
      [catId['Salads'], 'Grilled Chicken Salad', 155, 'Mixed greens, grilled chicken, avocado, ranch'],
      // Sides
      [catId['Sides'], 'French Fries', 60, 'Crispy golden fries'],
      [catId['Sides'], 'Sweet Potato Fries', 75, 'Lightly salted sweet potato fries'],
      [catId['Sides'], 'Onion Rings', 70, 'Beer-battered onion rings'],
      [catId['Sides'], 'Coleslaw', 45, 'Creamy house-made coleslaw'],
      // Drinks
      [catId['Drinks'], 'Coca-Cola', 35, 'Classic Coca-Cola'],
      [catId['Drinks'], 'Sprite', 35, 'Lemon-lime soda'],
      [catId['Drinks'], 'Agua Mineral', 30, 'Sparkling mineral water'],
      [catId['Drinks'], 'Limonada', 45, 'Fresh-squeezed lemonade'],
      [catId['Drinks'], 'Iced Tea', 40, 'Fresh brewed, sweetened or unsweetened'],
      [catId['Drinks'], 'Water', 25, 'Bottled water'],
      // Desserts
      [catId['Desserts'], 'Chocolate Brownie', 75, 'Warm brownie with vanilla ice cream'],
      [catId['Desserts'], 'Churros', 60, 'Cinnamon sugar churros with chocolate sauce'],
    ];

    for (const [categoryId, name, price, desc] of menuItems) {
      await s`INSERT INTO menu_items (tenant_id, category_id, name, price, description, active) VALUES (${tenantId}, ${categoryId}, ${name}, ${price}, ${desc}, true)`;
    }
    console.log(`Seeded ${menuItems.length} menu items`);

    // Get menu item IDs by name
    const items = await s`SELECT id, name FROM menu_items WHERE tenant_id = ${tenantId} ORDER BY id`;
    const itemId = Object.fromEntries(items.map(i => [i.name, i.id]));

    // Seed inventory items
    const invItems = [
      ['ground beef', 50, 'lbs', 10, 'Meats', 160],
      ['chicken breast', 40, 'lbs', 10, 'Meats', 90],
      ['burger buns', 200, 'count', 40, 'Dry Goods', 8],
      ['lettuce', 50, 'lbs', 10, 'Produce', 30],
      ['tomato', 50, 'lbs', 10, 'Produce', 35],
      ['onions', 80, 'lbs', 15, 'Produce', 15],
      ['cheese', 60, 'lbs', 10, 'Dairy', 80],
      ['bacon', 25, 'lbs', 5, 'Meats', 120],
      ['avocado', 40, 'lbs', 8, 'Produce', 60],
      ['potatoes', 150, 'lbs', 25, 'Produce', 20],
      ['sweet potatoes', 80, 'lbs', 15, 'Produce', 30],
      ['cooking oil', 40, 'liters', 8, 'Supplies', 30],
      ['lemons', 60, 'count', 15, 'Produce', 5],
      ['sodas (cases)', 20, 'cases', 5, 'Beverages', 200],
      ['bread/croutons', 100, 'count', 20, 'Dry Goods', 10],
    ];

    for (const [name, qty, unit, threshold, cat, cost] of invItems) {
      await s`INSERT INTO inventory_items (tenant_id, name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (${tenantId}, ${name}, ${qty}, ${unit}, ${threshold}, ${cat}, ${cost})`;
    }
    console.log(`Seeded ${invItems.length} inventory items`);

    // Get inventory IDs by name
    const invRows = await s`SELECT id, name FROM inventory_items WHERE tenant_id = ${tenantId} ORDER BY id`;
    const invId = Object.fromEntries(invRows.map(i => [i.name, i.id]));

    // Seed menu_item_ingredients
    const ingredients = [
      // Burgers → beef + buns + lettuce + tomato + onions
      ['Classic Burger', 'ground beef', 0.25], ['Classic Burger', 'burger buns', 1],
      ['Classic Burger', 'lettuce', 0.05], ['Classic Burger', 'tomato', 0.05], ['Classic Burger', 'onions', 0.03],
      ['Cheeseburger', 'ground beef', 0.25], ['Cheeseburger', 'burger buns', 1],
      ['Cheeseburger', 'cheese', 0.1], ['Cheeseburger', 'lettuce', 0.05],
      ['Bacon Burger', 'ground beef', 0.25], ['Bacon Burger', 'burger buns', 1],
      ['Bacon Burger', 'cheese', 0.1], ['Bacon Burger', 'bacon', 0.1],
      ['Chicken Burger', 'chicken breast', 0.25], ['Chicken Burger', 'burger buns', 1],
      ['Chicken Burger', 'lettuce', 0.05], ['Chicken Burger', 'tomato', 0.05],
      ['Veggie Burger', 'burger buns', 1], ['Veggie Burger', 'avocado', 0.1],
      // Salads
      ['Caesar Salad', 'lettuce', 0.15], ['Caesar Salad', 'bread/croutons', 2], ['Caesar Salad', 'cheese', 0.05],
      ['Garden Salad', 'lettuce', 0.15], ['Garden Salad', 'tomato', 0.1],
      ['Grilled Chicken Salad', 'chicken breast', 0.2], ['Grilled Chicken Salad', 'lettuce', 0.15], ['Grilled Chicken Salad', 'avocado', 0.1],
      // Sides → potatoes + oil
      ['French Fries', 'potatoes', 0.3], ['French Fries', 'cooking oil', 0.05],
      ['Sweet Potato Fries', 'sweet potatoes', 0.3], ['Sweet Potato Fries', 'cooking oil', 0.05],
      ['Onion Rings', 'onions', 0.2], ['Onion Rings', 'cooking oil', 0.05],
      // Drinks
      ['Limonada', 'lemons', 3],
    ];

    for (const [menuName, invName, qty] of ingredients) {
      if (itemId[menuName] && invId[invName]) {
        await s`INSERT INTO menu_item_ingredients (tenant_id, menu_item_id, inventory_item_id, quantity_used) VALUES (${tenantId}, ${itemId[menuName]}, ${invId[invName]}, ${qty})`;
      }
    }
    console.log('Seeded menu item ingredients');

    // Seed AI category roles
    const catRoles = [
      ['Burgers', 'main'], ['Salads', 'side'], ['Sides', 'side'],
      ['Drinks', 'drink'], ['Desserts', 'side'],
    ];
    for (const [catName, role] of catRoles) {
      if (catId[catName]) {
        await s`INSERT INTO ai_category_roles (tenant_id, category_id, role) VALUES (${tenantId}, ${catId[catName]}, ${role})`;
      }
    }
    console.log('Seeded AI category roles');

    // Seed AI config
    const configEntries = [
      ['restaurant_name', 'Demo Restaurant', 'Restaurant display name'],
      ['currency', 'MXN', 'Currency code'],
      ['tax_rate', '0.16', 'Tax rate (16% IVA)'],
      ['rush_hours', '11-14,18-21', 'Rush hour ranges (24h format)'],
      ['slow_hours', '15-17', 'Slow period ranges (24h format)'],
      ['max_suggestions_per_order', '2', 'Max AI suggestions shown per order'],
      ['suggestion_display_timeout', '15', 'Seconds before suggestion auto-hides'],
      ['upsell_enabled', '1', 'Enable upsell suggestions'],
      ['inventory_push_enabled', '1', 'Enable inventory-aware item pushing'],
      ['combo_upgrade_enabled', '1', 'Enable combo upgrade suggestions'],
      ['dynamic_pricing_enabled', '0', 'Enable dynamic pricing'],
      ['grok_api_enabled', '0', 'Enable Grok API for enhanced analysis'],
      ['grok_max_calls_per_hour', '10', 'Max Grok API calls per hour'],
      ['grok_model', 'grok-4-1-fast-reasoning', 'Grok model to use'],
      ['suggestion_cache_ttl_minutes', '5', 'Cache TTL for suggestion data'],
      ['inventory_push_threshold_multiplier', '1.5', 'Multiplier for low stock threshold'],
    ];
    for (const [key, value, desc] of configEntries) {
      await s`INSERT INTO ai_config (tenant_id, key, value, description) VALUES (${tenantId}, ${key}, ${value}, ${desc})`;
    }
    console.log('Seeded AI config');

    // Seed modifier groups (3 simplified groups)
    const modGroups = [
      ['Toppings', 'multi', false, 0, 5, 1],
      ['Sauce', 'multi', false, 0, 3, 2],
      ['Size', 'single', false, 0, 1, 3],
    ];
    for (const [name, selType, req, minSel, maxSel, sortOrd] of modGroups) {
      await s`INSERT INTO modifier_groups (tenant_id, name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (${tenantId}, ${name}, ${selType}, ${req}, ${minSel}, ${maxSel}, ${sortOrd}, true)`;
    }

    const groups = await s`SELECT id, name FROM modifier_groups WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
    const groupId = Object.fromEntries(groups.map(g => [g.name, g.id]));

    // Seed modifiers
    const mods = [
      [groupId['Toppings'], 'Extra Cheese', 15, 1],
      [groupId['Toppings'], 'Bacon', 25, 2],
      [groupId['Toppings'], 'Avocado', 30, 3],
      [groupId['Toppings'], 'Jalapeños', 0, 4],
      [groupId['Toppings'], 'Fried Egg', 20, 5],
      [groupId['Sauce'], 'Ketchup', 0, 1],
      [groupId['Sauce'], 'Mayo', 0, 2],
      [groupId['Sauce'], 'BBQ Sauce', 0, 3],
      [groupId['Sauce'], 'Chipotle Aioli', 10, 4],
      [groupId['Size'], 'Regular', 0, 1],
      [groupId['Size'], 'Large', 30, 2],
    ];
    for (const [gid, name, price, sortOrd] of mods) {
      await s`INSERT INTO modifiers (tenant_id, group_id, name, price_adjustment, sort_order, active) VALUES (${tenantId}, ${gid}, ${name}, ${price}, ${sortOrd}, true)`;
    }

    // Assign Toppings + Sauce to Burgers
    const burgerItems = items.filter(i => menuItems.find(m => m[0] === catId['Burgers'] && m[1] === i.name));
    for (const item of burgerItems) {
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Toppings']}, 1)`;
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Sauce']}, 2)`;
    }

    // Assign Size to Sides and Drinks
    const sideItems = items.filter(i => menuItems.find(m => m[0] === catId['Sides'] && m[1] === i.name));
    for (const item of sideItems) {
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Size']}, 1)`;
    }
    const drinkItems = items.filter(i => menuItems.find(m => m[0] === catId['Drinks'] && m[1] === i.name));
    for (const item of drinkItems) {
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Size']}, 1)`;
    }
    console.log('Seeded modifier groups and modifiers');

    // Seed combos
    await s`INSERT INTO combo_definitions (tenant_id, name, description, combo_price, active) VALUES (${tenantId}, 'Burger Combo', 'Any burger + side + drink — save ~$25!', 220, true)`;
    await s`INSERT INTO combo_definitions (tenant_id, name, description, combo_price, active) VALUES (${tenantId}, 'Salad Combo', 'Any salad + side + drink — save ~$20!', 175, true)`;
    const combos = await s`SELECT id, name FROM combo_definitions WHERE tenant_id = ${tenantId} ORDER BY id`;
    const comboId = Object.fromEntries(combos.map(c => [c.name, c.id]));
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Burger Combo']}, 'Choose your Burger', ${catId['Burgers']}, 1)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Burger Combo']}, 'Choose your Side', ${catId['Sides']}, 2)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Burger Combo']}, 'Choose your Drink', ${catId['Drinks']}, 3)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Salad Combo']}, 'Choose your Salad', ${catId['Salads']}, 1)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Salad Combo']}, 'Choose your Side', ${catId['Sides']}, 2)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Salad Combo']}, 'Choose your Drink', ${catId['Drinks']}, 3)`;
    console.log('Seeded combo definitions');

    // Seed delivery platforms
    await s`INSERT INTO delivery_platforms (tenant_id, name, display_name, commission_percent, active) VALUES (${tenantId}, 'uber_eats', 'Uber Eats', 30, true)`;
    await s`INSERT INTO delivery_platforms (tenant_id, name, display_name, commission_percent, active) VALUES (${tenantId}, 'rappi', 'Rappi', 25, true)`;
    await s`INSERT INTO delivery_platforms (tenant_id, name, display_name, commission_percent, active) VALUES (${tenantId}, 'didi_food', 'DiDi Food', 22, true)`;
    console.log('Seeded 3 delivery platforms');

    // Seed role permissions
    const allPermissions = [
      'pos_access', 'kitchen_access', 'bar_access', 'view_reports', 'manage_menu',
      'manage_inventory', 'manage_employees', 'manage_printers', 'manage_delivery',
      'manage_modifiers', 'manage_ai', 'process_refunds', 'void_orders',
      'apply_discounts', 'view_dashboard', 'manage_permissions', 'manage_purchase_orders',
      'manage_loyalty', 'manage_branding',
    ];
    const roleDefaults = {
      admin: allPermissions,
      manager: allPermissions.filter(p => p !== 'manage_permissions'),
      cashier: ['pos_access', 'view_dashboard'],
      kitchen: ['kitchen_access'],
      bar: ['bar_access'],
    };
    for (const [role, perms] of Object.entries(roleDefaults)) {
      for (const perm of allPermissions) {
        const granted = perms.includes(perm);
        await s`INSERT INTO role_permissions (tenant_id, role, permission, granted) VALUES (${tenantId}, ${role}, ${perm}, ${granted}) ON CONFLICT (tenant_id, role, permission) DO NOTHING`;
      }
    }
    console.log('Seeded role permissions');

    // Seed loyalty config
    const loyaltyDefaults = [
      ['stamps_required', '10', 'Number of stamps needed for a free reward'],
      ['reward_description', 'Free item of your choice', 'Default reward description'],
      ['referral_bonus_stamps', '2', 'Bonus stamps for referrer and referee'],
      ['sms_enabled', 'true', 'Enable SMS notifications for loyalty events'],
    ];
    for (const [key, value, desc] of loyaltyDefaults) {
      await s`INSERT INTO loyalty_config (tenant_id, key, value, description) VALUES (${tenantId}, ${key}, ${value}, ${desc}) ON CONFLICT (tenant_id, key) DO NOTHING`;
    }

    // Seed financial targets
    const ftDefaults = [
      ['food_cost', 30], ['labor', 25], ['rent', 8], ['utilities', 4],
      ['stripe_fees', 3], ['delivery_commissions', 5], ['marketing', 2],
      ['insurance', 2], ['supplies', 3],
    ];
    for (const [cat, pct] of ftDefaults) {
      await s`INSERT INTO financial_targets (tenant_id, category, target_percent, updated_at) VALUES (${tenantId}, ${cat}, ${pct}, NOW()) ON CONFLICT (tenant_id, category) DO NOTHING`;
    }

    console.log('\nDatabase seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
})();
