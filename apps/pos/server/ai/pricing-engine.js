import { all, get, run } from '../db/index.js';
import { getConfigBool } from './config.js';

/**
 * Check guardrails for a proposed price change.
 * Returns { allowed, requiresApproval, violations[] }
 */
export async function checkGuardrails(menuItemId, currentPrice, proposedPrice) {
  const guardrails = await getOrCreateGuardrails();
  const violations = [];

  const changePercent = ((proposedPrice - currentPrice) / currentPrice) * 100;

  // Check protected items
  const protectedIds = guardrails.protected_item_ids || [];
  if (protectedIds.includes(menuItemId)) {
    violations.push('Item is protected from automatic price changes');
    return { allowed: false, requiresApproval: true, violations };
  }

  // Check min/max bounds
  if (changePercent < guardrails.min_change_percent) {
    violations.push(`Discount ${changePercent.toFixed(1)}% exceeds minimum ${guardrails.min_change_percent}%`);
  }
  if (changePercent > guardrails.max_change_percent) {
    violations.push(`Markup ${changePercent.toFixed(1)}% exceeds maximum ${guardrails.max_change_percent}%`);
  }

  // Check daily change limit
  const todayChanges = await get(`
    SELECT COUNT(*) as cnt FROM price_history
    WHERE created_at::date = CURRENT_DATE AND reverted_at IS NULL
  `);
  if ((todayChanges?.cnt || 0) >= guardrails.max_daily_changes) {
    violations.push(`Daily change limit reached (${guardrails.max_daily_changes})`);
  }

  // Check cooldown
  if (guardrails.cooldown_hours > 0) {
    const lastChange = await get(`
      SELECT created_at FROM price_history
      WHERE menu_item_id = $1 AND reverted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `, [menuItemId]);
    if (lastChange) {
      const hoursSince = (Date.now() - new Date(lastChange.created_at).getTime()) / 3600000;
      if (hoursSince < guardrails.cooldown_hours) {
        violations.push(`Cooldown: ${Math.ceil(guardrails.cooldown_hours - hoursSince)}h remaining`);
      }
    }
  }

  const requiresApproval = Math.abs(changePercent) > guardrails.require_approval_above;
  const allowed = violations.length === 0;

  return { allowed, requiresApproval, violations };
}

/**
 * Apply a price change with guardrails check and history logging.
 */
