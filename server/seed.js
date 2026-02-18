import { initDb, run, exec, saveDbSync } from './db.js';

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

    // Seed employees
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Manager', '1234', 'admin']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Maria', '5678', 'cashier']);
    run('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)', ['Carlos', '9012', 'cashier']);

    console.log('✓ Seeded 3 employees');

    // Seed menu categories (with printer_target)
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Burritos', 1, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Tacos', 2, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Quesadillas', 3, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Combos', 4, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Sides', 5, 'kitchen']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Drinks', 6, 'bar']);
    run('INSERT INTO menu_categories (name, sort_order, active, printer_target) VALUES (?, ?, 1, ?)', ['Beers', 7, 'bar']);

    console.log('✓ Seeded 7 menu categories');

    // Seed menu items (prices in MXN)
    // Burritos (category_id = 1)
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

    // Beers (category_id = 7)
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [7, 'Corona Extra', 65, 'Classic Mexican lager']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [7, 'Modelo Especial', 65, 'Rich pilsner-style lager']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [7, 'Negra Modelo', 70, 'Munich dunkel-style dark lager']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [7, 'Pacifico', 60, 'Light pilsner from Mazatlán']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [7, 'Victoria', 60, 'Vienna-style amber lager']);
    run('INSERT INTO menu_items (category_id, name, price, description, active) VALUES (?, ?, ?, ?, 1)', [7, 'Michelada', 90, 'Beer with lime, chili, and Clamato']);

    console.log('✓ Seeded 35 menu items');

    // Seed inventory items (with cost_price)
    // cost_price = cost per unit in MXN
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['tortillas', 500, 'count', 50, 'Supplies', 3]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['carne asada', 50, 'lbs', 10, 'Meats', 180]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['carnitas', 40, 'lbs', 10, 'Meats', 150]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['al pastor', 35, 'lbs', 10, 'Meats', 140]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['chicken', 60, 'lbs', 15, 'Meats', 90]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['fish', 30, 'lbs', 5, 'Meats', 160]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['shrimp', 25, 'lbs', 5, 'Meats', 220]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['cheese', 100, 'lbs', 20, 'Dairy', 80]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['beans', 200, 'lbs', 30, 'Dry Goods', 25]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['rice', 150, 'lbs', 25, 'Dry Goods', 20]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['guacamole', 40, 'lbs', 10, 'Produce', 120]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['salsa', 80, 'lbs', 15, 'Sauces', 40]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['chips', 300, 'count', 50, 'Supplies', 5]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['lettuce', 50, 'lbs', 10, 'Produce', 30]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['tomato', 50, 'lbs', 10, 'Produce', 35]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['sour cream', 50, 'lbs', 10, 'Dairy', 60]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['french fries', 200, 'lbs', 30, 'Frozen', 35]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['onions', 100, 'lbs', 20, 'Produce', 15]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['cilantro', 30, 'lbs', 5, 'Produce', 25]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['limes', 200, 'count', 30, 'Produce', 3]);
    // Beer inventory
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['corona extra', 48, 'bottles', 12, 'Beers', 22]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['modelo especial', 48, 'bottles', 12, 'Beers', 22]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['negra modelo', 24, 'bottles', 6, 'Beers', 25]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['pacifico', 24, 'bottles', 6, 'Beers', 20]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['victoria', 24, 'bottles', 6, 'Beers', 20]);
    run('INSERT INTO inventory_items (name, quantity, unit, low_stock_threshold, category, cost_price) VALUES (?, ?, ?, ?, ?, ?)', ['clamato', 20, 'bottles', 5, 'Beers', 35]);

    console.log('✓ Seeded 26 inventory items');

    // Seed menu_item_ingredients (food items)
    // California Burrito (id=1): carne asada, tortilla, cheese, guac, sour cream
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 2, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 8, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 11, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [1, 16, 0.25]);

    // Carne Asada Burrito (id=2)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 2, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 9, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [2, 8, 0.25]);

    // Grilled Chicken Burrito (id=3)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 3, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 9, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [3, 18, 0.1]);

    // Juanberto's Special (id=4)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 4, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [4, 9, 0.25]);

    // Carnitas Burrito (id=5)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 9, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [5, 8, 0.5]);

    // Al Pastor Burrito (id=6)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 5, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 9, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 8, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [6, 11, 0.2]);

    // Bean & Cheese (id=7)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 1, 3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 5, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 18, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [7, 19, 0.05]);

    // Super Burrito (id=8)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 6, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [8, 14, 0.1]);

    // Street Tacos (id=9)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [9, 7, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [9, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [9, 20, 0.5]);

    // Fish Taco (id=10)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [10, 3, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [10, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [10, 12, 0.15]);

    // Shrimp Taco (id=11)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 5, 0.15]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 14, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 15, 0.1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [11, 8, 0.15]);

    // Cheese Quesadilla (id=12)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [12, 1, 2]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [12, 8, 0.5]);

    // Carne Asada Quesadilla (id=13)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [13, 1, 2]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [13, 8, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [13, 2, 0.25]);

    // Chicken Quesadilla (id=14)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [14, 1, 2]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [14, 8, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [14, 5, 0.25]);

    // Burrito Combo (id=15)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 2, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 1, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [15, 9, 0.25]);

    // Taco Combo (id=16)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 1, 3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 5, 0.3]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 10, 0.25]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [16, 9, 0.25]);

    // Family Pack (id=17)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 2, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 1, 8]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 10, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [17, 9, 1]);

    // Chips & Guac (id=18)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [18, 13, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [18, 11, 0.5]);

    // Rice & Beans (id=19)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [19, 10, 0.5]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [19, 9, 0.5]);

    // Nachos (id=20)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [20, 13, 1]);
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [20, 8, 0.5]);

    // Beer ingredients (1 bottle each)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [30, 21, 1]); // Corona
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [31, 22, 1]); // Modelo
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [32, 23, 1]); // Negra Modelo
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [33, 24, 1]); // Pacifico
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [34, 25, 1]); // Victoria
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [35, 22, 1]); // Michelada (uses modelo)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [35, 26, 0.25]); // Michelada (uses clamato)
    run('INSERT INTO menu_item_ingredients (menu_item_id, inventory_item_id, quantity_used) VALUES (?, ?, ?)', [35, 20, 1]); // Michelada (uses lime)

    console.log('✓ Seeded menu item ingredients');

    // Seed AI category roles
    exec(`DELETE FROM ai_category_roles`);
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [1, 'main']);       // Burritos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [2, 'main']);       // Tacos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [3, 'main']);       // Quesadillas
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [4, 'combo']);      // Combos
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [5, 'side']);       // Sides
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [6, 'drink']);      // Drinks
    run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [7, 'drink']);      // Beers

    console.log('✓ Seeded 7 AI category roles');

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

    // Seed modifier groups (Phase 3)
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Protein', 'single', 1, 1, 1, 1]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Salsa', 'multi', 0, 0, 3, 2]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Add-Ons', 'multi', 0, 0, 5, 3]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Size', 'single', 0, 0, 1, 4]);
    run('INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)', ['Tortilla', 'single', 0, 0, 1, 5]);

    // Protein modifiers (group_id=1)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Carne Asada', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Chicken', 0, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Carnitas', 0, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Al Pastor', 0, 4]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Fish', 15, 5]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [1, 'Shrimp', 25, 6]);

    // Salsa modifiers (group_id=2)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Salsa Roja', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Salsa Verde', 0, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Pico de Gallo', 0, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [2, 'Chipotle Crema', 10, 4]);

    // Add-Ons (group_id=3)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Extra Guacamole', 30, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Extra Cheese', 15, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Sour Cream', 10, 3]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'Jalapeños', 0, 4]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [3, 'French Fries', 20, 5]);

    // Size (group_id=4)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [4, 'Regular', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [4, 'Large (+$30)', 30, 2]);

    // Tortilla (group_id=5)
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [5, 'Flour Tortilla', 0, 1]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [5, 'Corn Tortilla', 0, 2]);
    run('INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active) VALUES (?, ?, ?, ?, 1)', [5, 'Bowl (No Tortilla)', 0, 3]);

    // Assign modifier groups to burritos and tacos
    // Burritos get: Protein, Salsa, Add-Ons, Size, Tortilla
    for (let itemId = 1; itemId <= 8; itemId++) {
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 2, 2]); // Salsa
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 3, 3]); // Add-Ons
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 5, 5]); // Tortilla
    }
    // Tacos get: Salsa, Add-Ons
    for (let itemId = 9; itemId <= 13; itemId++) {
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 2, 2]);
      run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 3, 3]);
    }
    // Quesadillas get: Add-Ons
    for (let itemId = 12; itemId <= 14; itemId++) {
      try {
        run('INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) VALUES (?, ?, ?)', [itemId, 3, 3]);
      } catch (e) {
        // Duplicate from tacos loop for item 12-13, ignore
      }
    }

    console.log('✓ Seeded modifier groups and modifiers');

    // Seed combo definitions (Phase 3)
    run('INSERT INTO combo_definitions (name, description, combo_price, active) VALUES (?, ?, ?, 1)', ['Burrito + Beer', 'Any burrito with any beer — save $25!', 260]);
    run('INSERT INTO combo_definitions (name, description, combo_price, active) VALUES (?, ?, ?, 1)', ['Taco Tuesday', '3 tacos + a beer — save $20!', 180]);

    // Combo slots
    // Burrito + Beer (combo_id=1): slot 1 = any burrito (category 1), slot 2 = any beer (category 7)
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Choose your Burrito', 1, 1]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [1, 'Choose your Beer', 7, 2]);
    // Taco Tuesday (combo_id=2): slot 1 = street tacos (item 9), slot 2 = any beer (category 7)
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [2, 'Street Tacos (3)', null, 1]);
    run('INSERT INTO combo_slots (combo_id, slot_label, category_id, sort_order) VALUES (?, ?, ?, ?)', [2, 'Choose your Beer', 7, 2]);
    // Update slot 3 to have specific_item_id
    run('UPDATE combo_slots SET specific_item_id = ? WHERE combo_id = 2 AND sort_order = 1', [9]);

    console.log('✓ Seeded combo definitions');

    // Seed delivery platforms (Phase 5)
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
        ['5551234567', 'Maria Lopez', 'JBMR42', 7, 7, 1540, 1]);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description) VALUES (?, ?, ?, ?)',
        [1, 7, 10, 'Free item of your choice']);

      // Customer 2: Carlos Hernandez — completed card + 3 on new card
      run('INSERT INTO loyalty_customers (phone, name, referral_code, stamps_earned, orders_count, total_spent, sms_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['5559876543', 'Carlos Hernandez', 'JBCH88', 13, 13, 2890, 1]);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description, completed, completed_at) VALUES (?, ?, ?, ?, 1, datetime(\'now\',\'localtime\'))',
        [2, 10, 10, 'Free item of your choice']);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description) VALUES (?, ?, ?, ?)',
        [2, 3, 10, 'Free item of your choice']);

      // Customer 3: Ana Garcia — new customer, 2 stamps (referred by Maria)
      run('INSERT INTO loyalty_customers (phone, name, referral_code, referred_by, stamps_earned, orders_count, total_spent, sms_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ['5555551234', 'Ana Garcia', 'JBAG55', 1, 4, 2, 420, 1]);
      run('INSERT INTO stamp_cards (customer_id, stamps_earned, stamps_required, reward_description) VALUES (?, ?, ?, ?)',
        [3, 4, 10, 'Free item of your choice']);
      run('INSERT INTO referral_events (referrer_id, referee_id, referrer_stamps_added, referee_stamps_added) VALUES (?, ?, ?, ?)',
        [1, 3, 2, 2]);

      console.log('✓ Seeded 3 loyalty test customers');
    } catch (e) {
      console.log('⚠ Loyalty tables not ready, skipping loyalty seed');
    }

    saveDbSync(); // Flush to disk immediately
    console.log('\n✅ Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
})();
