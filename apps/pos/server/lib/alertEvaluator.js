/**
 * Alert rule evaluation + webhook notifications.
 * Runs every 60s, checks metrics against threshold rules.
 */

import { adminSql } from '../db/index.js';
import { getPoolMetrics } from './poolMetrics.js';
import { getRequestMetrics } from './requestMetrics.js';
import { runServiceChecks } from './serviceChecks.js';

const EVAL_INTERVAL = 60_000;   // 60 seconds
const RULES_CACHE_TTL = 5 * 60_000; // 5 minutes

let evalTimer = null;
let rulesCache = null;
let rulesCacheTime = 0;
const cooldownMap = new Map(); // ruleId -> lastFiredAt

/**
 * Load alert rules from DB (cached 5 min).
 */
async function loadRules() {
  const now = Date.now();
  if (rulesCache && now - rulesCacheTime < RULES_CACHE_TTL) return rulesCache;

  try {
    const rows = await adminSql`
      SELECT * FROM platform_alert_rules WHERE enabled = true
    `;
    rulesCache = Array.from(rows);
    rulesCacheTime = now;
    return rulesCache;
  } catch {
    return rulesCache || [];
  }
}

/**
 * Get current metric value for a rule.
 */
async function getMetricValue(rule) {
  const { metric_type, metric_name } = rule;

  if (metric_type === 'pool') {
    const pool = getPoolMetrics();
    const tenant = pool.tenant || {};
    if (metric_name === 'utilization_pct') {
      const poolMax = parseInt(process.env.TENANT_POOL_MAX || '30', 10);
      return poolMax > 0 ? Math.round((tenant.active / poolMax) * 100) : 0;
    }
    if (metric_name === 'failures') return tenant.failures || 0;
  }

  if (metric_type === 'request') {
    const req = getRequestMetrics();
    if (metric_name === 'error_rate') return req.errorRate;
  }

  if (metric_type === 'memory') {
    const mem = process.memoryUsage();
    if (metric_name === 'heap_pct') {
      return Math.round((mem.heapUsed / mem.heapTotal) * 100);
    }
  }

  if (metric_type === 'service') {
    try {
      const checks = await runServiceChecks();
      const flat = { ...checks };
      // Flatten DNS
      if (checks.dns) {
        for (const [domain, status] of Object.entries(checks.dns)) {
          flat[`dns_${domain.replace(/\./g, '_')}`] = status;
        }
      }
      const svc = flat[metric_name];
      if (svc) {
        // Convert status to numeric: ok=0, degraded=1, down=2
        return svc.status === 'ok' ? 0 : svc.status === 'degraded' ? 1 : 2;
      }
    } catch {
      return 0;
    }
  }

  return 0;
}

/**
 * Check if a value exceeds a rule threshold.
 */
function checkCondition(value, condition, threshold) {
  switch (condition) {
    case '>': return value > threshold;
    case '>=': return value >= threshold;
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    default: return false;
  }
}

/**
 * Fire a webhook notification (fire-and-forget).
 */
async function fireWebhook(url, alert) {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        timestamp: alert.created_at,
        metadata: alert.metadata,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error('[AlertEvaluator] Webhook failed:', err.message);
  }
}

/**
 * Evaluate all enabled rules against current metrics.
 */
async function evaluateRules() {
  const rules = await loadRules();
  const now = Date.now();

  for (const rule of rules) {
    try {
      // Check cooldown
      const lastFired = cooldownMap.get(rule.id) || 0;
      if (now - lastFired < (rule.cooldown_minutes || 5) * 60_000) continue;

      const value = await getMetricValue(rule);
      const triggered = checkCondition(value, rule.condition, rule.threshold);

      if (triggered) {
        const alert = {
          severity: rule.severity,
          category: rule.metric_type,
          title: rule.name,
          message: `${rule.metric_name} ${rule.condition} ${rule.threshold} (current: ${value})`,
          metadata: JSON.stringify({ rule_id: rule.id, value, threshold: rule.threshold }),
          created_at: new Date().toISOString(),
        };

        // Insert alert
        await adminSql`
          INSERT INTO platform_alerts (severity, category, title, message, metadata)
          VALUES (${alert.severity}, ${alert.category}, ${alert.title}, ${alert.message}, ${alert.metadata})
        `.catch(() => {});

        // Fire webhook
        fireWebhook(rule.webhook_url, alert);

        // Update cooldown
        cooldownMap.set(rule.id, now);

        console.log(`[AlertEvaluator] ALERT: ${alert.severity} — ${alert.title}: ${alert.message}`);
      }
    } catch (err) {
      console.error(`[AlertEvaluator] Rule ${rule.id} eval failed:`, err.message);
    }
  }
}

/**
 * Start the alert evaluator.
 */
export function startAlertEvaluator() {
  console.log('[AlertEvaluator] Starting (60s evaluation cycle)');
  evalTimer = setInterval(evaluateRules, EVAL_INTERVAL);
}

/**
 * Stop the alert evaluator.
 */
export function stopAlertEvaluator() {
  if (evalTimer) clearInterval(evalTimer);
  evalTimer = null;
  console.log('[AlertEvaluator] Stopped');
}

/**
 * Invalidate rules cache (after CRUD operations).
 */
export function invalidateRulesCache() {
  rulesCache = null;
  rulesCacheTime = 0;
}
