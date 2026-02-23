import 'dotenv/config';
import { adminSql, initDb } from './db/index.js';

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

    // Helper for inserts with tenant context
    const ins = async (sql, params = []) => {
      const result = await adminSql.unsafe(
        sql.replace(/\?\?TENANT\?\?/, `'${tenantId}'`),
        params
      );
      return result;
    };

    // We'll use adminSql tagged templates for safety
    const s = adminSql;

    // Seed employees
    await s`INSERT INTO employees (tenant_id, name, pin, role, active) VALUES (${tenantId}, 'Manager', '1234', 'admin', true)`;
    await s`INSERT INTO employees (tenant_id, name, pin, role, active) VALUES (${tenantId}, 'Maria', '5678', 'cashier', true)`;
    await s`INSERT INTO employees (tenant_id, name, pin, role, active) VALUES (${tenantId}, 'Carlos', '9012', 'cashier', true)`;
    console.log('Seeded 3 employees');

    // Seed menu categories
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Appetizers', 1, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Mains', 2, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Sandwiches', 3, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Salads', 4, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Sides', 5, true, 'kitchen')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Drinks', 6, true, 'bar')`;
    await s`INSERT INTO menu_categories (tenant_id, name, sort_order, active, printer_target) VALUES (${tenantId}, 'Desserts', 7, true, 'kitchen')`;
    console.log('Seeded 7 menu categories');

    // Get category IDs
    const cats = await s`SELECT id, name FROM menu_categories WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
    const catId = Object.fromEntries(cats.map(c => [c.name, c.id]));

    // Seed menu items (prices in MXN)
    const menuItems = [
      // Appetizers
      [catId['Appetizers'], 'Nachos Supreme', 140, 'Crispy chips with cheese, jalapeños, and sour cream'],
      [catId['Appetizers'], 'Chicken Wings (6)', 160, 'Crispy wings with your choice of sauce'],
      [catId['Appetizers'], 'Mozzarella Sticks', 120, 'Golden fried with marinara dipping sauce'],
      [catId['Appetizers'], 'Chips & Guacamole', 95, 'Warm chips with fresh guacamole'],
      // Mains
      [catId['Mains'], 'Classic Burger', 190, 'Beef patty, lettuce, tomato, onion, and our special sauce'],
      [catId['Mains'], 'Grilled Chicken Plate', 210, 'Grilled chicken breast with rice and vegetables'],
      [catId['Mains'], 'Fish & Chips', 220, 'Beer-battered fish with fries and tartar sauce'],
      [catId['Mains'], 'Pasta Bolognese', 185, 'Spaghetti with hearty meat sauce and parmesan'],
      [catId['Mains'], 'Steak Plate', 320, '250g ribeye with mashed potatoes and grilled vegetables'],
      [catId['Mains'], 'BBQ Ribs', 290, 'Slow-cooked ribs with BBQ sauce, coleslaw, and fries'],
      // Sandwiches
      [catId['Sandwiches'], 'Club Sandwich', 170, 'Triple-decker with turkey, bacon, lettuce, and tomato'],
      [catId['Sandwiches'], 'Grilled Cheese', 120, 'Melted cheddar and mozzarella on sourdough'],
      [catId['Sandwiches'], 'Chicken Wrap', 155, 'Grilled chicken, lettuce, and ranch in a flour tortilla'],
      [catId['Sandwiches'], 'BLT', 140, 'Crispy bacon, lettuce, tomato on toasted bread'],
      // Salads
      [catId['Salads'], 'Caesar Salad', 145, 'Romaine, croutons, parmesan, and Caesar dressing'],
      [catId['Salads'], 'Garden Salad', 110, 'Mixed greens, tomato, cucumber, and vinaigrette'],
      [catId['Salads'], 'Grilled Chicken Salad', 175, 'Mixed greens topped with grilled chicken and avocado'],
      // Sides
      [catId['Sides'], 'French Fries', 70, 'Crispy golden fries'],
      [catId['Sides'], 'Onion Rings', 85, 'Beer-battered onion rings'],
      [catId['Sides'], 'Rice & Beans', 60, 'Seasoned rice and refried beans'],
      [catId['Sides'], 'Coleslaw', 50, 'Creamy house-made coleslaw'],
      // Drinks
      [catId['Drinks'], 'Fresh Lemonade', 55, 'House-squeezed lemonade'],
      [catId['Drinks'], 'Iced Tea', 45, 'Fresh brewed, sweetened or unsweetened'],
      [catId['Drinks'], 'Soda', 40, 'Coca-Cola products'],
      [catId['Drinks'], 'Water', 30, 'Bottled water'],
      [catId['Drinks'], 'Coffee', 50, 'Freshly brewed coffee'],
      // Desserts
      [catId['Desserts'], 'Chocolate Cake', 90, 'Rich chocolate layer cake'],
      [catId['Desserts'], 'Churros', 70, 'Fried pastry with cinnamon sugar and chocolate sauce'],
      [catId['Desserts'], 'Ice Cream (2 scoops)', 65, 'Vanilla, chocolate, or strawberry'],
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
      ['chicken breast', 60, 'lbs', 15, 'Meats', 90],
      ['fish fillets', 30, 'lbs', 5, 'Meats', 160],
      ['pork ribs', 25, 'lbs', 5, 'Meats', 180],
      ['ribeye steak', 20, 'lbs', 5, 'Meats', 350],
      ['bacon', 30, 'lbs', 5, 'Meats', 120],
      ['turkey', 20, 'lbs', 5, 'Meats', 100],
      ['cheese', 100, 'lbs', 20, 'Dairy', 80],
      ['lettuce', 50, 'lbs', 10, 'Produce', 30],
      ['tomato', 50, 'lbs', 10, 'Produce', 35],
      ['onions', 100, 'lbs', 20, 'Produce', 15],
      ['potatoes', 200, 'lbs', 30, 'Produce', 20],
      ['bread/buns', 300, 'count', 50, 'Dry Goods', 8],
      ['tortillas', 300, 'count', 50, 'Dry Goods', 3],
      ['pasta', 100, 'lbs', 15, 'Dry Goods', 25],
      ['rice', 150, 'lbs', 25, 'Dry Goods', 20],
      ['beans', 100, 'lbs', 20, 'Dry Goods', 25],
      ['guacamole', 40, 'lbs', 10, 'Produce', 120],
      ['chips', 300, 'count', 50, 'Supplies', 5],
      ['cooking oil', 50, 'liters', 10, 'Supplies', 30],
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
      ['Classic Burger', 'ground beef', 0.25], ['Classic Burger', 'bread/buns', 1],
      ['Classic Burger', 'cheese', 0.1], ['Classic Burger', 'lettuce', 0.05], ['Classic Burger', 'tomato', 0.05],
      ['Grilled Chicken Plate', 'chicken breast', 0.3], ['Grilled Chicken Plate', 'rice', 0.25],
      ['Fish & Chips', 'fish fillets', 0.25], ['Fish & Chips', 'potatoes', 0.3], ['Fish & Chips', 'cooking oil', 0.1],
      ['Pasta Bolognese', 'ground beef', 0.2], ['Pasta Bolognese', 'pasta', 0.25],
      ['Club Sandwich', 'turkey', 0.15], ['Club Sandwich', 'bacon', 0.1], ['Club Sandwich', 'bread/buns', 2],
      ['French Fries', 'potatoes', 0.3], ['French Fries', 'cooking oil', 0.05],
      ['Nachos Supreme', 'chips', 1], ['Nachos Supreme', 'cheese', 0.3],
      ['Chips & Guacamole', 'chips', 1], ['Chips & Guacamole', 'guacamole', 0.25],
    ];

    for (const [menuName, invName, qty] of ingredients) {
      if (itemId[menuName] && invId[invName]) {
        await s`INSERT INTO menu_item_ingredients (tenant_id, menu_item_id, inventory_item_id, quantity_used) VALUES (${tenantId}, ${itemId[menuName]}, ${invId[invName]}, ${qty})`;
      }
    }
    console.log('Seeded menu item ingredients');

    // Seed AI category roles
    const catRoles = [
      ['Appetizers', 'side'], ['Mains', 'main'], ['Sandwiches', 'main'],
      ['Salads', 'side'], ['Sides', 'side'], ['Drinks', 'drink'], ['Desserts', 'side'],
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
      ['grok_model', 'grok-3-mini', 'Grok model to use'],
      ['suggestion_cache_ttl_minutes', '5', 'Cache TTL for suggestion data'],
      ['inventory_push_threshold_multiplier', '1.5', 'Multiplier for low stock threshold'],
    ];
    for (const [key, value, desc] of configEntries) {
      await s`INSERT INTO ai_config (tenant_id, key, value, description) VALUES (${tenantId}, ${key}, ${value}, ${desc})`;
    }
    console.log('Seeded AI config');

    // Seed modifier groups
    const modGroups = [
      ['Protein', 'single', true, 1, 1, 1],
      ['Sauce', 'multi', false, 0, 3, 2],
      ['Add-Ons', 'multi', false, 0, 5, 3],
      ['Size', 'single', false, 0, 1, 4],
      ['Bread', 'single', false, 0, 1, 5],
    ];
    for (const [name, selType, req, minSel, maxSel, sortOrd] of modGroups) {
      await s`INSERT INTO modifier_groups (tenant_id, name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (${tenantId}, ${name}, ${selType}, ${req}, ${minSel}, ${maxSel}, ${sortOrd}, true)`;
    }

    const groups = await s`SELECT id, name FROM modifier_groups WHERE tenant_id = ${tenantId} ORDER BY sort_order`;
    const groupId = Object.fromEntries(groups.map(g => [g.name, g.id]));

    // Seed modifiers
    const mods = [
      [groupId['Protein'], 'Beef', 0, 1], [groupId['Protein'], 'Chicken', 0, 2],
      [groupId['Protein'], 'Fish', 15, 3], [groupId['Protein'], 'Veggie', 0, 4],
      [groupId['Sauce'], 'BBQ Sauce', 0, 1], [groupId['Sauce'], 'Ranch', 0, 2],
      [groupId['Sauce'], 'Hot Sauce', 0, 3], [groupId['Sauce'], 'Aioli', 10, 4],
      [groupId['Add-Ons'], 'Extra Cheese', 15, 1], [groupId['Add-Ons'], 'Bacon', 25, 2],
      [groupId['Add-Ons'], 'Avocado', 30, 3], [groupId['Add-Ons'], 'Jalapeños', 0, 4],
      [groupId['Add-Ons'], 'Fried Egg', 20, 5],
      [groupId['Size'], 'Regular', 0, 1], [groupId['Size'], 'Large (+$30)', 30, 2],
      [groupId['Bread'], 'White Bread', 0, 1], [groupId['Bread'], 'Sourdough', 0, 2],
      [groupId['Bread'], 'Whole Wheat', 0, 3],
    ];
    for (const [gid, name, price, sortOrd] of mods) {
      await s`INSERT INTO modifiers (tenant_id, group_id, name, price_adjustment, sort_order, active) VALUES (${tenantId}, ${gid}, ${name}, ${price}, ${sortOrd}, true)`;
    }

    // Assign modifier groups to menu items
    const mainItems = items.filter(i => menuItems.find(m => m[0] === catId['Mains'] && m[1] === i.name));
    for (const item of mainItems) {
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Sauce']}, 2)`;
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Add-Ons']}, 3)`;
    }
    const sandwichItems = items.filter(i => menuItems.find(m => m[0] === catId['Sandwiches'] && m[1] === i.name));
    for (const item of sandwichItems) {
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Sauce']}, 2)`;
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Add-Ons']}, 3)`;
      await s`INSERT INTO menu_item_modifier_groups (tenant_id, menu_item_id, modifier_group_id, sort_order) VALUES (${tenantId}, ${item.id}, ${groupId['Bread']}, 5)`;
    }
    console.log('Seeded modifier groups and modifiers');

    // Seed combos
    await s`INSERT INTO combo_definitions (tenant_id, name, description, combo_price, active) VALUES (${tenantId}, 'Burger Combo', 'Any burger with fries and a drink — save $25!', 260, true)`;
    await s`INSERT INTO combo_definitions (tenant_id, name, description, combo_price, active) VALUES (${tenantId}, 'Lunch Special', 'Any sandwich with a side and a drink — save $20!', 220, true)`;
    const combos = await s`SELECT id, name FROM combo_definitions WHERE tenant_id = ${tenantId} ORDER BY id`;
    const comboId = Object.fromEntries(combos.map(c => [c.name, c.id]));
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Burger Combo']}, 'Choose your Main', ${catId['Mains']}, 1)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Burger Combo']}, 'Choose your Drink', ${catId['Drinks']}, 2)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Lunch Special']}, 'Choose your Sandwich', ${catId['Sandwiches']}, 1)`;
    await s`INSERT INTO combo_slots (tenant_id, combo_id, slot_label, category_id, sort_order) VALUES (${tenantId}, ${comboId['Lunch Special']}, 'Choose your Drink', ${catId['Drinks']}, 2)`;
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
