import { all, get } from '../../db/index.js';
import { isRushHour, isSlowHour, getConfigBool } from '../config.js';
import { sendMessage } from '../claude-client.js';

/**
 * Generate dynamic pricing suggestions based on traffic patterns.
 *
 * Rules:
 * - Rush + >150% avg orders → suggest 5-10% markup on combos (manager-only, never auto-applied)
 * - Slow + <50% avg orders → suggest Happy Hour discounts
 * - All changes require manager approval
 */
export async function generatePricingSuggestions() {
  if (!(await getConfigBool('dynamic_pricing_enabled'))) return [];

  const suggestions = [];
  const currentHour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  // Get historical average for this hour/day
  const historical = await get(`
    SELECT
      AVG(order_count) as avg_orders,
      AVG(revenue) as avg_revenue
    FROM ai_hourly_snapshots
    WHERE day_of_week = $1
      AND EXTRACT(HOUR FROM snapshot_hour)::int = $2
  `, [dayOfWeek, currentHour]);

  const avgOrders = historical?.avg_orders || 0;

  // Get current hour's orders
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  const startStr = hourStart.toISOString().replace('T', ' ').slice(0, 19);

  const currentStats = await get(`
    SELECT COUNT(*) as order_count, COALESCE(SUM(total), 0) as revenue
    FROM orders
    WHERE created_at >= $1 AND status != 'cancelled'
  `, [startStr]);

  const currentOrders = currentStats?.order_count || 0;

  // Rush hour + high traffic → suggest markup
  if ((await isRushHour(currentHour)) && avgOrders > 0 && currentOrders > avgOrders * 1.5) {
    const combos = await all(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      JOIN ai_category_roles acr ON mi.category_id = acr.category_id
      WHERE acr.role = 'combo' AND mi.active = true
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
        source: 'heuristic',
        confidence: 70,
      });
    }
  }

  // Slow period + low traffic → suggest discounts
  if ((await isSlowHour(currentHour)) && avgOrders > 0 && currentOrders < avgOrders * 0.5) {
    const discountItems = await all(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      JOIN ai_category_roles acr ON mi.category_id = acr.category_id
      WHERE acr.role IN ('combo', 'main') AND mi.active = true
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
        source: 'heuristic',
        confidence: 65,
      });
    }
  }

  return suggestions;
}

/**
 * Generate Grok-powered pricing analysis.
 * Sends sales data to Grok for elasticity estimates, seasonality insights, and optimal pricing.
 */
export async function generateGrokPricingAnalysis() {
  if (!(await getConfigBool('grok_api_enabled'))) {
    return { success: false, error: 'Grok API not enabled', fallback: true };
  }

  // Gather data for Grok
  const topItems = await all(`
    SELECT mi.id, mi.name, mi.price, mc.name as category_name,
      COUNT(oi.id) as total_orders,
      SUM(oi.unit_price * oi.quantity) as total_revenue,
      AVG(oi.unit_price) as avg_sold_price
    FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    LEFT JOIN order_items oi ON oi.menu_item_id = mi.id
    LEFT JOIN orders o ON oi.order_id = o.id AND o.status != 'cancelled'
      AND o.created_at >= NOW() - INTERVAL '30 days'
    WHERE mi.active = true
    GROUP BY mi.id, mi.name, mi.price, mc.name
    ORDER BY total_revenue DESC NULLS LAST
    LIMIT 20
  `);

  // Day-of-week patterns
  const dowPatterns = await all(`
    SELECT day_of_week, AVG(order_count) as avg_orders, AVG(revenue) as avg_revenue
    FROM ai_hourly_snapshots
    WHERE snapshot_hour >= NOW() - INTERVAL '30 days'
    GROUP BY day_of_week
    ORDER BY day_of_week
  `);

  // Recent price changes
  const recentChanges = await all(`
    SELECT ph.menu_item_id, mi.name, ph.old_price, ph.new_price, ph.change_percent,
      ph.revenue_before_daily, ph.revenue_after_daily, ph.source
    FROM price_history ph
    JOIN menu_items mi ON ph.menu_item_id = mi.id
    WHERE ph.created_at >= NOW() - INTERVAL '30 days' AND ph.source != 'revert'
    ORDER BY ph.created_at DESC LIMIT 10
  `);

  const systemPrompt = `You are a pricing analyst for a Mexican restaurant POS system. Currency is MXN.
Analyze the sales data and suggest optimal prices. Consider:
- Price elasticity estimates based on historical volume changes
- Day-of-week and hour-of-day demand patterns
- Item popularity and contribution to total revenue
- Items rarely ordered may be overpriced
- Combo cannibalization (combos stealing from individual items)
- Revenue impact of past price changes (if available)

Return ONLY valid JSON (no markdown, no backticks) with this structure:
{"suggestions":[{"menu_item_id":1,"item_name":"Name","current_price":100,"suggested_price":95,"confidence":85,"reasoning":"Short reason","projected_weekly_revenue_change":500,"elasticity_estimate":-1.2}]}

confidence: 0-100 (how sure you are), elasticity_estimate: negative means demand drops as price rises.
Keep suggestions to max 8 items. Only suggest changes of 5%+ to be meaningful.`;

  const prompt = `Analyze this restaurant's pricing data and suggest optimal prices:

TOP ITEMS (last 30 days):
${JSON.stringify(topItems.map(i => ({ id: i.id, name: i.name, price: parseFloat(i.price), orders: parseInt(i.total_orders) || 0, revenue: parseFloat(i.total_revenue) || 0, category: i.category_name })), null, 2)}

DAY-OF-WEEK PATTERNS:
${JSON.stringify(dowPatterns.map(d => ({ day: d.day_of_week, avg_orders: parseFloat(d.avg_orders) || 0, avg_revenue: parseFloat(d.avg_revenue) || 0 })))}

RECENT PRICE CHANGES:
${JSON.stringify(recentChanges.map(c => ({ item: c.name, old: parseFloat(c.old_price), new_price: parseFloat(c.new_price), change: parseFloat(c.change_percent), rev_before: parseFloat(c.revenue_before_daily) || null, rev_after: parseFloat(c.revenue_after_daily) || null })))}`;

  const result = await sendMessage(prompt, { systemPrompt, maxTokens: 2048, useCache: true });
  if (!result.success) {
    return { success: false, error: result.error, fallback: true };
  }

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, error: 'No JSON in response', fallback: true };
    const parsed = JSON.parse(jsonMatch[0]);
    const suggestions = (parsed.suggestions || []).map(s => ({
      ...s,
      id: `grok-${s.menu_item_id}`,
      type: s.suggested_price > s.current_price ? 'markup' : 'discount',
      change_percent: ((s.suggested_price - s.current_price) / s.current_price) * 100,
      requires_approval: true,
      source: 'grok',
    }));
    return { success: true, suggestions, cached: result.cached };
  } catch (e) {
    return { success: false, error: 'Failed to parse Grok response', fallback: true };
  }
}
