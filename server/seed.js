import { initDb, run, exec } from './db.js';

(async () => {
  try {
    await initDb();

    // Clear existing data and reset auto-increment sequences
    exec(`
      DELETE FROM menu_item_ingredients;
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM menu_items;
      DELETE FROM menu_categories;
      DELETE FROM inventory_items;
      DELETE FROM employees;
    `);

    // Clear AI tables (may not exist on first run)
    try {
      exec(`
        DELETE FROM ai_suggestion_cache;
        DELETE FROM ai_category_roles;
        DELETE FROM ai_config;
        DELETE FROM ai_suggestion_events;
        DELETE FROM ai_hourly_snapshots;
        DELETE FROM ai_item_pairs;
        DELETE FROM ai_inventory_velocity;
        DELETE FROM ai_restock_log;
      `);
    } catch (e) {
      // AI tables may not exist yet, that's fine
    }

    try {
      exec(`DELETE FROM sqlite_sequence;`);
    } catch (e) {
      // ignore
    }

    // Seed employees
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Manager', '1234', 'admin']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Maria', '5678', 'cashier']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Carlos', '9012', 'cashier']);

    console.log('✓ Seeded 3 employees');

    // Seed menu categories
    run('INSERT INTO menu_categories (name, sort_order, active) VALUES (?, ?, 1)', ['Burritos', 1]);
    run('INSERT INTO menu_categories (name, sort_order, active) VALUES (?, ?, 1)', ['Tacos', 2]);
    run('INSERT INTO menu_categories (name, sort_order, active) VALUES (?, ?, 1)', ['Quesadillas', 3]);
    run('INSERT INTO menu_categories (name, sort_order, active) VALUES (?, ?, 1)', ['Combos', 4]);
    run('INSERT INTO menu_categories (name, sort_order, active) VALUES (?, ?, 1)', ['Sides', 5]);
    run('INSERT INTO menu_categories (name, sort_order, active) VALUES (?, ?, 1)', ['Drinks', 6]);

    console.log('✓ Seeded 6 menu categories');

    // Seed menu items (prices in MXN)
    // Burritos (category_id = 1) — prices from Stripe products
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, 'California Burrito', 230, 'Carne asada, fries, cheese, guac, and sour cream']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, 'Carne Asada Burrito', 190, 'Grilled carne asada with rice, beans, and cheese']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, 'Grilled Chicken Burrito', 180, 'Grilled chicken with rice, beans, and cheese']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, "Juanberto's Special", 240, 'Our signature burrito loaded with everything']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, 'Carnitas Burrito', 185, 'Tender carnitas with rice, beans, and onions']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, 'Al Pastor Burrito', 185, 'Marinated pork al pastor with pineapple']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, 'Bean & Cheese Burrito', 120, 'Classic beans and melted cheese']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [1, 'Super Burrito', 210, 'Large burrito with your choice of meat and all the fixings']);

    // Tacos (category_id = 2)
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [2, 'Street Tacos (3)', 150, 'Three corn tortilla tacos with your choice of meat']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [2, 'Fish Taco', 70, 'Crispy fish with cabbage and chipotle crema']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [2, 'Shrimp Taco', 80, 'Seasoned shrimp with cilantro and lime']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [2, 'Birria Taco', 75, 'Tender braised meat in our signature sauce']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [2, 'Chicken Taco', 60, 'Shredded chicken with lettuce, tomato, and cheese']);

    // Quesadillas (category_id = 3)
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [3, 'Cheese Quesadilla', 120, 'Grilled flour tortilla with melted cheese']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [3, 'Carne Asada Quesadilla', 170, 'Cheese and grilled carne asada']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [3, 'Chicken Quesadilla', 155, 'Shredded chicken with cheese and peppers']);

    // Combos (category_id = 4)
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [4, 'Burrito Combo', 280, 'Burrito with rice, beans, and drink']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [4, 'Taco Combo', 220, 'Three tacos with rice, beans, and drink']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [4, 'Family Pack', 650, 'Feeds 4-5: Variety of burritos, tacos, and sides']);

    // Sides (category_id = 5)
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [5, 'Chips & Guac', 95, 'Warm chips with fresh guacamole']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [5, 'Rice & Beans', 60, 'Traditional rice and refried beans']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [5, 'Nachos', 140, 'Crispy chips with cheese, jalapeños, and sour cream']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [5, 'Churros', 70, 'Fried pastry with cinnamon sugar']);

    // Drinks (category_id = 6)
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [6, 'Horchata', 55, 'Sweet rice milk drink']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [6, 'Jamaica', 55, 'Tart hibiscus flower drink']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [6, 'Agua Fresca', 55, 'Refreshing cantaloupe or watermelon drink']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [6, 'Soda', 40, 'Coca-Cola products']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [6, 'Water', 30, 'Bottled water']);

    console.log('✓ Seeded 29 menu items');

    // Seed inventory items
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['tortillas', 500, 'count', 50, 'Supplies']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['carne asada', 50, 'lbs', 10, 'Meats']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['carnitas', 40, 'lbs', 10, 'Meats']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['al pastor', 35, 'lbs', 10, 'Meats']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['chicken', 60, 'lbs', 15, 'Meats']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['fish', 30, 'lbs', 5, 'Meats']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['shrimp', 25, 'lbs', 5, 'Meats']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['cheese', 100, 'lbs', 20, 'Dairy']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['beans', 200, 'lbs', 30, 'Dry Goods']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['rice', 150, 'lbs', 25, 'Dry Goods']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['guacamole', 40, 'lbs', 10, 'Produce']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['salsa', 80, 'lbs', 15, 'Sauces']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['chips', 300, 'count', 50, 'Supplies']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['lettuce', 50, 'lbs', 10, 'Produce']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['tomato', 50, 'lbs', 10, 'Produce']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['sour cream', 50, 'lbs', 10, 'Dairy']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['french fries', 200, 'lbs', 30, 'Frozen']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['onions', 100, 'lbs', 20, 'Produce']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['cilantro', 30, 'lbs', 5, 'Produce']);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category) VALUES (?, ?, ?, ?, ?)', ['limes', 200, 'count', 30, 'Produce']);

    console.log('✓ Seeded 20 inventory items');

    // Seed menu_item_ingredients
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 2, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 8, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 11, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 16, 0.25]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 2, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 9, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 8, 0.25]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 3, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 9, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 18, 0.1]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 4, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 9, 0.25]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 9, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 8, 0.5]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 5, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 9, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 8, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 11, 0.2]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 1, 3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 5, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 18, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 19, 0.05]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 6, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 14, 0.1]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [9, 7, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [9, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [9, 20, 0.5]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [10, 3, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [10, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [10, 12, 0.15]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 5, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 14, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 15, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 8, 0.15]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [12, 1, 2]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [12, 8, 0.5]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [13, 1, 2]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [13, 8, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [13, 2, 0.25]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [14, 1, 2]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [14, 8, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [14, 5, 0.25]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 2, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 9, 0.25]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 1, 3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 5, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 9, 0.25]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 2, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 1, 8]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 10, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 9, 1]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [18, 13, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [18, 11, 0.5]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [19, 10, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [19, 9, 0.5]);

    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [20, 13, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [20, 8, 0.5]);

    console.log('✓ Seeded menu item ingredients');

    // Seed AI category roles
    exec(`DELETE FROM ai_category_roles`);
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [1, 'main']);       // Burritos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [2, 'main']);       // Tacos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [3, 'main']);       // Quesadillas
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [4, 'combo']);      // Combos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [5, 'side']);       // Sides
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [6, 'drink']);      // Drinks

    console.log('✓ Seeded 6 AI category roles');

    // Seed AI config defaults
    exec(`DELETE FROM ai_config`);
    const configEntries = [
      ['restaurant_name', "Juanberto's California Burritos", 'Restaurant display name'],
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
      ['claude_api_enabled', '0', 'Enable Claude API for enhanced analysis'],
      ['claude_max_calls_per_hour', '10', 'Max Claude API calls per hour'],
      ['claude_model', 'claude-sonnet-4-20250514', 'Claude model to use'],
      ['suggestion_cache_ttl_minutes', '5', 'Cache TTL for suggestion data'],
      ['inventory_push_threshold_multiplier', '1.5', 'Multiplier for low stock threshold triggering push'],
    ];

    for (const [key, value, description] of configEntries) {
      run('INSERT INTO ai_config (key, value, description) VALUES (?, ?, ?)', [key, value, description]);
    }

    console.log('✓ Seeded 16 AI config entries');
    console.log('\n✅ Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
})();
