import { all, get } from '../../db.js';

/**
 * Predict stockouts and suggest reorder quantities using velocity data.
 */
export function generateInventoryForecast() {
  const forecasts = [];

  // Get all inventory items
  const items = all(`
    SELECT id, name, quantity, unit, low_stock_threshold, category
    FROM inventory_items
    ORDER BY name
  `);

  for (const item of items) {
    // Get avg daily consumption over last 7 days
    const velocity = get(`
      SELECT
        AVG(quantity_used) as avg_daily_usage,
        MAX(quantity_used) as max_daily_usage,
        COUNT(*) as data_days
      FROM ai_inventory_velocity
      WHERE inventory_item_id = ?
        AND date >= DATE('now', '-7 days', 'localtime')
    `, [item.id]);

    const avgDaily = velocity?.avg_daily_usage || 0;
    const maxDaily = velocity?.max_daily_usage || 0;
    const dataDays = velocity?.data_days || 0;

    if (avgDaily <= 0) {
      forecasts.push({
        inventory_item_id: item.id,
        name: item.name,
        current_quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        avg_daily_usage: 0,
        days_until_stockout: null,
        days_until_low: null,
        suggested_reorder_qty: null,
        risk_level: 'unknown',
        data_days: dataDays,
        message: 'Insufficient data for forecast',
      });
      continue;
    }

    // Calculate days until stockout and low stock
    const daysUntilStockout = Math.floor(item.quantity / avgDaily);
    const daysUntilLow = Math.floor((item.quantity - item.low_stock_threshold) / avgDaily);

    // Use max daily for conservative estimate
    const conservativeDays = maxDaily > 0 ? Math.floor(item.quantity / maxDaily) : daysUntilStockout;

    // Suggested reorder: 5 days of max usage or 7 days of average, whichever is more
    const suggestedQty = Math.max(
      Math.ceil(maxDaily * 5),
      Math.ceil(avgDaily * 7)
    );

    // Risk assessment
    let riskLevel = 'low';
    if (daysUntilStockout <= 1) riskLevel = 'critical';
    else if (daysUntilStockout <= 3) riskLevel = 'high';
    else if (daysUntilLow <= 2) riskLevel = 'medium';

    // Get last restock info
    const lastRestock = get(`
      SELECT quantity_added, created_at
      FROM ai_restock_log
      WHERE inventory_item_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [item.id]);

    forecasts.push({
      inventory_item_id: item.id,
      name: item.name,
      current_quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      low_stock_threshold: item.low_stock_threshold,
      avg_daily_usage: Math.round(avgDaily * 100) / 100,
      max_daily_usage: Math.round(maxDaily * 100) / 100,
      days_until_stockout: daysUntilStockout,
      days_until_low: Math.max(0, daysUntilLow),
      conservative_days: conservativeDays,
      suggested_reorder_qty: suggestedQty,
      risk_level: riskLevel,
      data_days: dataDays,
      last_restock: lastRestock ? {
        quantity: lastRestock.quantity_added,
        date: lastRestock.created_at,
      } : null,
    });
  }

  // Sort by risk level
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, unknown: 4 };
  forecasts.sort((a, b) => (riskOrder[a.risk_level] || 4) - (riskOrder[b.risk_level] || 4));

  return forecasts;
}
