import { Router } from 'express';
import { run, all, get } from '../db.js';
import { getCartSuggestions, getInventoryPush } from '../ai/heuristics.js';
import { getAllConfig, setConfig, setMultipleConfig, getConfigNumber } from '../ai/config.js';
import { readSuggestions } from '../ai/cache.js';
import { getAIStatus } from '../ai/index.js';
import { getTopItemPairs } from '../ai/data-pipeline.js';
import { generatePricingSuggestions } from '../ai/suggestions/dynamic-pricing.js';
import { generateInventoryForecast } from '../ai/suggestions/inventory-forecast.js';
import { getClaudeStats } from '../ai/claude-client.js';

const router = Router();

// ==================== Suggestion Endpoints ====================

// GET /api/ai/suggestions/cart?items=1,3,7&hour=14
router.get('/suggestions/cart', (req, res) => {
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

    const maxSuggestions = getConfigNumber('max_suggestions_per_order') || 2;
    const suggestions = getCartSuggestions(itemIds, hour);

    res.json(suggestions.slice(0, maxSuggestions));
  } catch (error) {
    console.error('Error getting cart suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// GET /api/ai/suggestions/inventory-push
router.get('/suggestions/inventory-push', (req, res) => {
  try {
    const result = getInventoryPush();
    res.json(result);
  } catch (error) {
    console.error('Error getting inventory push:', error);
    res.status(500).json({ error: 'Failed to get inventory push data' });
  }
});

// POST /api/ai/suggestions/feedback
router.post('/suggestions/feedback', (req, res) => {
  try {
    const { suggestion_type, suggestion_data, action, employee_id, order_id } = req.body;

    if (!suggestion_type || !action) {
      return res.status(400).json({ error: 'Missing suggestion_type or action' });
    }

    if (!['accepted', 'dismissed'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accepted" or "dismissed"' });
    }

    run(`
      INSERT INTO ai_suggestion_events (suggestion_type, suggestion_data, action, employee_id, order_id)
      VALUES (?, ?, ?, ?, ?)
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
router.get('/config', (req, res) => {
  try {
    const config = getAllConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting AI config:', error);
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// PUT /api/ai/config
router.put('/config', (req, res) => {
  try {
    const { entries } = req.body;

    if (entries && Array.isArray(entries)) {
      setMultipleConfig(entries);
    } else if (req.body.key && req.body.value !== undefined) {
      setConfig(req.body.key, req.body.value, req.body.description);
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
router.get('/insights', (req, res) => {
  try {
    // Aggregate insights from various sources
    const inventoryPush = getInventoryPush();
    const topPairs = getTopItemPairs(10);

    // Get suggestion effectiveness
    const totalSuggestions = get(`
      SELECT COUNT(*) as total FROM ai_suggestion_events
    `)?.total || 0;

    const acceptedSuggestions = get(`
      SELECT COUNT(*) as total FROM ai_suggestion_events WHERE action = 'accepted'
    `)?.total || 0;

    const acceptanceRate = totalSuggestions > 0
      ? Math.round((acceptedSuggestions / totalSuggestions) * 100)
      : 0;

    // Get recent hourly snapshots
    const recentSnapshots = all(`
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
      claudeStats: getClaudeStats(),
      aiStatus: getAIStatus(),
    });
  } catch (error) {
    console.error('Error getting AI insights:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// GET /api/ai/analytics
router.get('/analytics', (req, res) => {
  try {
    const period = req.query.period || 'week';
    let dateFilter;

    switch (period) {
      case 'today':
        dateFilter = `DATE(created_at) = DATE('now', 'localtime')`;
        break;
      case 'week':
        dateFilter = `created_at >= datetime('now', '-7 days', 'localtime')`;
        break;
      case 'month':
        dateFilter = `created_at >= datetime('now', '-30 days', 'localtime')`;
        break;
      default:
        dateFilter = `created_at >= datetime('now', '-7 days', 'localtime')`;
    }

    // Suggestion events by type
    const byType = all(`
      SELECT suggestion_type, action, COUNT(*) as count
      FROM ai_suggestion_events
      WHERE ${dateFilter}
      GROUP BY suggestion_type, action
      ORDER BY count DESC
    `);

    // Daily trend
    const dailyTrend = all(`
      SELECT DATE(created_at) as date, action, COUNT(*) as count
      FROM ai_suggestion_events
      WHERE ${dateFilter}
      GROUP BY DATE(created_at), action
      ORDER BY date
    `);

    // Revenue from AI-suggested items
    const aiRevenue = get(`
      SELECT
        COUNT(*) as ai_items_sold,
        COALESCE(SUM(oi.unit_price * oi.quantity), 0) as ai_revenue
      FROM order_items oi
      WHERE oi.was_ai_suggested = 1
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
router.get('/pricing-suggestions', (req, res) => {
  try {
    const suggestions = generatePricingSuggestions();
    res.json(suggestions);
  } catch (error) {
    console.error('Error getting pricing suggestions:', error);
    res.status(500).json({ error: 'Failed to get pricing suggestions' });
  }
});

// POST /api/ai/pricing-suggestions/:id/apply
router.post('/pricing-suggestions/:id/apply', (req, res) => {
  try {
    const { menu_item_id, new_price } = req.body;

    if (!menu_item_id || !new_price) {
      return res.status(400).json({ error: 'Missing menu_item_id or new_price' });
    }

    const item = get('SELECT id, price FROM menu_items WHERE id = ?', [menu_item_id]);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Store original price for reverting
    run(`
      UPDATE menu_items SET price = ? WHERE id = ?
    `, [new_price, menu_item_id]);

    // Log the event
    run(`
      INSERT INTO ai_suggestion_events (suggestion_type, suggestion_data, action)
      VALUES ('dynamic_pricing', ?, 'accepted')
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
router.get('/inventory-forecast', (req, res) => {
  try {
    const forecasts = generateInventoryForecast();
    res.json(forecasts);
  } catch (error) {
    console.error('Error getting inventory forecast:', error);
    res.status(500).json({ error: 'Failed to get forecast' });
  }
});

// ==================== Category Roles ====================

// GET /api/ai/category-roles
router.get('/category-roles', (req, res) => {
  try {
    const roles = all(`
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
router.put('/category-roles/:categoryId', (req, res) => {
  try {
    const { categoryId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Missing role' });
    }

    const existing = get('SELECT id FROM ai_category_roles WHERE category_id = ?', [categoryId]);

    if (existing) {
      run('UPDATE ai_category_roles SET role = ? WHERE category_id = ?', [role, categoryId]);
    } else {
      run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [categoryId, role]);
    }

    res.json({ success: true, category_id: parseInt(categoryId), role });
  } catch (error) {
    console.error('Error updating category role:', error);
    res.status(500).json({ error: 'Failed to update category role' });
  }
});

// ==================== Config Export/Import ====================

// GET /api/ai/config/export
router.get('/config/export', (req, res) => {
  try {
    const config = getAllConfig();
    const roles = all(`
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
router.post('/config/import', (req, res) => {
  try {
    const { config, category_roles } = req.body;

    if (config) {
      const entries = Object.entries(config).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? val.value : val,
        description: typeof val === 'object' ? val.description : null,
      }));
      setMultipleConfig(entries);
    }

    if (category_roles && Array.isArray(category_roles)) {
      for (const role of category_roles) {
        const existing = get('SELECT id FROM ai_category_roles WHERE category_id = ?', [role.category_id]);
        if (existing) {
          run('UPDATE ai_category_roles SET role = ? WHERE category_id = ?', [role.role, role.category_id]);
        } else {
          run('INSERT INTO ai_category_roles (category_id, role) VALUES (?, ?)', [role.category_id, role.role]);
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