export async function applyPriceChange({ menuItemId, newPrice, reason, source, ruleId, experimentId, employeeId }) {
  const item = await get('SELECT id, name, price FROM menu_items WHERE id = $1', [menuItemId]);
  if (!item) throw new Error('Menu item not found');

  const oldPrice = parseFloat(item.price);
  newPrice = parseFloat(newPrice);
  const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

  // Calculate revenue before (avg daily revenue over last 7 days)
  const revBefore = await get(`
    SELECT COALESCE(AVG(daily_rev), 0) as avg_daily
    FROM (
      SELECT o.created_at::date as d, SUM(oi.unit_price * oi.quantity) as daily_rev
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.menu_item_id = $1 AND o.status != 'cancelled'
        AND o.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY o.created_at::date
    ) sub
  `, [menuItemId]);

  // Update the price
  await run('UPDATE menu_items SET price = $1 WHERE id = $2', [newPrice, menuItemId]);

  // Log to price_history
  const result = await run(`
    INSERT INTO price_history (menu_item_id, old_price, new_price, change_percent, reason, source, pricing_rule_id, experiment_id, created_by, revenue_before_daily)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [menuItemId, oldPrice, newPrice, changePercent, reason, source, ruleId || null, experimentId || null, employeeId || null, revBefore?.avg_daily || 0]);

  return {
    id: result.lastInsertRowid,
    menu_item_id: menuItemId,
    item_name: item.name,
    old_price: oldPrice,
    new_price: newPrice,
    change_percent: changePercent,
    source,
  };
}

/**
 * Revert a price change.
 */
export async function revertPriceChange(priceHistoryId, employeeId) {
  const entry = await get('SELECT * FROM price_history WHERE id = $1', [priceHistoryId]);
  if (!entry) throw new Error('Price history entry not found');
  if (entry.reverted_at) throw new Error('Already reverted');

  // Revert the menu item price
  await run('UPDATE menu_items SET price = $1 WHERE id = $2', [entry.old_price, entry.menu_item_id]);

  // Mark as reverted
  await run('UPDATE price_history SET reverted_at = NOW(), reverted_by = $1 WHERE id = $2', [employeeId || null, priceHistoryId]);

  // Log a new revert entry
  await run(`
    INSERT INTO price_history (menu_item_id, old_price, new_price, change_percent, reason, source, created_by)
    VALUES ($1, $2, $3, $4, $5, 'revert', $6)
  `, [entry.menu_item_id, entry.new_price, entry.old_price, -parseFloat(entry.change_percent), `Reverted change #${priceHistoryId}`, employeeId || null]);

  return { success: true, menu_item_id: entry.menu_item_id, restored_price: entry.old_price };
}

/**
 * Get revenue impact for a specific item.
 */
export async function calculateRevenueImpact(menuItemId, windowDays = 7) {
  const changes = await all(`
    SELECT ph.*, mi.name as item_name
    FROM price_history ph
    JOIN menu_items mi ON ph.menu_item_id = mi.id
    WHERE ph.menu_item_id = $1 AND ph.source != 'revert' AND ph.reverted_at IS NULL
    ORDER BY ph.created_at DESC
    LIMIT 10
  `, [menuItemId]);

  const results = [];
  for (const change of changes) {
    const changeDate = new Date(change.created_at);
    const afterStart = new Date(changeDate.getTime() + 86400000); // day after change

    const after = await get(`
      SELECT COALESCE(AVG(daily_rev), 0) as avg_daily
      FROM (
        SELECT o.created_at::date as d, SUM(oi.unit_price * oi.quantity) as daily_rev
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.menu_item_id = $1 AND o.status != 'cancelled'
          AND o.created_at >= $2 AND o.created_at < $2 + INTERVAL '${windowDays} days'
        GROUP BY o.created_at::date
      ) sub
    `, [menuItemId, afterStart.toISOString()]);

    const beforeAvg = parseFloat(change.revenue_before_daily) || 0;
    const afterAvg = parseFloat(after?.avg_daily) || 0;
    const delta = afterAvg - beforeAvg;

    results.push({
      history_id: change.id,
      menu_item_id: menuItemId,
      item_name: change.item_name,
      old_price: parseFloat(change.old_price),
      new_price: parseFloat(change.new_price),
      change_percent: parseFloat(change.change_percent),
      before_daily_avg: beforeAvg,
      after_daily_avg: afterAvg,
      delta,
      delta_percent: beforeAvg > 0 ? (delta / beforeAvg) * 100 : 0,
      change_date: change.created_at,
    });
  }

  return results;
}

/**
 * Backfill revenue_after_daily for old entries.
 * Called by scheduler every 6 hours.
 */
export async function backfillRevenueAfter() {
  const staleEntries = await all(`
    SELECT id, menu_item_id, created_at FROM price_history
    WHERE revenue_after_daily IS NULL
      AND source != 'revert'
      AND created_at < NOW() - INTERVAL '7 days'
    LIMIT 50
  `);

  for (const entry of staleEntries) {
    const afterStart = new Date(new Date(entry.created_at).getTime() + 86400000);
    const rev = await get(`
      SELECT COALESCE(AVG(daily_rev), 0) as avg_daily
      FROM (
        SELECT o.created_at::date as d, SUM(oi.unit_price * oi.quantity) as daily_rev
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.menu_item_id = $1 AND o.status != 'cancelled'
          AND o.created_at >= $2 AND o.created_at < $2 + INTERVAL '7 days'
        GROUP BY o.created_at::date
      ) sub
    `, [entry.menu_item_id, afterStart.toISOString()]);

    await run('UPDATE price_history SET revenue_after_daily = $1 WHERE id = $2', [rev?.avg_daily || 0, entry.id]);
  }
}

/**
 * Evaluate active pricing rules against current conditions.
 * Called by scheduler every 15 minutes.
 */
export async function evaluateActiveRules() {
  if (!(await getConfigBool('dynamic_pricing_enabled'))) return;

  const rules = await all(`
    SELECT * FROM pricing_rules WHERE active = true ORDER BY priority DESC LIMIT 50
  `);

  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0=Sunday

  // Cache guardrails and daily change count once per evaluation cycle
  const cachedGuardrails = await getOrCreateGuardrails();
  const todayChanges = await get(`
    SELECT COUNT(*) as cnt FROM price_history
    WHERE created_at::date = CURRENT_DATE AND reverted_at IS NULL
  `);
  const dailyChangeCount = todayChanges?.cnt || 0;

  for (const rule of rules) {
    const conditions = rule.conditions || {};
    let matches = false;

    switch (rule.rule_type) {
      case 'happy_hour': {
        const hours = conditions.hours || '';
        const days = conditions.days || [0, 1, 2, 3, 4, 5, 6];
        if (days.includes(currentDay)) {
          const [start, end] = hours.split('-').map(Number);
          if (start <= currentHour && currentHour < end) matches = true;
        }
        break;
      }
      case 'day_of_week': {
        const days = conditions.days || [];
        const hours = conditions.hours || '';
        if (days.includes(currentDay)) {
          if (hours) {
            const [start, end] = hours.split('-').map(Number);
            matches = start <= currentHour && currentHour < end;
          } else {
            matches = true;
          }
        }
        break;
      }
      case 'seasonal': {
        const range = conditions.date_range || [];
        if (range.length === 2) {
          const start = new Date(range[0]);
          const end = new Date(range[1]);
          matches = now >= start && now <= end;
        }
        break;
      }
      case 'demand_based': {
        const threshold = conditions.demand_threshold || 0.5;
        const direction = conditions.direction || 'below';
        const historical = await get(`
          SELECT AVG(order_count) as avg_orders FROM ai_hourly_snapshots
          WHERE day_of_week = $1 AND SUBSTRING(snapshot_hour FROM 12 FOR 2)::int = $2
        `, [currentDay, currentHour]);
        const current = await get(`
          SELECT COUNT(*) as cnt FROM orders
          WHERE created_at >= date_trunc('hour', NOW()) AND status != 'cancelled'
        `);
        const avg = parseFloat(historical?.avg_orders) || 0;
        const cur = parseInt(current?.cnt) || 0;
        if (avg > 0) {
          const ratio = cur / avg;
          if (direction === 'below' && ratio < threshold) matches = true;
          if (direction === 'above' && ratio > threshold) matches = true;
        }
        break;
      }
      case 'custom':
        break;
    }

    if (!matches) continue;

    const items = await getItemsForRule(rule);
    for (const item of items) {
      const currentPrice = parseFloat(item.price);
      let newPrice;
      if (rule.adjustment_type === 'percent') {
        newPrice = Math.round(currentPrice * (1 + rule.adjustment_value / 100) * 100) / 100;
      } else {
        newPrice = currentPrice + rule.adjustment_value;
      }
      if (newPrice < 0) newPrice = 0;

      // Use cached guardrails instead of re-querying per item
      const guardrailResult = checkGuardrailsCached(cachedGuardrails, dailyChangeCount, item.id, currentPrice, newPrice);
      if (!guardrailResult.allowed) continue;

      // Cooldown check still needs per-item query (but only for items that pass other checks)
      if (cachedGuardrails.cooldown_hours > 0) {
        const lastChange = await get(`
          SELECT created_at FROM price_history
          WHERE menu_item_id = $1 AND reverted_at IS NULL
          ORDER BY created_at DESC LIMIT 1
        `, [item.id]);
        if (lastChange) {
          const hoursSince = (Date.now() - new Date(lastChange.created_at).getTime()) / 3600000;
          if (hoursSince < cachedGuardrails.cooldown_hours) continue;
        }
      }

      if (rule.auto_apply && !guardrailResult.requiresApproval) {
        await applyPriceChange({
          menuItemId: item.id,
          newPrice,
          reason: `Rule: ${rule.name}`,
          source: 'scheduled_rule',
          ruleId: rule.id,
          employeeId: null,
        });
      }
    }
  }
}

/**
 * Check guardrails using cached values (no DB queries).
 */
function checkGuardrailsCached(guardrails, dailyChangeCount, menuItemId, currentPrice, proposedPrice) {
  const violations = [];
  const changePercent = ((proposedPrice - currentPrice) / currentPrice) * 100;

  const protectedIds = guardrails.protected_item_ids || [];
  if (protectedIds.includes(menuItemId)) {
    return { allowed: false, requiresApproval: true, violations: ['Item is protected'] };
  }

  if (changePercent < guardrails.min_change_percent) {
    violations.push(`Discount ${changePercent.toFixed(1)}% exceeds minimum ${guardrails.min_change_percent}%`);
  }
  if (changePercent > guardrails.max_change_percent) {
    violations.push(`Markup ${changePercent.toFixed(1)}% exceeds maximum ${guardrails.max_change_percent}%`);
  }
  if (dailyChangeCount >= guardrails.max_daily_changes) {
    violations.push(`Daily change limit reached (${guardrails.max_daily_changes})`);
  }

  const requiresApproval = Math.abs(changePercent) > guardrails.require_approval_above;
  return { allowed: violations.length === 0, requiresApproval, violations };
}

/**
 * Get menu items affected by a pricing rule.
 */
async function getItemsForRule(rule) {
  const appliesTo = rule.applies_to || { scope: 'all' };

  if (appliesTo.scope === 'items' && appliesTo.ids?.length) {
    const placeholders = appliesTo.ids.map((_, i) => `$${i + 1}`).join(',');
    return all(`SELECT id, name, price FROM menu_items WHERE active = true AND id IN (${placeholders})`, appliesTo.ids);
  }
  if (appliesTo.scope === 'categories' && appliesTo.ids?.length) {
    const placeholders = appliesTo.ids.map((_, i) => `$${i + 1}`).join(',');
    return all(`SELECT id, name, price FROM menu_items WHERE active = true AND category_id IN (${placeholders})`, appliesTo.ids);
  }
  return all('SELECT id, name, price FROM menu_items WHERE active = true');
}

/**
 * Get or create guardrails for the current tenant.
 */
export async function getOrCreateGuardrails() {
  let guardrails = await get('SELECT * FROM pricing_guardrails LIMIT 1');
  if (!guardrails) {
    await run(`INSERT INTO pricing_guardrails (min_change_percent, max_change_percent, max_daily_changes, require_approval_above, cooldown_hours) VALUES (-20, 15, 10, 10, 24)`);
    guardrails = await get('SELECT * FROM pricing_guardrails LIMIT 1');
  }
  // Parse JSONB
  if (typeof guardrails.protected_item_ids === 'string') {
    guardrails.protected_item_ids = JSON.parse(guardrails.protected_item_ids);
  }
  return guardrails;
}

/**
 * Preview which items and prices would be affected by a rule without applying.
 */
export async function previewRule(ruleId) {
  const rule = await get('SELECT * FROM pricing_rules WHERE id = $1', [ruleId]);
  if (!rule) throw new Error('Rule not found');

  const items = await getItemsForRule(rule);
  return items.map(item => {
    const currentPrice = parseFloat(item.price);
    let newPrice;
    if (rule.adjustment_type === 'percent') {
      newPrice = Math.round(currentPrice * (1 + rule.adjustment_value / 100) * 100) / 100;
    } else {
      newPrice = currentPrice + rule.adjustment_value;
    }
    return {
      menu_item_id: item.id,
      item_name: item.name,
      current_price: currentPrice,
      projected_price: Math.max(0, newPrice),
      change_percent: ((newPrice - currentPrice) / currentPrice) * 100,
    };
  });
}
