import { all, get } from '../db/index.js';

/**
 * Gather tenant-scoped context data for the AI assistant.
 * Each question type queries different domain data to provide relevant context.
 * Queries use LIMIT for token efficiency.
 */
export async function gatherContext(questionType) {
  switch (questionType) {
    case 'ingredient_ideas':
      return gatherIngredientIdeas();
    case 'combo_ideas':
      return gatherComboIdeas();
    case 'customer_persona':
      return gatherCustomerPersona();
    case 'delivery_promo':
      return gatherDeliveryPromo();
    case 'prep_timing':
      return gatherPrepTiming();
    case 'closing_time':
      return gatherClosingTime();
    case 'top_ingredient':
      return gatherTopIngredient();
    case 'waste_reduction':
      return gatherWasteReduction();
    case 'pricing_review':
      return gatherPricingReview();
    case 'menu_optimization':
      return gatherMenuOptimization();
    case 'employee_scheduling':
      return gatherEmployeeScheduling();
    case 'inventory_reorder':
      return gatherInventoryReorder();
    case 'loyalty_insights':
      return gatherLoyaltyInsights();
    case 'upsell_suggestions':
      return gatherUpsellSuggestions();
    case 'profit_margins':
      return gatherProfitMargins();
    case 'custom':
    default:
      return gatherCustomOverview();
  }
}

async function gatherIngredientIdeas() {
  const [inventory, menuItems] = await Promise.all([
    all(`SELECT name, quantity, unit, category FROM inventory_items WHERE quantity > 0 ORDER BY quantity DESC LIMIT 40`),
    all(`SELECT mi.name, mi.price, mc.name as category FROM menu_items mi JOIN menu_categories mc ON mi.category_id = mc.id WHERE mi.active = true LIMIT 30`),
  ]);
  return { inventory, menuItems };
}

async function gatherComboIdeas() {
  const [menuItems, topPairs, orderVolume] = await Promise.all([
    all(`SELECT mi.name, mi.price, mc.name as category FROM menu_items mi JOIN menu_categories mc ON mi.category_id = mc.id WHERE mi.active = true ORDER BY mi.price DESC LIMIT 30`),
    all(`SELECT item_a_name, item_b_name, pair_count FROM ai_item_pairs ORDER BY pair_count DESC LIMIT 15`),
    get(`SELECT COUNT(*) as total_orders, COALESCE(AVG(total), 0) as avg_ticket FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'`),
  ]);
  return { menuItems, topPairs, orderVolume };
}

async function gatherCustomerPersona() {
  const [loyaltySummary, orderPatterns, topItems] = await Promise.all([
    get(`SELECT COUNT(*) as total_customers, COALESCE(AVG(total_spent), 0) as avg_spent, COALESCE(AVG(orders_count), 0) as avg_orders FROM loyalty_customers`),
    all(`SELECT EXTRACT(HOUR FROM created_at)::int as hour, EXTRACT(DOW FROM created_at)::int as day_of_week, COUNT(*) as orders FROM orders WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY hour, day_of_week ORDER BY orders DESC LIMIT 20`),
    all(`SELECT oi.item_name, SUM(oi.quantity) as qty_sold, SUM(oi.unit_price * oi.quantity) as revenue FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.created_at >= NOW() - INTERVAL '30 days' GROUP BY oi.item_name ORDER BY qty_sold DESC LIMIT 15`),
  ]);
  return { loyaltySummary, orderPatterns, topItems };
}

async function gatherDeliveryPromo() {
  const [menuItems, deliveryOrders] = await Promise.all([
    all(`SELECT mi.name, mi.price, mc.name as category FROM menu_items mi JOIN menu_categories mc ON mi.category_id = mc.id WHERE mi.active = true ORDER BY mi.price LIMIT 30`),
    all(`SELECT dp.display_name as platform, COUNT(*) as order_count, COALESCE(SUM(dp.commission_percent), 0) as avg_commission FROM delivery_orders do2 JOIN delivery_platforms dp ON do2.platform_id = dp.id WHERE do2.created_at >= NOW() - INTERVAL '30 days' GROUP BY dp.display_name LIMIT 10`),
  ]);
  return { menuItems, deliveryOrders };
}

