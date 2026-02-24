import { Router } from 'express';
import { run, all, get } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getPlanLimits } from '../planLimits.js';
import {
  checkGuardrails,
  applyPriceChange,
  revertPriceChange,
  calculateRevenueImpact,
  getOrCreateGuardrails,
  previewRule,
} from '../ai/pricing-engine.js';
import { generatePricingSuggestions, generateGrokPricingAnalysis } from '../ai/suggestions/dynamic-pricing.js';

const router = Router();

// ==================== Plan Gating Middleware ====================

function requireDynamicPricing(feature = 'aiSuggestions') {
  return (req, res, next) => {
    const plan = req.tenant?.plan || 'trial';
    const limits = getPlanLimits(plan);
    if (!limits.dynamicPricing?.[feature]) {
      const planNeeded = feature === 'abTesting' || feature === 'deliveryIntegration' ? 'Ghost Kitchen' : 'Pro';
      return res.status(403).json({ error: `This feature requires the ${planNeeded} plan`, upgrade: true });
    }
    next();
  };
}

// ==================== Dashboard ====================

// GET /api/pricing/dashboard
router.get('/dashboard', requireAuth('manage_ai'), requireDynamicPricing('aiSuggestions'), async (req, res) => {
  try {
    const activeRules = await get('SELECT COUNT(*) as cnt FROM pricing_rules WHERE active = true');
    const recentChanges = await all(`
      SELECT ph.*, mi.name as item_name, e.name as created_by_name
      FROM price_history ph
      JOIN menu_items mi ON ph.menu_item_id = mi.id
      LEFT JOIN employees e ON ph.created_by = e.id
      WHERE ph.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY ph.created_at DESC LIMIT 10
    `);
    const runningExps = await get(`SELECT COUNT(*) as cnt FROM pricing_experiments WHERE status = 'running'`);

    // Revenue impact: sum delta for all non-reverted changes with revenue_after_daily
    const impactRow = await get(`
      SELECT COALESCE(SUM(revenue_after_daily - revenue_before_daily), 0) as total_impact
      FROM price_history
      WHERE revenue_after_daily IS NOT NULL AND reverted_at IS NULL
        AND created_at >= NOW() - INTERVAL '30 days'
    `);

    // Chart data: daily revenue + price change count for last 14 days
    const chartData = await all(`
      SELECT d.date,
        COALESCE(rev.daily_revenue, 0) as revenue,
        COALESCE(chg.changes, 0) as changes
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day') AS d(date)
      LEFT JOIN (
        SELECT created_at::date as date, SUM(total) as daily_revenue
        FROM orders WHERE status != 'cancelled' AND created_at >= NOW() - INTERVAL '14 days'
        GROUP BY created_at::date
      ) rev ON rev.date = d.date
      LEFT JOIN (
        SELECT created_at::date as date, COUNT(*) as changes
        FROM price_history WHERE created_at >= NOW() - INTERVAL '14 days'
        GROUP BY created_at::date
      ) chg ON chg.date = d.date
      ORDER BY d.date
    `);

    // Pending suggestions count
    const heuristicSuggestions = await generatePricingSuggestions();

    res.json({
      activeRulesCount: parseInt(activeRules?.cnt) || 0,
      recentChanges: recentChanges.map(formatHistoryEntry),
      totalRevenueImpact: parseFloat(impactRow?.total_impact) || 0,
      runningExperiments: parseInt(runningExps?.cnt) || 0,
      pendingSuggestions: heuristicSuggestions.length,
      chartData: chartData.map(r => ({
        date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
        revenue: parseFloat(r.revenue) || 0,
        changes: parseInt(r.changes) || 0,
      })),
    });
  } catch (error) {
    console.error('Error getting pricing dashboard:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ==================== AI Suggestions ====================

// GET /api/pricing/suggestions
router.get('/suggestions', requireAuth('manage_ai'), requireDynamicPricing('aiSuggestions'), async (req, res) => {
  try {
    const heuristic = await generatePricingSuggestions();
    res.json({ heuristic, grok: [] });
  } catch (error) {
    console.error('Error getting pricing suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// POST /api/pricing/analyze — trigger Grok pricing analysis
router.post('/analyze', requireAuth('manage_ai'), requireDynamicPricing('aiSuggestions'), async (req, res) => {
  try {
    const result = await generateGrokPricingAnalysis();
    if (!result.success) {
      return res.status(400).json({ error: result.error, fallback: result.fallback });
    }
    res.json({ suggestions: result.suggestions, cached: result.cached });
  } catch (error) {
    console.error('Error running pricing analysis:', error);
    res.status(500).json({ error: 'Failed to run analysis' });
  }
});

// POST /api/pricing/suggestions/:id/apply
router.post('/suggestions/:id/apply', requireAuth('manage_ai'), requireDynamicPricing('aiSuggestions'), async (req, res) => {
  try {
    const { menu_item_id, new_price } = req.body;
    if (!menu_item_id || new_price == null) {
      return res.status(400).json({ error: 'Missing menu_item_id or new_price' });
    }

    const item = await get('SELECT id, price FROM menu_items WHERE id = $1', [menu_item_id]);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });

    const guardrailResult = await checkGuardrails(menu_item_id, parseFloat(item.price), parseFloat(new_price));
    if (!guardrailResult.allowed) {
      return res.status(400).json({ error: 'Guardrail violation', violations: guardrailResult.violations });
    }

    const result = await applyPriceChange({
      menuItemId: menu_item_id,
      newPrice: new_price,
      reason: `AI suggestion ${req.params.id}`,
      source: 'ai_suggestion',
      employeeId: req.employeeId,
    });

    res.json(result);
  } catch (error) {
    console.error('Error applying suggestion:', error);
    res.status(500).json({ error: 'Failed to apply suggestion' });
  }
});

// POST /api/pricing/suggestions/:id/dismiss
router.post('/suggestions/:id/dismiss', requireAuth('manage_ai'), async (req, res) => {
  try {
    await run(`
      INSERT INTO ai_suggestion_events (suggestion_type, suggestion_data, action, employee_id)
      VALUES ('dynamic_pricing', $1, 'dismissed', $2)
    `, [JSON.stringify({ suggestion_id: req.params.id }), req.employeeId || null]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to dismiss' });
  }
});

// ==================== Pricing Rules ====================

// GET /api/pricing/rules
router.get('/rules', requireAuth('manage_ai'), requireDynamicPricing('scheduledRules'), async (req, res) => {
  try {
    const rules = await all(`
      SELECT pr.*, e.name as created_by_name
      FROM pricing_rules pr
      LEFT JOIN employees e ON pr.created_by = e.id
      ORDER BY pr.priority DESC, pr.created_at DESC
    `);
    res.json(rules.map(r => ({
      ...r,
      conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : r.conditions,
      applies_to: typeof r.applies_to === 'string' ? JSON.parse(r.applies_to) : r.applies_to,
    })));
  } catch (error) {
    console.error('Error getting pricing rules:', error);
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

// POST /api/pricing/rules
router.post('/rules', requireAuth('manage_ai'), requireDynamicPricing('scheduledRules'), async (req, res) => {
  try {
    const { name, rule_type, description, conditions, adjustment_type, adjustment_value, applies_to, priority, max_stack, auto_apply } = req.body;
    if (!name || !rule_type || adjustment_value == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await run(`
      INSERT INTO pricing_rules (name, rule_type, description, conditions, adjustment_type, adjustment_value, applies_to, priority, max_stack, auto_apply, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [name, rule_type, description || null, JSON.stringify(conditions || {}), adjustment_type || 'percent', adjustment_value, JSON.stringify(applies_to || { scope: 'all' }), priority || 0, max_stack || false, auto_apply || false, req.employeeId || null]);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// PUT /api/pricing/rules/:id
router.put('/rules/:id', requireAuth('manage_ai'), requireDynamicPricing('scheduledRules'), async (req, res) => {
  try {
    const { name, rule_type, description, conditions, adjustment_type, adjustment_value, applies_to, priority, max_stack, active, auto_apply } = req.body;

    await run(`
      UPDATE pricing_rules SET
        name = COALESCE($1, name),
        rule_type = COALESCE($2, rule_type),
        description = $3,
        conditions = COALESCE($4, conditions),
        adjustment_type = COALESCE($5, adjustment_type),
        adjustment_value = COALESCE($6, adjustment_value),
        applies_to = COALESCE($7, applies_to),
        priority = COALESCE($8, priority),
        max_stack = COALESCE($9, max_stack),
        active = COALESCE($10, active),
        auto_apply = COALESCE($11, auto_apply),
        updated_at = NOW()
      WHERE id = $12
    `, [name, rule_type, description ?? null, conditions ? JSON.stringify(conditions) : null, adjustment_type, adjustment_value, applies_to ? JSON.stringify(applies_to) : null, priority, max_stack, active, auto_apply, req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// DELETE /api/pricing/rules/:id
router.delete('/rules/:id', requireAuth('manage_ai'), requireDynamicPricing('scheduledRules'), async (req, res) => {
  try {
    await run('UPDATE pricing_rules SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// POST /api/pricing/rules/:id/preview
router.post('/rules/:id/preview', requireAuth('manage_ai'), requireDynamicPricing('scheduledRules'), async (req, res) => {
  try {
    const preview = await previewRule(parseInt(req.params.id));
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: 'Failed to preview rule' });
  }
});

// ==================== Guardrails ====================

// GET /api/pricing/guardrails
router.get('/guardrails', requireAuth('manage_ai'), requireDynamicPricing('guardrails'), async (req, res) => {
  try {
    const guardrails = await getOrCreateGuardrails();
    // Today's change count
    const todayChanges = await get(`SELECT COUNT(*) as cnt FROM price_history WHERE created_at::date = CURRENT_DATE AND reverted_at IS NULL`);
    res.json({ ...guardrails, today_changes: parseInt(todayChanges?.cnt) || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get guardrails' });
  }
});

// PUT /api/pricing/guardrails
router.put('/guardrails', requireAuth('manage_ai'), requireDynamicPricing('guardrails'), async (req, res) => {
  try {
    const { min_change_percent, max_change_percent, max_daily_changes, require_approval_above, protected_item_ids, notification_email, cooldown_hours } = req.body;

    const existing = await get('SELECT id FROM pricing_guardrails LIMIT 1');
    if (existing) {
      await run(`
        UPDATE pricing_guardrails SET
          min_change_percent = COALESCE($1, min_change_percent),
          max_change_percent = COALESCE($2, max_change_percent),
          max_daily_changes = COALESCE($3, max_daily_changes),
          require_approval_above = COALESCE($4, require_approval_above),
          protected_item_ids = COALESCE($5, protected_item_ids),
          notification_email = $6,
          cooldown_hours = COALESCE($7, cooldown_hours),
          updated_at = NOW()
        WHERE id = $8
      `, [min_change_percent, max_change_percent, max_daily_changes, require_approval_above, protected_item_ids ? JSON.stringify(protected_item_ids) : null, notification_email ?? null, cooldown_hours, existing.id]);
    } else {
      await run(`
        INSERT INTO pricing_guardrails (min_change_percent, max_change_percent, max_daily_changes, require_approval_above, protected_item_ids, notification_email, cooldown_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [min_change_percent || -20, max_change_percent || 15, max_daily_changes || 10, require_approval_above || 10, JSON.stringify(protected_item_ids || []), notification_email || null, cooldown_hours || 24]);
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update guardrails' });
  }
});

// ==================== Price History ====================

// GET /api/pricing/history
router.get('/history', requireAuth('manage_ai'), requireDynamicPricing('priceHistory'), async (req, res) => {
  try {
    const { item_id, source, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = 'WHERE 1=1';
    const params = [];
    let idx = 0;

    if (item_id) { idx++; where += ` AND ph.menu_item_id = $${idx}`; params.push(item_id); }
    if (source) { idx++; where += ` AND ph.source = $${idx}`; params.push(source); }
    if (from) { idx++; where += ` AND ph.created_at >= $${idx}`; params.push(from); }
    if (to) { idx++; where += ` AND ph.created_at <= $${idx}`; params.push(to); }

    idx++;
    const limitParam = idx;
    params.push(parseInt(limit));
    idx++;
    const offsetParam = idx;
    params.push(offset);

    const rows = await all(`
      SELECT ph.*, mi.name as item_name, e.name as created_by_name
      FROM price_history ph
      JOIN menu_items mi ON ph.menu_item_id = mi.id
      LEFT JOIN employees e ON ph.created_by = e.id
      ${where}
      ORDER BY ph.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `, params);

    // Count without LIMIT
    const countParams = params.slice(0, -2);
    const countRow = await get(`SELECT COUNT(*) as total FROM price_history ph ${where}`, countParams);

    res.json({
      data: rows.map(formatHistoryEntry),
      total: parseInt(countRow?.total) || 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error getting price history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// POST /api/pricing/history/:id/revert
router.post('/history/:id/revert', requireAuth('manage_ai'), requireDynamicPricing('priceHistory'), async (req, res) => {
  try {
    const result = await revertPriceChange(parseInt(req.params.id), req.employeeId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== Revenue Impact ====================

// GET /api/pricing/impact
router.get('/impact', requireAuth('manage_ai'), requireDynamicPricing('priceHistory'), async (req, res) => {
  try {
    const { item_id } = req.query;
    if (item_id) {
      const impact = await calculateRevenueImpact(parseInt(item_id));
      return res.json(impact);
    }
    // Aggregate: top 10 items with most price changes
    const topChanged = await all(`
      SELECT menu_item_id, COUNT(*) as change_count
      FROM price_history WHERE source != 'revert' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY menu_item_id ORDER BY change_count DESC LIMIT 10
    `);

    const impacts = [];
    for (const row of topChanged) {
      const itemImpact = await calculateRevenueImpact(row.menu_item_id, 7);
      impacts.push(...itemImpact);
    }

    res.json(impacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get impact data' });
  }
});

// ==================== A/B Experiments ====================

// GET /api/pricing/experiments
router.get('/experiments', requireAuth('manage_ai'), requireDynamicPricing('abTesting'), async (req, res) => {
  try {
    const experiments = await all(`
      SELECT pe.*, mi.name as item_name
      FROM pricing_experiments pe
      JOIN menu_items mi ON pe.menu_item_id = mi.id
      ORDER BY pe.created_at DESC
    `);
    res.json(experiments.map(e => ({
      ...e,
      results: typeof e.results === 'string' ? JSON.parse(e.results) : e.results,
      variant_a_price: parseFloat(e.variant_a_price),
      variant_b_price: parseFloat(e.variant_b_price),
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to get experiments' });
  }
});

// POST /api/pricing/experiments
router.post('/experiments', requireAuth('manage_ai'), requireDynamicPricing('abTesting'), async (req, res) => {
  try {
    const { name, description, menu_item_id, variant_a_price, variant_b_price, split_percent, start_date, end_date } = req.body;
    if (!name || !menu_item_id || variant_a_price == null || variant_b_price == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await run(`
      INSERT INTO pricing_experiments (name, description, menu_item_id, variant_a_price, variant_b_price, split_percent, start_date, end_date, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9)
    `, [name, description || null, menu_item_id, variant_a_price, variant_b_price, split_percent || 50, start_date || null, end_date || null, req.employeeId || null]);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// PUT /api/pricing/experiments/:id
router.put('/experiments/:id', requireAuth('manage_ai'), requireDynamicPricing('abTesting'), async (req, res) => {
  try {
    const { status, name, description, split_percent, end_date } = req.body;

    if (status === 'running') {
      // When starting, set the menu item to variant A price
      const exp = await get('SELECT * FROM pricing_experiments WHERE id = $1', [req.params.id]);
      if (exp) {
        await run('UPDATE menu_items SET price = $1 WHERE id = $2', [exp.variant_a_price, exp.menu_item_id]);
      }
    }

    await run(`
      UPDATE pricing_experiments SET
        status = COALESCE($1, status),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        split_percent = COALESCE($4, split_percent),
        end_date = COALESCE($5, end_date),
        start_date = CASE WHEN $1 = 'running' AND start_date IS NULL THEN NOW() ELSE start_date END,
        updated_at = NOW()
      WHERE id = $6
    `, [status, name, description, split_percent, end_date, req.params.id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

// POST /api/pricing/experiments/:id/apply-winner
router.post('/experiments/:id/apply-winner', requireAuth('manage_ai'), requireDynamicPricing('abTesting'), async (req, res) => {
  try {
    const exp = await get('SELECT * FROM pricing_experiments WHERE id = $1', [req.params.id]);
    if (!exp) return res.status(404).json({ error: 'Experiment not found' });

    const results = typeof exp.results === 'string' ? JSON.parse(exp.results) : exp.results;
    const winner = results.winner;
    if (!winner) return res.status(400).json({ error: 'No winner determined yet' });

    const winnerPrice = winner === 'a' ? exp.variant_a_price : exp.variant_b_price;

    await applyPriceChange({
      menuItemId: exp.menu_item_id,
      newPrice: parseFloat(winnerPrice),
      reason: `A/B test "${exp.name}" winner (variant ${winner.toUpperCase()})`,
      source: 'ab_test',
      experimentId: exp.id,
      employeeId: req.employeeId,
    });

    await run(`UPDATE pricing_experiments SET status = 'completed', updated_at = NOW() WHERE id = $1`, [req.params.id]);

    res.json({ success: true, applied_price: parseFloat(winnerPrice), variant: winner });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply winner' });
  }
});

// ==================== Helpers ====================

function formatHistoryEntry(row) {
  return {
    ...row,
    old_price: parseFloat(row.old_price),
    new_price: parseFloat(row.new_price),
    change_percent: parseFloat(row.change_percent),
    revenue_before_daily: row.revenue_before_daily ? parseFloat(row.revenue_before_daily) : null,
    revenue_after_daily: row.revenue_after_daily ? parseFloat(row.revenue_after_daily) : null,
  };
}

export default router;
