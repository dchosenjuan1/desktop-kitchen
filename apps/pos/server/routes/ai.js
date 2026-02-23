import { Router } from 'express';
import { run, all, get } from '../db/index.js';
import { getCartSuggestions, getInventoryPush } from '../ai/heuristics.js';
import { getAllConfig, setConfig, setMultipleConfig, getConfigNumber } from '../ai/config.js';
import { readSuggestions } from '../ai/cache.js';
import { getAIStatus } from '../ai/index.js';
import { getTopItemPairs } from '../ai/data-pipeline.js';
import { generatePricingSuggestions } from '../ai/suggestions/dynamic-pricing.js';
import { generateInventoryForecast } from '../ai/suggestions/inventory-forecast.js';
import { getGrokStats, analyzeUpsellPatterns, analyzeInventoryTrends, enhanceForecast } from '../ai/claude-client.js';
import { getConfigBool } from '../ai/config.js';
import { requireAuth } from '../middleware/auth.js';
import { generatePrepForecast } from '../ai/suggestions/prep-forecast.js';
import { getPlanLimits } from '../planLimits.js';

const router = Router();

const MOCK_ANALYSIS = {
  upsell: {
    patterns: [{ items: ['French Fries', 'Classic Burger'], confidence: 0.87, potential_daily_revenue: 45 }],
    recommendation: 'Suggest French Fries with every Classic Burger order',
  },
  inventory: {
    recommendation: 'Order 15% more chicken breast on Fridays based on historical demand',
    trends: [{ item: 'Chicken Breast', day: 'Friday', increase_pct: 15 }],
  },
  forecast: {
    high_demand: ['Classic Burger', 'Nachos Supreme', 'Chicken Tacos'],
    recommendation: "Tomorrow's projected high-demand items based on day-of-week patterns",
  },
  mock: true,
  timestamp: new Date().toISOString(),
};

// ==================== Suggestion Endpoints ====================