async function gatherPrepTiming() {
  const [hourlySnapshots, menuItems] = await Promise.all([
    all(`SELECT snapshot_hour, order_count, revenue, day_of_week FROM ai_hourly_snapshots ORDER BY snapshot_hour DESC LIMIT 50`),
    all(`SELECT name, prep_time_minutes FROM menu_items WHERE active = true AND prep_time_minutes IS NOT NULL ORDER BY prep_time_minutes DESC LIMIT 20`),
  ]);
  return { hourlySnapshots, menuItems };
}

async function gatherClosingTime() {
  const hourlyOrders = await all(`
    SELECT EXTRACT(HOUR FROM created_at)::int as hour, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
    FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY hour ORDER BY hour
  `);
  return { hourlyOrders };
}

async function gatherTopIngredient() {
  const velocityData = await all(`
    SELECT ii.name, ii.unit, ii.cost_price, COALESCE(SUM(iv.quantity_used), 0) as total_used
    FROM inventory_items ii
    LEFT JOIN ai_inventory_velocity iv ON ii.id = iv.inventory_item_id AND iv.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY ii.id, ii.name, ii.unit, ii.cost_price
    ORDER BY total_used DESC LIMIT 20
  `);
  return { velocityData };
}

async function gatherWasteReduction() {
  const [wasteLog, velocity] = await Promise.all([
    all(`SELECT ii.name, wl.reason, SUM(wl.quantity) as total_qty, SUM(wl.cost_at_time * wl.quantity) as total_cost FROM waste_log wl JOIN inventory_items ii ON wl.inventory_item_id = ii.id WHERE wl.created_at >= NOW() - INTERVAL '30 days' GROUP BY ii.name, wl.reason ORDER BY total_cost DESC LIMIT 20`),
    all(`SELECT ii.name, COALESCE(SUM(iv.quantity_used), 0) as total_used FROM inventory_items ii LEFT JOIN ai_inventory_velocity iv ON ii.id = iv.inventory_item_id AND iv.date >= CURRENT_DATE - INTERVAL '14 days' GROUP BY ii.name ORDER BY total_used DESC LIMIT 15`),
  ]);
  return { wasteLog, velocity };
}

async function gatherPricingReview() {
  const menuItemsWithCogs = await all(`
    SELECT mi.name, mi.price, mc.name as category,
      COALESCE((SELECT SUM(r.quantity_used * ii.cost_price) FROM recipes r JOIN inventory_items ii ON r.inventory_item_id = ii.id WHERE r.menu_item_id = mi.id), 0) as cogs,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.menu_item_id = mi.id AND o.created_at >= NOW() - INTERVAL '30 days'), 0) as qty_sold
    FROM menu_items mi JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mi.active = true
    ORDER BY qty_sold DESC LIMIT 30
  `);
  return { menuItemsWithCogs };
}

async function gatherMenuOptimization() {
  const menuData = await all(`
    SELECT mi.name, mi.price, mc.name as category,
      COALESCE((SELECT SUM(r.quantity_used * ii.cost_price) FROM recipes r JOIN inventory_items ii ON r.inventory_item_id = ii.id WHERE r.menu_item_id = mi.id), 0) as cogs,
      COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.menu_item_id = mi.id AND o.created_at >= NOW() - INTERVAL '30 days'), 0) as qty_sold,
      COALESCE((SELECT SUM(oi.unit_price * oi.quantity) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.menu_item_id = mi.id AND o.created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_30d
    FROM menu_items mi JOIN menu_categories mc ON mi.category_id = mc.id
    WHERE mi.active = true
    ORDER BY revenue_30d DESC LIMIT 30
  `);
  return { menuData };
}

async function gatherEmployeeScheduling() {
  const [orderPatterns, employeePerf] = await Promise.all([
    all(`SELECT EXTRACT(HOUR FROM created_at)::int as hour, EXTRACT(DOW FROM created_at)::int as day_of_week, COUNT(*) as orders FROM orders WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY hour, day_of_week ORDER BY orders DESC LIMIT 30`),
    all(`SELECT e.name, COUNT(o.id) as orders_processed, COALESCE(SUM(o.total), 0) as total_sales FROM employees e LEFT JOIN orders o ON e.id = o.employee_id AND o.created_at >= NOW() - INTERVAL '30 days' WHERE e.active = true GROUP BY e.id, e.name ORDER BY orders_processed DESC LIMIT 15`),
  ]);
  return { orderPatterns, employeePerf };
}

