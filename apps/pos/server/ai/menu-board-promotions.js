import { all } from '../db/index.js';

const BADGE_PRIORITY = { bestseller: 1, 'popular-now': 2, 'chef-pick': 3, 'try-it': 4 };
const BADGE_LABELS = {
  bestseller: 'Bestseller',
  'popular-now': 'Popular Now',
  'chef-pick': "Chef's Pick",
  'try-it': 'Try It!',
};

/**
 * Compute promotion badges for a set of menu item IDs.
 * Returns a Map<itemId, Badge[]> where each badge has { type, label, priority }.
 * Max 2 badges per item. Bestseller takes priority over popular-now.
 */
export function computePromotionBadges(itemIds) {
  if (!itemIds || itemIds.length === 0) return new Map();

  const badges = new Map(); // itemId -> Badge[]
  const addBadge = (itemId, type) => {
    if (!itemIds.includes(itemId)) return;
    const existing = badges.get(itemId) || [];
    if (existing.length >= 2) return;
    if (existing.some(b => b.type === type)) return;
    // bestseller and popular-now are mutually exclusive — bestseller wins
    if (type === 'popular-now' && existing.some(b => b.type === 'bestseller')) return;
    if (type === 'bestseller') {
      const idx = existing.findIndex(b => b.type === 'popular-now');
      if (idx !== -1) existing.splice(idx, 1);
    }
    existing.push({ type, label: BADGE_LABELS[type], priority: BADGE_PRIORITY[type] });
    existing.sort((a, b) => a.priority - b.priority);
    badges.set(itemId, existing);
  };

  // 1) Bestseller — top 5 by 30-day order volume
  try {
    const bestsellers = all(`
      SELECT oi.menu_item_id, SUM(oi.quantity) as total_qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.created_at >= datetime('now', '-30 days')
        AND o.status NOT IN ('cancelled')
        AND oi.menu_item_id IS NOT NULL
      GROUP BY oi.menu_item_id
      ORDER BY total_qty DESC
      LIMIT 5
    `);
    for (const row of bestsellers) {
      addBadge(row.menu_item_id, 'bestseller');
    }
  } catch { /* no order data yet */ }

  // 2) Popular Now — top 3 for current hour + day-of-week historically
  try {
    const now = new Date();
    const hour = now.getHours();
    const dow = now.getDay(); // 0=Sunday
    const popularNow = all(`
      SELECT oi.menu_item_id, SUM(oi.quantity) as total_qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE CAST(strftime('%H', o.created_at) AS INTEGER) = ?
        AND CAST(strftime('%w', o.created_at) AS INTEGER) = ?
        AND o.status NOT IN ('cancelled')
        AND oi.menu_item_id IS NOT NULL
      GROUP BY oi.menu_item_id
      ORDER BY total_qty DESC
      LIMIT 3
    `, [hour, dow]);
    for (const row of popularNow) {
      addBadge(row.menu_item_id, 'popular-now');
    }
  } catch { /* no order data yet */ }

  // 3) Chef's Pick — highest margin % items (price - ingredient cost) / price
  try {
    const placeholders = itemIds.map(() => '?').join(',');
    const chefPicks = all(`
      SELECT
        mi.id as menu_item_id,
        mi.price,
        COALESCE(SUM(mii.quantity_used * ii.cost_price), 0) as ingredient_cost,
        CASE WHEN mi.price > 0
          THEN (mi.price - COALESCE(SUM(mii.quantity_used * ii.cost_price), 0)) / mi.price
          ELSE 0
        END as margin_pct
      FROM menu_items mi
      LEFT JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
      LEFT JOIN inventory_items ii ON mii.inventory_item_id = ii.id
      WHERE mi.id IN (${placeholders})
        AND mi.active = 1
      GROUP BY mi.id
      HAVING ingredient_cost > 0
      ORDER BY margin_pct DESC
      LIMIT 4
    `, itemIds);
    for (const row of chefPicks) {
      addBadge(row.menu_item_id, 'chef-pick');
    }
  } catch { /* no ingredient data */ }

  // 4) Try It! — items with excess inventory (ingredients well above threshold)
  try {
    const excessIngredients = all(`
      SELECT id, name, quantity, low_stock_threshold
      FROM inventory_items
      WHERE low_stock_threshold > 0
        AND quantity > (low_stock_threshold * 3)
    `);

    if (excessIngredients.length > 0) {
      const excessIds = excessIngredients.map(i => i.id);
      const excessPlaceholders = excessIds.map(() => '?').join(',');
      const itemPlaceholders = itemIds.map(() => '?').join(',');
      const tryItems = all(`
        SELECT DISTINCT mii.menu_item_id
        FROM menu_item_ingredients mii
        JOIN menu_items mi ON mi.id = mii.menu_item_id
        WHERE mii.inventory_item_id IN (${excessPlaceholders})
          AND mi.id IN (${itemPlaceholders})
          AND mi.active = 1
        LIMIT 3
      `, [...excessIds, ...itemIds]);
      for (const row of tryItems) {
        addBadge(row.menu_item_id, 'try-it');
      }
    }
  } catch { /* no inventory data */ }

  return badges;
}
