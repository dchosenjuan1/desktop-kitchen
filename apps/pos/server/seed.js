import { initDb, run, exec, saveDbSync } from './db/index.js';

(async () => {
  try {
    await initDb();

    // Disable FK checks during cleanup so we can delete in any order
    exec(`PRAGMA foreign_keys = OFF`);

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

    // Clear Phase 3+ tables
    try {
      exec(`
        DELETE FROM order_item_modifiers;
        DELETE FROM menu_item_modifier_groups;
        DELETE FROM modifiers;
        DELETE FROM modifier_groups;
        DELETE FROM combo_slots;
        DELETE FROM combo_definitions;
        DELETE FROM order_payment_items;
        DELETE FROM order_payments;
        DELETE FROM category_printer_routes;
        DELETE FROM printers;
        DELETE FROM delivery_orders;
        DELETE FROM delivery_platforms;
      `);
    } catch (e) {
      // Tables may not exist yet
    }

    try {
      exec(`DELETE FROM sqlite_sequence;`);
    } catch (e) {
      // ignore
    }

    // Re-enable FK checks for inserts
    exec(`PRAGMA foreign_keys = ON`);

    // Seed employees
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Manager', '1234', 'admin']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Maria', '5678', 'cashier']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Carlos', '9012', 'cashier']);

    console.log('✓ Seeded 3 employees');

    // Seed menu categories (with printer_target)
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Appetizers', 1, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Mains', 2, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Sandwiches', 3, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Salads', 4, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Sides', 5, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Drinks', 6, 'bar']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Desserts', 7, 'kitchen']);

    console.log('✓ Seeded 7 menu categories');

    // Seed menu items (prices in MXN)
    const ins = 'INSERT INTO menu_items (category_id, name, price, description, image_url, active) VALUES (?, ?, ?, ?, ?, 1)';

    // Appetizers (category_id = 1)
    run(ins, [1, 'Nachos Supreme', 140, 'Crispy chips with cheese, jalapeños, and sour cream', 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&h=400&fit=crop&auto=format']);
    run(ins, [1, 'Chicken Wings (6)', 160, 'Crispy wings with your choice of sauce', 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&h=400&fit=crop&auto=format']);
    run(ins, [1, 'Mozzarella Sticks', 120, 'Golden fried with marinara dipping sauce', 'https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=600&h=400&fit=crop&auto=format']);
    run(ins, [1, 'Chips & Guacamole', 95, 'Warm chips with fresh guacamole', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=400&fit=crop&auto=format']);

    // Mains (category_id = 2)
    run(ins, [2, 'Classic Burger', 190, 'Beef patty, lettuce, tomato, onion, and our special sauce', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop&auto=format']);
    run(ins, [2, 'Grilled Chicken Plate', 210, 'Grilled chicken breast with rice and vegetables', 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop&auto=format']);
    run(ins, [2, 'Fish & Chips', 220, 'Beer-battered fish with fries and tartar sauce', 'https://images.unsplash.com/photo-1579208030886-b1f5b7d31a02?w=600&h=400&fit=crop&auto=format']);
    run(ins, [2, 'Pasta Bolognese', 185, 'Spaghetti with hearty meat sauce and parmesan', 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=400&fit=crop&auto=format']);
    run(ins, [2, 'Steak Plate', 320, '250g ribeye with mashed potatoes and grilled vegetables', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=400&fit=crop&auto=format']);
    run(ins, [2, 'BBQ Ribs', 290, 'Slow-cooked ribs with BBQ sauce, coleslaw, and fries', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop&auto=format']);

    // Sandwiches (category_id = 3)
    run(ins, [3, 'Club Sandwich', 170, 'Triple-decker with turkey, bacon, lettuce, and tomato', 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&h=400&fit=crop&auto=format']);
    run(ins, [3, 'Grilled Cheese', 120, 'Melted cheddar and mozzarella on sourdough', 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=600&h=400&fit=crop&auto=format']);
    run(ins, [3, 'Chicken Wrap', 155, 'Grilled chicken, lettuce, and ranch in a flour tortilla', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&h=400&fit=crop&auto=format']);
    run(ins, [3, 'BLT', 140, 'Crispy bacon, lettuce, tomato on toasted bread', 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600&h=400&fit=crop&auto=format']);

    // Salads (category_id = 4)
    run(ins, [4, 'Caesar Salad', 145, 'Romaine, croutons, parmesan, and Caesar dressing', 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&h=400&fit=crop&auto=format']);
    run(ins, [4, 'Garden Salad', 110, 'Mixed greens, tomato, cucumber, and vinaigrette', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop&auto=format']);
    run(ins, [4, 'Grilled Chicken Salad', 175, 'Mixed greens topped with grilled chicken and avocado', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&auto=format']);

    // Sides (category_id = 5)
    run(ins, [5, 'French Fries', 70, 'Crispy golden fries', 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=400&fit=crop&auto=format']);
    run(ins, [5, 'Onion Rings', 85, 'Beer-battered onion rings', 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&h=400&fit=crop&auto=format']);
    run(ins, [5, 'Rice & Beans', 60, 'Seasoned rice and refried beans', 'https://images.unsplash.com/photo-1536304993881-070a87b367b7?w=600&h=400&fit=crop&auto=format']);
    run(ins, [5, 'Coleslaw', 50, 'Creamy house-made coleslaw', 'https://images.unsplash.com/photo-1625938145744-e380515399bf?w=600&h=400&fit=crop&auto=format']);

    // Drinks (category_id = 6)
    run(ins, [6, 'Fresh Lemonade', 55, 'House-squeezed lemonade', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&h=400&fit=crop&auto=format']);
    run(ins, [6, 'Iced Tea', 45, 'Fresh brewed, sweetened or unsweetened', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop&auto=format']);
    run(ins, [6, 'Soda', 40, 'Coca-Cola products', 'https://images.unsplash.com/photo-1581098365948-6a5a912b7a49?w=600&h=400&fit=crop&auto=format']);
    run(ins, [6, 'Water', 30, 'Bottled water', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop&auto=format']);
    run(ins, [6, 'Coffee', 50, 'Freshly brewed coffee', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=400&fit=crop&auto=format']);

    // Desserts (category_id = 7)
    run(ins, [7, 'Chocolate Cake', 90, 'Rich chocolate layer cake', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop&auto=format']);
    run(ins, [7, 'Churros', 70, 'Fried pastry with cinnamon sugar and chocolate sauce', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&h=400&fit=crop&auto=format']);
    run(ins, [7, 'Ice Cream (2 scoops)', 65, 'Vanilla, chocolate, or strawberry', 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&h=400&fit=crop&auto=format']);

    console.log('✓ Seeded 30 menu items');

    // Seed inventory items (with cost_price in MXN)
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['ground beef', 50, 'lbs', 10, 'Meats', 160]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['chicken breast', 60, 'lbs', 15, 'Meats', 90]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['fish fillets', 30, 'lbs', 5, 'Meats', 160]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['pork ribs', 25, 'lbs', 5, 'Meats', 180]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['ribeye steak', 20, 'lbs', 5, 'Meats', 350]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['bacon', 30, 'lbs', 5, 'Meats', 120]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['turkey', 20, 'lbs', 5, 'Meats', 100]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['cheese', 100, 'lbs', 20, 'Dairy', 80]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['lettuce', 50, 'lbs', 10, 'Produce', 30]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['tomato', 50, 'lbs', 10, 'Produce', 35]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['onions', 100, 'lbs', 20, 'Produce', 15]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['potatoes', 200, 'lbs', 30, 'Produce', 20]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['bread/buns', 300, 'count', 50, 'Dry Goods', 8]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['tortillas', 300, 'count', 50, 'Dry Goods', 3]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['pasta', 100, 'lbs', 15, 'Dry Goods', 25]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['rice', 150, 'lbs', 25, 'Dry Goods', 20]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['beans', 100, 'lbs', 20, 'Dry Goods', 25]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['guacamole', 40, 'lbs', 10, 'Produce', 120]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['chips', 300, 'count', 50, 'Supplies', 5]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['cooking oil', 50, 'liters', 10, 'Supplies', 30]);

    console.log('✓ Seeded 20 inventory items');

    // Seed menu_item_ingredients (selected items)
    // Classic Burger (id=5): ground beef, bun, cheese, lettuce, tomato
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 1, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 13, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 8, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 9, 0.05]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 10, 0.05]);

    // Grilled Chicken Plate (id=6)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 2, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 16, 0.25]);

    // Fish & Chips (id=7)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 3, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 12, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 20, 0.1]);

    // Pasta Bolognese (id=8)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 1, 0.2]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 15, 0.25]);

    // Club Sandwich (id=11)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 7, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 6, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 13, 2]);

    // French Fries (id=18)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [18, 12, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [18, 20, 0.05]);

    // Nachos Supreme (id=1)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 19, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 8, 0.3]);

    // Chips & Guac (id=4)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 19, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 18, 0.25]);

    console.log('✓ Seeded menu item ingredients');

    // Seed AI category roles
    exec(`DELETE FROM ai_category_roles`);
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [1, 'side']);        // Appetizers
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [2, 'main']);        // Mains
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [3, 'main']);        // Sandwiches
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [4, 'side']);        // Salads
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [5, 'side']);        // Sides
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [6, 'drink']);       // Drinks
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [7, 'side']);        // Desserts

    console.log('✓ Seeded 7 AI category roles');

    // Seed AI config defaults
    exec(`DELETE FROM ai_config`);
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
      ['dynamic_pricing_enabled', '0', 'Enable dynamic pricing (requires manager approval)'],
      ['grok_api_enabled', '0', 'Enable Grok API for enhanced analysis'],
      ['grok_max_calls_per_hour', '10', 'Max Grok API calls per hour'],
      ['grok_model', 'grok-3-mini', 'Grok model to use'],
      ['suggestion_cache_ttl_minutes', '5', 'Cache TTL for suggestion data'],
      ['inventory_push_threshold_multiplier', '1.5', 'Multiplier for low stock threshold triggering push'],
    ];

    for (const [key, value, description] of configEntries) {
      run('INSERT INTO ai_config (key, value, description) VALUES (?, ?, ?)', [key, value, description]);
    }

    console.log('✓ Seeded 16 AI config entries');

    // Seed modifier groups
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Protein', 'single', 1, 1, 1, 1]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Sauce', 'multi', 0, 0, 3, 2]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Add-Ons', 'multi', 0, 0, 5, 3]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Size', 'single', 0, 0, 1, 4]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Bread', 'single', 0, 0, 1, 5]);

    // Protein modifiers (group_id=1)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Beef', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Chicken', 0, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Fish', 15, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Veggie', 0, 4]);

    // Sauce modifiers (group_id=2)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'BBQ Sauce', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Ranch', 0, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Hot Sauce', 0, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Aioli', 10, 4]);

    // Add-Ons (group_id=3)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Extra Cheese', 15, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Bacon', 25, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Avocado', 30, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Jalapeños', 0, 4]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Fried Egg', 20, 5]);

    // Size (group_id=4)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [4, 'Regular', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [4, 'Large (+$30)', 30, 2]);

    // Bread (group_id=5)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [5, 'White Bread', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [5, 'Sourdough', 0, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [5, 'Whole Wheat', 0, 3]);

    // Assign modifier groups to mains and sandwiches
    // Mains get: Sauce, Add-Ons, Size
    for (let itemId = 5; itemId <= 10; itemId++) {
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 2, 2]); // Sauce
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 3, 3]); // Add-Ons
    }
    // Sandwiches get: Sauce, Add-Ons, Bread
    for (let itemId = 11; itemId <= 14; itemId++) {
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 2, 2]); // Sauce
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 3, 3]); // Add-Ons
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 5, 5]); // Bread
    }

    console.log('✓ Seeded modifier groups and modifiers');

    // Seed combo definitions
    run('INSERT INTO combo_definitions (name, description, combo_price, active) VALUES (?, ?, ?, 1)', ['Burger Combo', 'Any burger with fries and a drink — save $25!', 260]);
    run('INSERT INTO combo_definitions (name, description, combo_price, active) VALUES (?, ?, ?, 1)', ['Lunch Special', 'Any sandwich with a side and a drink — save $20!', 220]);

    // Combo slots
    // Burger Combo (combo_id=1): slot 1 = any main (category 2), slot 2 = any drink (category 6)
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Choose your Main', 2, 1]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Choose your Drink', 6, 2]);
    // Lunch Special (combo_id=2): slot 1 = any sandwich (category 3), slot 2 = any drink (category 6)
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [2, 'Choose your Sandwich', 3, 1]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [2, 'Choose your Drink', 6, 2]);

    console.log('✓ Seeded combo definitions');

    // Seed delivery platforms
    run('INSERT INTO delivery_platforms (name, display_name, commission_percent, active) VALUES (?, ?, ?, 1)', ['uber_eats', 'Uber Eats', 30]);
    run('INSERT INTO delivery_platforms (name, display_name, commission_percent, active) VALUES (?, ?, ?, 1)', ['rappi', 'Rappi', 25]);
    run('INSERT INTO delivery_platforms (name, display_name, commission_percent, active) VALUES (?, ?, ?, 1)', ['didi_food', 'DiDi Food', 22]);

    console.log('✓ Seeded 3 delivery platforms');

    // Seed loyalty test customers
    try {
      exec(`
        DELETE FROM stamp_events;
        DELETE FROM referral_events;
        DELETE FROM loyalty_messages;
        DELETE FROM stamp_cards;
        DELETE FROM loyalty_customers;
      `);
    } catch (e) {
      // Tables may not exist yet
    }

    try {
      // Customer 1: Maria Lopez — 7 stamps, regular
      run('INSERT INTO loyalty_customers (phone, name, referral_code, stamps_earned, orders_count, total_spent, sms_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['5551234567', 'Maria Lopez', 'DKMR42', 7, 7, 1540, 1]);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description) VALUES (?, ?, ?, ?)',
        [1, 7, 10, 'Free item of your choice']);

      // Customer 2: Carlos Hernandez — completed card + 3 on new card
      run('INSERT INTO loyalty_customers (phone, name, referral_code, stamps_earned, orders_count, total_spent, sms_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['5559876543', 'Carlos Hernandez', 'DKCH88', 13, 13, 2890, 1]);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description, completed, completed_at) VALUES (?, ?, ?, ?, 1, datetime(\'now\',\'localtime\'))',
        [2, 10, 10, 'Free item of your choice']);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description) VALUES (?, ?, ?, ?)',
        [2, 3, 10, 'Free item of your choice']);

      // Customer 3: Ana Garcia — new customer, 2 stamps (referred by Maria)
      run('INSERT INTO loyalty_customers (phone, name, referral_code, referred_by, stamps_earned, orders_count, total_spent, sms_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['5555551234', 'Ana Garcia', 'DKAG55', 1, 4, 2, 420, 1]);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description) VALUES (?, ?, ?, ?)',
        [3, 4, 10, 'Free item of your choice']);
      run('INSERT INTO referral_events (referrer_id, referee_id, referrer_stamps_added, referee_stamps_added) VALUES (?, ?, ?, ?)',
        [1, 3, 2, 2]);

      console.log('✓ Seeded 3 loyalty test customers');
    } catch (e) {
      console.log('⚠ Loyalty tables not ready, skipping loyalty seed');
    }

    // ==================== Menu Board Brands ====================

    // Clear existing menu board data
    try {
      exec(`DELETE FROM virtual_brand_items WHERE virtual_brand_id IN (SELECT id FROM virtual_brands WHERE display_type = 'menu_board')`);
      exec(`DELETE FROM virtual_brands WHERE display_type = 'menu_board'`);
      exec(`DELETE FROM delivery_platforms WHERE name = 'menu_board'`);
    } catch (e) {
      // Tables or columns may not exist yet
    }

    // Insert a menu_board pseudo-platform (0% commission) to satisfy the FK
    const mbPlatform = run('INSERT INTO delivery_platforms (name, display_name, commission_percent, active) VALUES (?, ?, ?, 1)',
      ['menu_board', 'Menu Board', 0]);
    const menuBoardPlatformId = mbPlatform.lastInsertRowid;

    // Create Main Kitchen brand
    const mainBrand = run(`INSERT INTO virtual_brands (name, platform_id, description, display_type, primary_color, secondary_color, font_family, dark_bg, slug, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      ['Main Kitchen', menuBoardPlatformId, 'Full menu — burgers, mains, sandwiches & more',
       'menu_board', '#0d9488', '#fbbf24', 'system-ui, -apple-system, sans-serif', '#0a0a0a', 'main-kitchen']);
    const mainBrandId = mainBrand.lastInsertRowid;

    // Create Express Lunch brand
    const lunchBrand = run(`INSERT INTO virtual_brands (name, platform_id, description, display_type, primary_color, secondary_color, font_family, dark_bg, slug, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      ['Express Lunch', menuBoardPlatformId, 'Quick bites — sandwiches, salads & sides',
       'menu_board', '#2563eb', '#e8c88a', "'Oswald', 'Montserrat', sans-serif", '#0f172a', 'express-lunch']);
    const lunchBrandId = lunchBrand.lastInsertRowid;

    // Ensure POS visibility for both brands
    run('UPDATE virtual_brands SET show_in_pos = 1 WHERE id IN (?, ?)', [mainBrandId, lunchBrandId]);

    console.log('✓ Seeded 2 menu board brands');

    // Query actual menu item IDs (don't hardcode — IDs vary on re-seed)
    const { all: allFn } = await import('./db/index.js');
    const allItems = allFn('SELECT id, name FROM menu_items ORDER BY id');
    const itemByName = Object.fromEntries(allItems.map(i => [i.name, i.id]));

    // Assign ALL menu items to Main Kitchen
    for (const item of allItems) {
      run('INSERT INTO virtual_brand_items (virtual_brand_id, menu_item_id, active) VALUES (?, ?, 1)',
        [mainBrandId, item.id]);
    }

    console.log(`✓ Assigned ${allItems.length} items to Main Kitchen brand`);

    // Assign curated subset to Express Lunch (sandwiches, salads, sides, drinks)
    const expressLunchNames = [
      'Club Sandwich', 'Grilled Cheese', 'Chicken Wrap', 'BLT',
      'Caesar Salad', 'Garden Salad', 'Grilled Chicken Salad',
      'French Fries', 'Rice & Beans',
      'Fresh Lemonade', 'Iced Tea', 'Soda', 'Water',
    ];

    let lunchCount = 0;
    for (const name of expressLunchNames) {
      const id = itemByName[name];
      if (id) {
        run('INSERT INTO virtual_brand_items (virtual_brand_id, menu_item_id, active) VALUES (?, ?, 1)',
          [lunchBrandId, id]);
        lunchCount++;
      }
    }

    console.log(`✓ Assigned ${lunchCount} items to Express Lunch brand`);

    saveDbSync(); // Flush to disk immediately
    console.log('\n✅ Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
})();
