import { all, get, run } from '../../db/index.js';

/**
 * Analyze waste patterns and generate waste_alert suggestions.
 * Runs daily for each tenant.
 */
export async function analyzeWastePatterns() {
  try {
    // Step 1 — Load last 30 days of waste grouped by item
    const wasteByItem = await all(`
      SELECT
        wl.inventory_item_id,
        ii.name,
        ii.unit,
        SUM(wl.quantity) as total_waste_qty,
        SUM(wl.cost_at_time) as total_waste_cost,
        COUNT(*) as entry_count,
        MODE() WITHIN GROUP (ORDER BY wl.reason) as top_reason
      FROM waste_log wl
      JOIN inventory_items ii ON wl.inventory_item_id = ii.id
      WHERE wl.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY wl.inventory_item_id, ii.name, ii.unit
      HAVING SUM(wl.quantity) > 0
    `);

    if (wasteByItem.length === 0) return [];

    const suggestions = [];

    for (const item of wasteByItem) {
      // Step 2 — Get units sold from ai_inventory_velocity
      const velocityRow = await get(`
        SELECT COALESCE(SUM(quantity_used), 0) as total_used
        FROM ai_inventory_velocity
        WHERE inventory_item_id = $1
          AND date >= NOW() - INTERVAL '30 days'
      `, [item.inventory_item_id]);

      const totalUsed = Number(velocityRow?.total_used || 0);
      const totalWaste = Number(item.total_waste_qty);

      // Step 3 — Compute waste rate
      const denominator = totalUsed + totalWaste;
      if (denominator <= 0) continue;
      const wasteRate = totalWaste / denominator;

      // Step 4 — Only flag items with > 15% waste rate
      if (wasteRate <= 0.15) continue;

      const wastePercent = Math.round(wasteRate * 1000) / 10; // e.g., 23.5
      const topReason = item.top_reason;
      let message = '';
      let recommendedAction = '';

      if (topReason === 'spoilage') {
        message = `${item.name}: ${wastePercent}% de merma por descomposición en 30 días. Considera reducir el nivel de par.`;
        recommendedAction = 'Reducir nivel de par y pedir cantidades más pequeñas';
      } else if (topReason === 'prep_error') {
        message = `${item.name}: ${wastePercent}% de merma por errores de preparación. Revisa las fichas técnicas con el equipo.`;
        recommendedAction = 'Capacitación del equipo y revisión de fichas técnicas';
      } else if (topReason === 'expired') {
        message = `${item.name}: ${wastePercent}% de merma por producto caducado. Implementa PEPS y reduce cantidades de pedido.`;
        recommendedAction = 'Implementar PEPS (primeras entradas, primeras salidas) y pedir menos';
      } else {
        message = `${item.name}: ${wastePercent}% de merma en los últimos 30 días. Revisa el manejo de este ingrediente.`;
        recommendedAction = 'Revisar proceso de almacenamiento y manejo';
      }

      const priority = wasteRate > 0.30 ? 90 : 70;

      // Step 5 — Upsert into ai_suggestion_cache
      const suggestionData = JSON.stringify({
        inventory_item_id: item.inventory_item_id,
        item_name: item.name,
        waste_rate: wastePercent,
        total_waste_cost: Number(item.total_waste_cost),
        top_reason: topReason,
        message,
        recommended_action: recommendedAction,
      });

      await run(`
        INSERT INTO ai_suggestion_cache (suggestion_type, trigger_context, suggestion_data, priority, expires_at)
        VALUES ('waste_alert', $1, $2, $3, NOW() + INTERVAL '24 hours')
        ON CONFLICT (tenant_id, suggestion_type, trigger_context)
        DO UPDATE SET suggestion_data = $2, expires_at = NOW() + INTERVAL '24 hours', priority = $3
      `, [String(item.inventory_item_id), suggestionData, priority]);

      suggestions.push({
        inventory_item_id: item.inventory_item_id,
        item_name: item.name,
        waste_rate: wastePercent,
        priority,
      });
    }

    console.log(`[AI Waste] Analyzed ${wasteByItem.length} items, generated ${suggestions.length} waste alerts`);
    return suggestions;
  } catch (error) {
    // Don't fail if waste_log table doesn't exist yet
    if (error.code === '42P01') {
      return [];
    }
    console.error('[AI Waste] Error analyzing waste patterns:', error.message);
    return [];
  }
}
