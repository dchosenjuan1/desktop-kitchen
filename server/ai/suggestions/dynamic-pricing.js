import { all, get } from '../../db.js';
import { isRushHour, isSlowHour, getConfigBool } from '../config.js';

/**
 * Generate dynamic pricing suggestions based on traffic patterns.
 *
 * Rules:
 * - Rush + >150% avg orders → suggest 5-10% markup on combos (manager-only, never auto-applied)
 * - Slow + <50% avg orders → suggest Happy Hour discounts
 * - All changes require manager approval
 */
export function generatePricingSuggestions() {
  if (!getConfigBool('dynamic_pricing_enabled')) return [];

  const suggestions = [];
  const currentHour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  // Get historical average for this hour/day
  const historical = get(`
    SELECT
      AVG(order_count) as avg_orders,
      AVG(revenue) as avg_revenue
    FROM ai_hourly_snapshots
    WHERE day_of_week = ?
      AND CAST(SUBSTR(snapshot_hour, 12, 2) AS INTEGER) = ?
  `, [dayOfWeek, currentHour]);

  const avgOrders = historical?.avg_orders || 0;

  // Get current hour's orders
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  const startStr = hourStart.toISOString().replace('T', ' ').slice(0, 19);

  const currentStats = get(`
    SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE created_at >= ? AND status != 'cancelled'
  `, [startStr]);

  const currentOrders = currentStats?.order_count || 0;

  // Rush hour + high traffic → suggest markup
  if (isRushHour(currentHour) && avgOrders > 0 && currentOrders > avgOrders * 1.5) {
    const combos = all(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      JOIN ai_category_roles acr ON mi.category_id = acr.category_id
      WHERE acr.role = 'combo' AND mi.active = 1
    `);

    for (const combo of combos) {
      const markupPercent = Math.min(10, Math.round((currentOrders / avgOrders - 1) * 10));
      const suggestedPrice = Math.round(combo.price * (1 + markupPercent / 100));

      suggestions.push({
        id: `rush-markup-${combo.id}`,
        type: 'markup',
        menu_item_id: combo.id,
        item_name: combo.name,
        current_price: combo.price,
        suggested_price: suggestedPrice,
        change_percent: markupPercent,
        reason: `Rush hour traffic ${Math.round((currentOrders / avgOrders) * 100)}% of average`,
        requires_approval: true,
        auto_revert_hours: 2,
      });
    }
  }

  // Slow period + low traffic → suggest discounts
  if (isSlowHour(currentHour) && avgOrders > 0 && currentOrders < avgOrders * 0.5) {
    const discountItems = all(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      JOIN ai_category_roles acr ON mi.category_id = acr.category_id
      WHERE acr.role IN ('combo', 'main') AND mi.active = 1
      ORDER BY mi.price DESC
      LIMIT 5
    `);

    for (const item of discountItems) {
      const discountPercent = 10;
      const suggestedPrice = Math.round(item.price * (1 - discountPercent / 100));

      suggestions.push({
        id: `slow-discount-${item.id}`,
        type: 'discount',
        menu_item_id: item.id,
        item_name: item.name,
        current_price: item.price,
        suggested_price: suggestedPrice,
        change_percent: -discountPercent,
        reason: `Slow period - traffic at ${Math.round((currentOrders / Math.max(avgOrders, 1)) * 100)}% of average`,
        requires_approval: true,
        auto_revert_hours: 2,
      });
    }
  }

  return suggestions;
}