// GET /api/ai/suggestions/cart?items=1,3,7&hour=14
router.get('/suggestions/cart', async (req, res) => {
  try {
    const itemsParam = req.query.items;
    const hour = req.query.hour ? parseInt(req.query.hour) : new Date().getHours();

    if (!itemsParam) {
      return res.json([]);
    }

    const itemIds = itemsParam.split(',').map(Number).filter(n => !isNaN(n));
    if (itemIds.length === 0) {
      return res.json([]);
    }

    const maxSuggestions = await getConfigNumber('max_suggestions_per_order') || 2;
    const suggestions = await getCartSuggestions(itemIds, hour);

    res.json(suggestions.slice(0, maxSuggestions));
  } catch (error) {
    console.error('Error getting cart suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// GET /api/ai/suggestions/inventory-push
router.get('/suggestions/inventory-push', async (req, res) => {
  try {
    const result = await getInventoryPush();
    res.json(result);
  } catch (error) {
    console.error('Error getting inventory push:', error);
    res.status(500).json({ error: 'Failed to get inventory push data' });
  }
});

// POST /api/ai/suggestions/feedback
router.post('/suggestions/feedback', async (req, res) => {
  try {
    const { suggestion_type, suggestion_data, action, employee_id, order_id } = req.body;

    if (!suggestion_type || !action) {
      return res.status(400).json({ error: 'Missing suggestion_type or action' });
    }

    if (!['accepted', 'dismissed'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accepted" or "dismissed"' });
    }

    await run(`
      INSERT INTO ai_suggestion_events (suggestion_type, suggestion_data, action, employee_id, order_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      suggestion_type,
      suggestion_data ? JSON.stringify(suggestion_data) : null,
      action,
      employee_id || null,
      order_id || null,
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording suggestion feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// ==================== Config Endpoints ====================

// GET /api/ai/config
router.get('/config', async (req, res) => {
  try {
    const config = await getAllConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting AI config:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// PUT /api/ai/config
router.put('/config', requireAuth('manage_ai'), async (req, res) => {
  try {
    // Only Pro plan can modify AI config
    const plan = req.tenant?.plan || 'trial';
    const limits = getPlanLimits(plan);
    if (limits.ai.mode !== 'full') {
      return res.status(403).json({ error: 'AI configuration requires the Pro plan', upgrade: true });
    }

    const { entries } = req.body;

    if (entries && Array.isArray(entries)) {
      await setMultipleConfig(entries);
    } else if (req.body.key && req.body.value !== undefined) {
      await setConfig(req.body.key, req.body.value, req.body.description);
    } else {
      return res.status(400).json({ error: 'Missing config data' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// ==================== Analytics & Insights Endpoints ====================

// GET /api/ai/insights
router.get('/insights', async (req, res) => {
  try {
    // Aggregate insights from various sources
    const inventoryPush = await getInventoryPush();
    const topPairs = await getTopItemPairs(10);

    // Get suggestion effectiveness
    const totalSuggestions = (await get(`
      SELECT COUNT(*) as total FROM ai_suggestion_events
    `))?.total || 0;

    const acceptedSuggestions = (await get(`
      SELECT COUNT(*) as total FROM ai_suggestion_events WHERE action = 'accepted'
    `))?.total || 0;

    const acceptanceRate = totalSuggestions > 0
      ? Math.round((acceptedSuggestions / totalSuggestions) * 100)
      : 0;

    // Get recent hourly snapshots
    const recentSnapshots = await all(`
      SELECT snapshot_hour, order_count, revenue, avg_ticket, day_of_week
      FROM ai_hourly_snapshots
      ORDER BY snapshot_hour DESC
      LIMIT 24
    `);

    res.json({
      inventory: {
        pushItems: inventoryPush.pushItems?.length || 0,
        avoidItems: inventoryPush.avoidItems?.length || 0,
        lowIngredients: inventoryPush.lowIngredients?.length || 0,
      },
      suggestions: {
        totalEvents: totalSuggestions,
        accepted: acceptedSuggestions,
        acceptanceRate,
      },
      topItemPairs: topPairs,
      recentSnapshots,
      grokStats: getGrokStats(),
      aiStatus: getAIStatus(),
    });
  } catch (error) {
    console.error('Error getting AI insights:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// GET /api/ai/analytics
router.get('/analytics', async (req, res) => {
  try {
    const period = req.query.period || 'week';
    let dateFilter;

    switch (period) {
      case 'today':
        dateFilter = `created_at::date = CURRENT_DATE`;
        break;
      case 'week':
        dateFilter = `created_at >= NOW() - INTERVAL '7 days'`;
        break;
      case 'month':
        dateFilter = `created_at >= NOW() - INTERVAL '30 days'`;
        break;
      default:
        dateFilter = `created_at >= NOW() - INTERVAL '7 days'`;
    }

    // Suggestion events by type
    const byType = await all(`
      SELECT suggestion_type, action, COUNT(*) as count
      FROM ai_suggestion_events
      WHERE ${dateFilter}
      GROUP BY suggestion_type, action
      ORDER BY count DESC
    `);

    // Daily trend
    const dailyTrend = await all(`
      SELECT created_at::date as date, action, COUNT(*) as count
      FROM ai_suggestion_events
      WHERE ${dateFilter}
      GROUP BY created_at::date, action
      ORDER BY date
    `);

    // Revenue from AI-suggested items
    const aiRevenue = await get(`
      SELECT
        COUNT(*) as ai_items_sold,
        COALESCE(SUM(oi.unit_price * oi.quantity), 0) as ai_revenue
      FROM order_items oi
      WHERE oi.was_ai_suggested = true
        AND oi.order_id IN (
          SELECT id FROM orders WHERE ${dateFilter.replace('created_at', 'orders.created_at')}
        )
    `);

    res.json({
      period,
      byType,
      dailyTrend,
      aiRevenue: {
        itemsSold: aiRevenue?.ai_items_sold || 0,
        revenue: aiRevenue?.ai_revenue || 0,
      },
    });
  } catch (error) {
    console.error('Error getting AI analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ==================== Dynamic Pricing Endpoints ====================

// GET /api/ai/pricing-suggestions
router.get('/pricing-suggestions', async (req, res) => {
  try {
    const suggestions = await generatePricingSuggestions();
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting pricing suggestions:', error);
    res.status(500).json({ error: 'Failed to get pricing suggestions' });
  }
});

// POST /api/ai/pricing-suggestions/:id/apply
router.post('/pricing-suggestions/:id/apply', requireAuth('manage_ai'), async (req, res) => {
  try {
    const { menu_item_id, new_price } = req.body;

    if (!menu_item_id || !new_price) {
      return res.status(400).json({ error: 'Missing menu_item_id or new_price' });
    }

    const item = await get('SELECT id, price FROM menu_items WHERE id = $1', [menu_item_id]);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Store original price for reverting
    await run(`
      UPDATE menu_items SET price = $1 WHERE id = $2
    `, [new_price, menu_item_id]);

    // Log the event
    await run(`
      INSERT INTO ai_suggestion_events (suggestion_type, suggestion_data, action)
      VALUES ('dynamic_pricing', $1, 'accepted')
    `, [JSON.stringify({
      menu_item_id,
      original_price: item.price,
      new_price,
      suggestion_id: req.params.id,
    })]);

    res.json({
      success: true,
      menu_item_id,
      original_price: item.price,
      new_price,
    });
  } catch (error) {
    console.error('Error applying pricing suggestion:', error);
    res.status(500).json({ error: 'Failed to apply pricing' });
  }
});

// ==================== Inventory Forecast Endpoints ====================

// GET /api/ai/inventory-forecast
router.get('/inventory-forecast', async (req, res) => {
  try {
    const forecasts = await generateInventoryForecast();

    // Optionally enhance with Claude if enabled
    if (await getConfigBool('grok_api_enabled') && process.env.XAI_API_KEY && req.query.enhance === '1') {
      const criticalItems = forecasts.filter(f => f.risk_level === 'critical' || f.risk_level === 'high');
      if (criticalItems.length > 0) {
        const enhanced = await enhanceForecast(criticalItems);
        if (enhanced) {
          return res.json({ forecasts, claudeEnhanced: enhanced });
        }
      }
    }

    res.json(forecasts);
  } catch (error) {
    console.error('Error getting inventory forecast:', error);
    res.status(500).json({ error: 'Failed to get forecast' });
  }
});

// ==================== Claude Analysis Endpoint ====================

// POST /api/ai/analyze - trigger on-demand Grok analysis
router.post('/analyze', requireAuth('manage_ai'), async (req, res) => {
  try {
    // Plan-based AI gating
    const plan = req.tenant?.plan || 'trial';
    const limits = getPlanLimits(plan);

    if (limits.ai.mode === 'mock') {
      return res.json(MOCK_ANALYSIS);
    }
    if (limits.ai.mode === 'locked') {
      return res.status(403).json({ error: 'AI Intelligence requires the Pro plan', upgrade: true });
    }

    // Pro plan — check monthly analysis cap
    if (limits.ai.monthlyAnalyses > 0) {
      const { cnt } = (await get(`SELECT COUNT(*) as cnt FROM ai_suggestion_events WHERE created_at >= date_trunc('month', NOW())`)) || { cnt: 0 };
      if (cnt >= limits.ai.monthlyAnalyses) {
        return res.status(429).json({ error: `Monthly analysis limit reached (${limits.ai.monthlyAnalyses})`, upgrade: true });
      }
    }

    if (!await getConfigBool('grok_api_enabled')) {
      return res.status(400).json({ error: 'Grok API is not enabled. Turn it on in AI Config.' });
    }

    if (!process.env.XAI_API_KEY) {
      return res.status(400).json({ error: 'XAI_API_KEY is not set in environment.' });
    }

    const { type = 'all' } = req.body;
    const results = {};

    // Upsell pattern analysis
    if (type === 'all' || type === 'upsell') {
      const topPairs = await getTopItemPairs(15);
      if (topPairs.length > 0) {
        const upsellResult = await analyzeUpsellPatterns(topPairs);
        results.upsell = upsellResult || { message: 'Not enough pair data for analysis' };
      } else {
        results.upsell = { message: 'No item pair data available yet' };
      }
    }

    // Inventory trend analysis
    if (type === 'all' || type === 'inventory') {
      const velocityData = await all(`
        SELECT iv.inventory_item_id, ii.name, iv.date, iv.quantity_used
        FROM ai_inventory_velocity iv
        JOIN inventory_items ii ON iv.inventory_item_id = ii.id
        WHERE iv.date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY iv.date DESC
      `);

      if (velocityData.length > 0) {
        const inventoryResult = await analyzeInventoryTrends(velocityData);
        results.inventory = inventoryResult || { message: 'Could not analyze inventory trends' };
      } else {
        results.inventory = { message: 'No velocity data available yet' };
      }
    }

    // Forecast enhancement
    if (type === 'all' || type === 'forecast') {
      const forecastData = await generateInventoryForecast();
      const criticalItems = forecastData.filter(f => f.risk_level === 'critical' || f.risk_level === 'high');
      if (criticalItems.length > 0) {
        const forecastResult = await enhanceForecast(criticalItems);
        results.forecast = forecastResult || { message: 'Could not enhance forecast' };
      } else {
        results.forecast = { message: 'No critical/high risk items to analyze' };
      }
    }

    results.timestamp = new Date().toISOString();
    results.grokStats = getGrokStats();

    res.json(results);
  } catch (error) {
    console.error('Error running Grok analysis:', error);
    res.status(500).json({ error: 'Failed to run Claude analysis' });
  }
});

// ==================== Inventory Insights (aggregated) ====================

// GET /api/ai/inventory-insights
router.get('/inventory-insights', async (req, res) => {
  try {
    // 1. Forecasts
    const forecasts = await generateInventoryForecast();
    const criticalCount = forecasts.filter(f => f.risk_level === 'critical').length;
    const highCount = forecasts.filter(f => f.risk_level === 'high').length;

    // 2. Prep forecast (tomorrow)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const prepForecast = await generatePrepForecast(tomorrow);
    const prepActionsNeeded = prepForecast.items
      ? prepForecast.items.filter(i => i.prep_action !== 'sufficient').length
      : 0;

    // 3. Waste trend (30d vs prior 30d)
    const wasteTrend = await get(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN cost_at_time * quantity ELSE 0 END), 0) AS recent,
        COALESCE(SUM(CASE WHEN created_at < NOW() - INTERVAL '30 days' AND created_at >= NOW() - INTERVAL '60 days' THEN cost_at_time * quantity ELSE 0 END), 0) AS prior
      FROM waste_log
      WHERE created_at >= NOW() - INTERVAL '60 days'
    `);
    const recentWaste = parseFloat(wasteTrend?.recent || 0);
    const priorWaste = parseFloat(wasteTrend?.prior || 0);
    const wasteTrendPercent = priorWaste > 0
      ? Math.round(((recentWaste - priorWaste) / priorWaste) * 100)
      : 0;

    // 4. Suggestion acceptance rate
    const totalSuggestions = (await get(`SELECT COUNT(*) as total FROM ai_suggestion_events`))?.total || 0;
    const acceptedSuggestions = (await get(`SELECT COUNT(*) as total FROM ai_suggestion_events WHERE action = 'accepted'`))?.total || 0;
    const acceptanceRate = totalSuggestions > 0
      ? Math.round((acceptedSuggestions / totalSuggestions) * 100)
      : 0;

    // 5. Velocity chart — top 10 items, last 14 days
    const velocityRaw = await all(`
      SELECT iv.inventory_item_id, ii.name, iv.date::text as date,
             iv.quantity_used, iv.orders_count
      FROM ai_inventory_velocity iv
      JOIN inventory_items ii ON iv.inventory_item_id = ii.id
      WHERE iv.date >= CURRENT_DATE - INTERVAL '14 days'
      ORDER BY iv.date
    `);
    // Group by item, pick top 10 by total usage
    const byItem = {};
    for (const row of velocityRaw) {
      if (!byItem[row.inventory_item_id]) {
        byItem[row.inventory_item_id] = { inventory_item_id: row.inventory_item_id, name: row.name, total_used: 0, daily: [] };
      }
      byItem[row.inventory_item_id].total_used += parseFloat(row.quantity_used || 0);
      byItem[row.inventory_item_id].daily.push({
        date: row.date,
        quantity_used: parseFloat(row.quantity_used || 0),
        orders_count: parseInt(row.orders_count || 0),
      });
    }
    const velocityChart = Object.values(byItem)
      .sort((a, b) => b.total_used - a.total_used)
      .slice(0, 10);

    // 6. Waste alerts from cache
    let wasteAlerts = [];
    try { wasteAlerts = await readSuggestions('waste_alert'); } catch {}

    // 7. Push/avoid items
    const pushData = await getInventoryPush();

    // 8. Waste daily trend (last 30 days)
    const wasteDailyTrend = await all(`
      SELECT created_at::date::text as date,
             COALESCE(SUM(cost_at_time * quantity), 0) as total_cost,
             COUNT(*) as entry_count
      FROM waste_log
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY created_at::date
      ORDER BY date
    `);

    res.json({
      kpis: {
        itemsAtRisk: criticalCount + highCount,
        criticalCount,
        highCount,
        prepActionsNeeded,
        wasteTrendPercent,
        acceptanceRate,
      },
      forecasts,
      prepForecast,
      velocityChart,
      wasteAlerts,
      pushItems: pushData.pushItems || [],
      avoidItems: pushData.avoidItems || [],
      wasteDailyTrend: wasteDailyTrend.map(r => ({
        date: r.date,
        total_cost: parseFloat(r.total_cost),
        entry_count: parseInt(r.entry_count),
      })),
    });
  } catch (error) {
    console.error('Error getting inventory insights:', error);
    res.status(500).json({ error: 'Failed to get inventory insights' });
  }
});

// ==================== Prep Forecast ====================

// GET /api/ai/prep-forecast?date=YYYY-MM-DD
router.get('/prep-forecast', async (req, res) => {
  try {
    const date = req.query.date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const forecast = await generatePrepForecast(date);
    res.json(forecast);
  } catch (error) {
    console.error('Error getting prep forecast:', error);
    res.status(500).json({ error: 'Failed to get prep forecast' });
  }
});

// ==================== Category Roles ====================

// GET /api/ai/category-roles
router.get('/category-roles', async (req, res) => {
  try {
    const roles = await all(`
      SELECT acr.id, acr.category_id, acr.role, mc.name as category_name
      FROM ai_category_roles acr
      JOIN menu_categories mc ON acr.category_id = mc.id
      ORDER BY mc.sort_order
    `);
    res.json(roles);
  } catch (error) {
    console.error('Error getting category roles:', error);
    res.status(500).json({ error: 'Failed to get category roles' });
  }
});

// PUT /api/ai/category-roles/:categoryId
router.put('/category-roles/:categoryId', requireAuth('manage_ai'), async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Missing role' });
    }

    const existing = await get('SELECT id FROM ai_category_roles WHERE category_id = $1', [categoryId]);

    if (existing) {
      await run('UPDATE ai_category_roles SET role = $1 WHERE category_id = $2', [role, categoryId]);
    } else {
      await run('INSERT INTO ai_category_roles (category_id, role) VALUES ($1, $2)', [categoryId, role]);
    }

    res.json({ success: true, category_id: parseInt(categoryId), role });
  } catch (error) {
    console.error('Error updating category role:', error);
    res.status(500).json({ error: 'Failed to update category role' });
  }
});

// ==================== Config Export/Import ====================

// GET /api/ai/config/export
router.get('/config/export', async (req, res) => {
  try {
    const config = await getAllConfig();
    const roles = await all(`
      SELECT acr.category_id, acr.role, mc.name as category_name
      FROM ai_category_roles acr
      JOIN menu_categories mc ON acr.category_id = mc.id
    `);

    res.json({
      version: 1,
      exported_at: new Date().toISOString(),
      config,
      category_roles: roles,
    });
  } catch (error) {
    console.error('Error exporting config:', error);
    res.status(500).json({ error: 'Failed to export config' });
  }
});

// POST /api/ai/config/import
router.post('/config/import', requireAuth('manage_ai'), async (req, res) => {
  try {
    const { config, category_roles } = req.body;

    if (config) {
      const entries = Object.entries(config).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? val.value : val,
        description: typeof val === 'object' ? val.description : null,
      }));
      await setMultipleConfig(entries);
    }

    if (category_roles && Array.isArray(category_roles)) {
      for (const role of category_roles) {
        const existing = await get('SELECT id FROM ai_category_roles WHERE category_id = $1', [role.category_id]);
        if (existing) {
          await run('UPDATE ai_category_roles SET role = $1 WHERE category_id = $2', [role.role, role.category_id]);
        } else {
          await run('INSERT INTO ai_category_roles (category_id, role) VALUES ($1, $2)', [role.category_id, role.role]);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error importing config:', error);
    res.status(500).json({ error: 'Failed to import config' });
  }
});

export default router;
