import { all, get, run } from '../db/index.js';

/**
 * Capture hourly snapshot of sales data
 */
export async function captureHourlySnapshot() {
  try {
    const now = new Date();
    const hourStr = now.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const dayOfWeek = now.getDay(); // 0=Sunday

    // Check if already captured this hour
    const existing = await get(
      `SELECT id FROM ai_hourly_snapshots WHERE snapshot_hour = ?`,
      [hourStr]
    );
    if (existing) return;

    // Get the start/end of the current hour
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(now);
    hourEnd.setMinutes(59, 59, 999);

    const stats = await get(`
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(AVG(total), 0) as avg_ticket
      FROM orders
      WHERE created_at >= ? AND created_at <= ?
        AND status != 'cancelled'
    `, [hourStart.toISOString(), hourEnd.toISOString()]);

    await run(`
      INSERT INTO ai_hourly_snapshots (snapshot_hour, order_count, revenue, avg_ticket, day_of_week)
      VALUES (?, ?, ?, ?, ?)
    `, [hourStr, stats.order_count, stats.revenue, stats.avg_ticket, dayOfWeek]);

    console.log(`[AI Pipeline] Hourly snapshot captured: ${hourStr}`);
  } catch (error) {
    console.error('[AI Pipeline] Error capturing hourly snapshot:', error.message);
  }
}

/**
 * Update item pair co-occurrence data from recent orders
 */
export async function updateItemPairs() {
  try {
    // Get orders from the last 2 hours
    const recentOrders = await all(`
      SELECT DISTINCT order_id
      FROM order_items
      WHERE order_id IN (
        SELECT id FROM orders
        WHERE created_at >= NOW() - INTERVAL '2 hours'
          AND status != 'cancelled'
      )
    `);

    for (const { order_id } of recentOrders) {
      const items = await all(
        `SELECT menu_item_id FROM order_items WHERE order_id = ?`,
        [order_id]
      );

      // Generate all pairs
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = Math.min(items[i].menu_item_id, items[j].menu_item_id);
          const b = Math.max(items[i].menu_item_id, items[j].menu_item_id);

          const existing = await get(
            `SELECT id, pair_count FROM ai_item_pairs WHERE item_a_id = ? AND item_b_id = ?`,
            [a, b]
          );

          if (existing) {
            await run(
              `UPDATE ai_item_pairs SET pair_count = pair_count + 1, last_seen = NOW() WHERE id = ?`,
              [existing.id]
            );
          } else {
            await run(
              `INSERT INTO ai_item_pairs (item_a_id, item_b_id, pair_count) VALUES (?, ?, 1)`,
              [a, b]
            );
          }
        }
      }
    }

    console.log(`[AI Pipeline] Item pairs updated from ${recentOrders.length} orders`);
  } catch (error) {
    console.error('[AI Pipeline] Error updating item pairs:', error.message);
  }
}

/**
 * Update inventory velocity (daily consumption rates)
 */
export async function updateInventoryVelocity() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get today's consumption from completed orders
    const consumption = await all(`
      SELECT
        mii.inventory_item_id,
        SUM(mii.quantity_used * oi.quantity) as total_used,
        COUNT(DISTINCT oi.order_id) as orders_count
      FROM order_items oi
      JOIN menu_item_ingredients mii ON oi.menu_item_id = mii.menu_item_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at::date = ?::date
        AND o.status != 'cancelled'
      GROUP BY mii.inventory_item_id
    `, [today]);

    for (const row of consumption) {
      const existing = await get(
        `SELECT id FROM ai_inventory_velocity WHERE inventory_item_id = ? AND date = ?`,
        [row.inventory_item_id, today]
      );

      if (existing) {
        await run(
          `UPDATE ai_inventory_velocity SET quantity_used = ?, orders_count = ? WHERE id = ?`,
          [row.total_used, row.orders_count, existing.id]
        );
      } else {
        await run(
          `INSERT INTO ai_inventory_velocity (inventory_item_id, date, quantity_used, orders_count) VALUES (?, ?, ?, ?)`,
          [row.inventory_item_id, today, row.total_used, row.orders_count]
        );
      }
    }

    console.log(`[AI Pipeline] Inventory velocity updated for ${consumption.length} items`);
  } catch (error) {
    console.error('[AI Pipeline] Error updating inventory velocity:', error.message);
  }
}

/**
 * Record item pairs from a single order (fire-and-forget hook)
 */