async function gatherInventoryReorder() {
  const lowStock = await all(`
    SELECT ii.name, ii.quantity, ii.unit, ii.low_stock_threshold, ii.cost_price,
      COALESCE((SELECT AVG(iv.quantity_used) FROM ai_inventory_velocity iv WHERE iv.inventory_item_id = ii.id AND iv.date >= CURRENT_DATE - INTERVAL '14 days'), 0) as avg_daily_usage
    FROM inventory_items ii
    WHERE ii.quantity <= ii.low_stock_threshold * 1.5
    ORDER BY (ii.quantity / GREATEST(ii.low_stock_threshold, 1)) ASC
    LIMIT 20
  `);
  return { lowStock };
}

async function gatherLoyaltyInsights() {
  const [summary, segments, stampCards] = await Promise.all([
    get(`SELECT COUNT(*) as total, SUM(CASE WHEN orders_count >= 5 THEN 1 ELSE 0 END) as repeat_customers, COALESCE(AVG(total_spent), 0) as avg_lifetime_value FROM loyalty_customers`),
    all(`SELECT CASE WHEN orders_count >= 10 THEN 'VIP' WHEN orders_count >= 5 THEN 'Regular' WHEN orders_count >= 2 THEN 'Returning' ELSE 'New' END as segment, COUNT(*) as count, COALESCE(AVG(total_spent), 0) as avg_spent FROM loyalty_customers GROUP BY segment ORDER BY avg_spent DESC`),
    get(`SELECT COUNT(*) as total_cards, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed_cards, SUM(CASE WHEN redeemed = 1 THEN 1 ELSE 0 END) as redeemed_cards FROM stamp_cards`),
  ]);
  return { summary, segments, stampCards };
}

async function gatherUpsellSuggestions() {
  const [topPairs, topItems] = await Promise.all([
    all(`SELECT item_a_name, item_b_name, pair_count FROM ai_item_pairs ORDER BY pair_count DESC LIMIT 15`),
    all(`SELECT oi.item_name, SUM(oi.quantity) as qty_sold FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.created_at >= NOW() - INTERVAL '30 days' GROUP BY oi.item_name ORDER BY qty_sold DESC LIMIT 10`),
  ]);
  return { topPairs, topItems };
}

async function gatherProfitMargins() {
  const [menuData, revenueSummary] = await Promise.all([
    all(`
      SELECT mi.name, mi.price, mc.name as category,
        COALESCE((SELECT SUM(r.quantity_used * ii.cost_price) FROM recipes r JOIN inventory_items ii ON r.inventory_item_id = ii.id WHERE r.menu_item_id = mi.id), 0) as cogs,
        COALESCE((SELECT SUM(oi.quantity) FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE oi.menu_item_id = mi.id AND o.created_at >= NOW() - INTERVAL '30 days'), 0) as qty_sold
      FROM menu_items mi JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.active = true ORDER BY qty_sold DESC LIMIT 30
    `),
    get(`SELECT COALESCE(SUM(total), 0) as total_revenue, COUNT(*) as total_orders FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'`),
  ]);
  return { menuData, revenueSummary };
}

async function gatherCustomOverview() {
  const [menuSummary, orderSummary, inventorySummary, loyaltySummary] = await Promise.all([
    get(`SELECT COUNT(*) as total_items, COUNT(DISTINCT category_id) as categories FROM menu_items WHERE active = true`),
    get(`SELECT COUNT(*) as total_orders, COALESCE(SUM(total), 0) as total_revenue, COALESCE(AVG(total), 0) as avg_ticket FROM orders WHERE created_at >= NOW() - INTERVAL '30 days'`),
    get(`SELECT COUNT(*) as total_items, SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) as low_stock_count FROM inventory_items`),
    get(`SELECT COUNT(*) as total_customers FROM loyalty_customers`),
  ]);
  return { menuSummary, orderSummary, inventorySummary, loyaltySummary };
}
