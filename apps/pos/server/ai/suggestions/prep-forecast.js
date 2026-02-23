import { all, get } from '../../db/index.js';

/**
 * Generate prep forecast for a given date.
 * Uses day-of-week hourly patterns + velocity data + menu_item_ingredients
 * to predict next-day ingredient needs.
 */
export async function generatePrepForecast(targetDate) {
  const target = new Date(targetDate + 'T12:00:00');
  const dayOfWeek = target.getDay(); // 0=Sunday

  // Get average order count for this day of week from hourly snapshots
  const dayStats = await get(`
    SELECT
      AVG(order_count) as avg_orders_per_hour,
      SUM(order_count) as total_orders,
      COUNT(*) as snapshot_count
    FROM ai_hourly_snapshots
    WHERE day_of_week = $1
  `, [dayOfWeek]);

  // Estimate total orders for the target day
  // Use average orders per hour * operating hours (assume 12 hours)
  const avgOrdersPerHour = dayStats?.avg_orders_per_hour || 0;
  const estimatedOrders = Math.ceil(avgOrdersPerHour * 12);

  // Get all inventory items with their ingredient mappings
  const ingredients = await all(`
    SELECT
      ii.id as inventory_item_id,
      ii.name as item_name,
      ii.unit,
      ii.quantity as current_stock,
      ii.low_stock_threshold,
      mii.menu_item_id,
      mii.quantity_used as qty_per_menu_item,
      mi.name as menu_item_name
    FROM inventory_items ii
    JOIN menu_item_ingredients mii ON ii.id = mii.inventory_item_id
    JOIN menu_items mi ON mii.menu_item_id = mi.id
    WHERE mi.active = true
    ORDER BY ii.name
  `);

  // Get velocity data for each inventory item on this day of week
  const velocityByItem = {};
  const velocityData = await all(`
    SELECT
      inventory_item_id,
      AVG(quantity_used) as avg_usage,
      MAX(quantity_used) as max_usage,
      COUNT(*) as data_points
    FROM ai_inventory_velocity
    WHERE EXTRACT(DOW FROM date)::int = $1
      AND date >= NOW() - INTERVAL '28 days'
    GROUP BY inventory_item_id
  `, [dayOfWeek]);

  for (const v of velocityData) {
    velocityByItem[v.inventory_item_id] = v;
  }

  // Aggregate ingredient needs
  const itemNeeds = {};

  for (const ing of ingredients) {
    if (!itemNeeds[ing.inventory_item_id]) {
      itemNeeds[ing.inventory_item_id] = {
        inventory_item_id: ing.inventory_item_id,
        item_name: ing.item_name,
        unit: ing.unit,
        current_stock: ing.current_stock,
        low_stock_threshold: ing.low_stock_threshold,
        expected_quantity_needed: 0,
        menu_items_using: [],
      };
    }

    // Get average sales for this menu item on this day of week
    const menuItemSales = await get(`
      SELECT AVG(daily_qty) as avg_qty FROM (
        SELECT o.created_at::date as sale_date, SUM(oi.quantity) as daily_qty
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.menu_item_id = $1
          AND EXTRACT(DOW FROM o.created_at)::int = $2
          AND o.created_at >= NOW() - INTERVAL '28 days'
          AND o.status != 'cancelled'
        GROUP BY o.created_at::date
      ) sub
    `, [ing.menu_item_id, dayOfWeek]);

    const avgMenuItemQty = menuItemSales?.avg_qty || 0;
    const ingredientNeeded = avgMenuItemQty * ing.qty_per_menu_item;

    itemNeeds[ing.inventory_item_id].expected_quantity_needed += ingredientNeeded;
    itemNeeds[ing.inventory_item_id].menu_items_using.push({
      menu_item_name: ing.menu_item_name,
      avg_sold: Math.round(avgMenuItemQty * 100) / 100,
      ingredient_per_item: ing.qty_per_menu_item,
    });
  }

  // Build forecast results
  const forecast = Object.values(itemNeeds).map(item => {
    // Cross-reference with velocity data for this day of week
    const velocity = velocityByItem[item.inventory_item_id];
    const velocityEstimate = velocity?.avg_usage || 0;

    // Use the higher of menu-item-based estimate and velocity-based estimate
    const expectedNeed = Math.max(
      Math.round(item.expected_quantity_needed * 100) / 100,
      Math.round(velocityEstimate * 100) / 100
    );

    const deficit = Math.round((expectedNeed - item.current_stock) * 100) / 100;

    let prep_action = 'sufficient';
    if (deficit > 0) {
      prep_action = 'restock_needed';
    } else if (item.current_stock - expectedNeed < item.low_stock_threshold) {
      prep_action = 'prep_extra';
    }

    return {
      inventory_item_id: item.inventory_item_id,
      item_name: item.item_name,
      unit: item.unit,
      expected_quantity_needed: expectedNeed,
      current_stock: item.current_stock,
      deficit: Math.max(0, deficit),
      prep_action,
      menu_items_using: item.menu_items_using,
      velocity_estimate: Math.round(velocityEstimate * 100) / 100,
    };
  });

  // Sort: restock_needed first, then prep_extra, then sufficient
  const actionOrder = { restock_needed: 0, prep_extra: 1, sufficient: 2 };
  forecast.sort((a, b) => (actionOrder[a.prep_action] ?? 3) - (actionOrder[b.prep_action] ?? 3));

  return {
    target_date: targetDate,
    day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek],
    estimated_orders: estimatedOrders,
    items: forecast,
  };
}