export async function recordOrderItemPairs(orderId, tenantId) {
  try {
    // This runs outside request context (via setImmediate), so we use adminSql
    // The caller must pass tenantId for the explicit WHERE clause
    const { adminSql } = await import('../db/index.js');

    const items = await adminSql`
      SELECT menu_item_id FROM order_items WHERE order_id = ${orderId} AND tenant_id = ${tenantId}
    `;

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = Math.min(items[i].menu_item_id, items[j].menu_item_id);
        const b = Math.max(items[i].menu_item_id, items[j].menu_item_id);

        const existing = await adminSql`
          SELECT id FROM ai_item_pairs WHERE item_a_id = ${a} AND item_b_id = ${b} AND tenant_id = ${tenantId}
        `;

        if (existing.length > 0) {
          await adminSql`
            UPDATE ai_item_pairs SET pair_count = pair_count + 1, last_seen = NOW()
            WHERE id = ${existing[0].id}
          `;
        } else {
          await adminSql`
            INSERT INTO ai_item_pairs (item_a_id, item_b_id, pair_count, tenant_id)
            VALUES (${a}, ${b}, 1, ${tenantId})
          `;
        }
      }
    }
  } catch (error) {
    console.error('[AI Pipeline] Error recording item pairs:', error.message);
  }
}

/**
 * Log a restock event for pattern analysis
 */
export async function logRestockEvent(inventoryItemId, quantityBefore, quantityAdded) {
  try {
    await run(`
      INSERT INTO ai_restock_log (inventory_item_id, quantity_before, quantity_added, quantity_after)
      VALUES (?, ?, ?, ?)
    `, [inventoryItemId, quantityBefore, quantityAdded, quantityBefore + quantityAdded]);
  } catch (error) {
    console.error('[AI Pipeline] Error logging restock:', error.message);
  }
}

/**
 * Detect shrinkage patterns by analyzing inventory counts for recurring high-variance items.
 */
export async function detectShrinkagePatterns() {
  try {
    const patterns = await all(`
      SELECT
        ic.inventory_item_id,
        ii.name,
        ii.unit,
        COUNT(*) as high_variance_count,
        AVG(ic.variance) as avg_variance,
        AVG(ic.variance_percent) as avg_variance_percent,
        MIN(ic.created_at) as first_occurrence,
        MAX(ic.created_at) as last_occurrence
      FROM inventory_counts ic
      JOIN inventory_items ii ON ic.inventory_item_id = ii.id
      WHERE ABS(ic.variance_percent) > 5
        AND ic.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY ic.inventory_item_id, ii.name, ii.unit
      HAVING COUNT(*) >= 2
      ORDER BY ABS(AVG(ic.variance_percent)) DESC
    `);

    for (const pattern of patterns) {
      const existingAlert = await get(`
        SELECT id FROM shrinkage_alerts
        WHERE inventory_item_id = ? AND acknowledged = false AND alert_type = 'pattern'
      `, [pattern.inventory_item_id]);

      if (existingAlert) continue;

      const severity = Math.abs(pattern.avg_variance_percent) > 15 ? 'high' : 'medium';
      const direction = pattern.avg_variance < 0 ? 'shrinkage' : 'surplus';

      await run(`
        INSERT INTO shrinkage_alerts (inventory_item_id, alert_type, severity, message, variance_amount)
        VALUES (?, 'pattern', ?, ?, ?)
      `, [
        pattern.inventory_item_id,
        severity,
        `${pattern.name}: Recurring ${direction} pattern detected — ${pattern.high_variance_count} counts with avg ${Math.abs(pattern.avg_variance_percent).toFixed(1)}% variance in last 30 days`,
        pattern.avg_variance,
      ]);
    }

    console.log(`[AI Pipeline] Shrinkage pattern detection: ${patterns.length} items flagged`);
  } catch (error) {
    console.error('[AI Pipeline] Error detecting shrinkage patterns:', error.message);
  }
}

/**
 * Get top item pairs for analysis
 */
export async function getTopItemPairs(limit = 20) {
  return await all(`
    SELECT
      aip.item_a_id, aip.item_b_id, aip.pair_count, aip.last_seen,
      ma.name as item_a_name, mb.name as item_b_name
    FROM ai_item_pairs aip
    JOIN menu_items ma ON aip.item_a_id = ma.id
    JOIN menu_items mb ON aip.item_b_id = mb.id
    ORDER BY aip.pair_count DESC
    LIMIT ?
  `, [limit]);
}
