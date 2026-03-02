import { Router } from 'express';
import { adminSql } from '../db/index.js';
import { getTenant } from '../tenants.js';
import { generateDemoData } from '../lib/demoDataGenerator.js';

const router = Router();

const DEMO_SOURCE = 'demo_generator';

/**
 * Admin auth — same pattern as admin.js
 */
function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  }
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin secret' });
  }
  next();
}

router.use(requireAdmin);

// ─── POST /admin/stress-test/generate ────────────────────

router.post('/generate', async (req, res) => {
  try {
    const { tenant_id, volume, date_range_days, include_delivery, include_loyalty, include_ai, include_financials } = req.body;

    if (!tenant_id) {
      return res.status(400).json({ error: 'tenant_id is required' });
    }

    const tenant = await getTenant(tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Check for existing demo data
    const [existing] = await adminSql`
      SELECT COUNT(*)::int AS c FROM orders
      WHERE tenant_id = ${tenant_id} AND source = ${DEMO_SOURCE}
    `;
    if (existing.c > 0) {
      return res.status(409).json({ error: 'Demo data already exists for this tenant. Delete it first.' });
    }

    // Create tracking record
    const config = {
      volume: volume || 'medium',
      date_range_days: date_range_days || 30,
      include_delivery: include_delivery !== false,
      include_loyalty: include_loyalty !== false,
      include_ai: include_ai !== false,
      include_financials: include_financials !== false,
    };

    const [run] = await adminSql`
      INSERT INTO stress_test_runs (tenant_id, config)
      VALUES (${tenant_id}, ${JSON.stringify(config)})
      RETURNING id
    `;

    const summary = await generateDemoData(adminSql, {
      tenantId: tenant_id,
      batchId: run.id,
      volume: config.volume,
      dateRangeDays: config.date_range_days,
      includeDelivery: config.include_delivery,
      includeLoyalty: config.include_loyalty,
      includeAi: config.include_ai,
      includeFinancials: config.include_financials,
    });

    // Update run with summary
    await adminSql`
      UPDATE stress_test_runs SET summary = ${JSON.stringify(summary)}
      WHERE id = ${run.id}
    `;

    res.json({ run_id: run.id, summary });
  } catch (error) {
    console.error('[DemoData] Generate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate demo data' });
  }
});

// ─── GET /admin/stress-test/status/:tenantId ─────────────

router.get('/status/:tenantId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId;

    const runs = await adminSql`
      SELECT id, config, summary, created_at
      FROM stress_test_runs
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    // Count demo records across tables
    const [orderCount] = await adminSql`
      SELECT COUNT(*)::int AS c FROM orders
      WHERE tenant_id = ${tenantId} AND source = ${DEMO_SOURCE}
    `;
    const [customerCount] = await adminSql`
      SELECT COUNT(*)::int AS c FROM loyalty_customers
      WHERE tenant_id = ${tenantId} AND demo_batch_id IS NOT NULL
    `;
    const [deliveryCount] = await adminSql`
      SELECT COUNT(*)::int AS c FROM delivery_orders
      WHERE tenant_id = ${tenantId}
        AND order_id IN (SELECT id FROM orders WHERE tenant_id = ${tenantId} AND source = ${DEMO_SOURCE})
    `;
    const [snapshotCount] = await adminSql`
      SELECT COUNT(*)::int AS c FROM ai_hourly_snapshots
      WHERE tenant_id = ${tenantId} AND demo_batch_id IS NOT NULL
    `;
    const [financialCount] = await adminSql`
      SELECT COUNT(*)::int AS c FROM financial_actuals
      WHERE tenant_id = ${tenantId} AND demo_batch_id IS NOT NULL
    `;

    res.json({
      hasDemo: orderCount.c > 0 || customerCount.c > 0,
      runs: runs.map(r => ({
        id: r.id,
        config: r.config,
        summary: r.summary,
        created_at: r.created_at,
      })),
      counts: {
        orders: orderCount.c,
        customers: customerCount.c,
        delivery_orders: deliveryCount.c,
        ai_snapshots: snapshotCount.c,
        financial_actuals: financialCount.c,
      },
    });
  } catch (error) {
    console.error('[DemoData] Status error:', error);
    res.status(500).json({ error: 'Failed to fetch demo data status' });
  }
});

// ─── DELETE /admin/stress-test/:tenantId ─────────────────

router.delete('/:tenantId', async (req, res) => {
  try {
    const tenantId = req.params.tenantId;

    const deleted = {};

    await adminSql.begin(async (sql) => {
      // Layer 1: deepest leaves (FK children)
      // Order item modifiers for demo orders
      const r1 = await sql.unsafe(`
        DELETE FROM order_item_modifiers
        WHERE tenant_id = $1
          AND order_item_id IN (
            SELECT oi.id FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.tenant_id = $1 AND o.source = $2
          )
      `, [tenantId, DEMO_SOURCE]);
      deleted.order_item_modifiers = r1.count;

      // Stamp events with demo_batch_id
      const r2 = await sql.unsafe(
        `DELETE FROM stamp_events WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.stamp_events = r2.count;

      // Referral events with demo_batch_id
      const r3 = await sql.unsafe(
        `DELETE FROM referral_events WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.referral_events = r3.count;

      // Layer 2: order items, payments, delivery orders, stamp cards
      const r4 = await sql.unsafe(`
        DELETE FROM order_items
        WHERE tenant_id = $1
          AND order_id IN (SELECT id FROM orders WHERE tenant_id = $1 AND source = $2)
      `, [tenantId, DEMO_SOURCE]);
      deleted.order_items = r4.count;

      const r5 = await sql.unsafe(`
        DELETE FROM order_payments
        WHERE tenant_id = $1
          AND order_id IN (SELECT id FROM orders WHERE tenant_id = $1 AND source = $2)
      `, [tenantId, DEMO_SOURCE]);
      deleted.order_payments = r5.count;

      const r6 = await sql.unsafe(`
        DELETE FROM delivery_orders
        WHERE tenant_id = $1
          AND order_id IN (SELECT id FROM orders WHERE tenant_id = $1 AND source = $2)
      `, [tenantId, DEMO_SOURCE]);
      deleted.delivery_orders = r6.count;

      const r7 = await sql.unsafe(
        `DELETE FROM stamp_cards WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.stamp_cards = r7.count;

      // Layer 3: AI tables
      const r8 = await sql.unsafe(
        `DELETE FROM ai_suggestion_cache WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.ai_suggestion_cache = r8.count;

      const r9 = await sql.unsafe(
        `DELETE FROM ai_item_pairs WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.ai_item_pairs = r9.count;

      const r10 = await sql.unsafe(
        `DELETE FROM ai_inventory_velocity WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.ai_inventory_velocity = r10.count;

      const r11 = await sql.unsafe(
        `DELETE FROM ai_hourly_snapshots WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.ai_hourly_snapshots = r11.count;

      // Layer 4: financial actuals, loyalty customers
      const r12 = await sql.unsafe(
        `DELETE FROM financial_actuals WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.financial_actuals = r12.count;

      const r13 = await sql.unsafe(
        `DELETE FROM loyalty_customers WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.loyalty_customers = r13.count;

      // Layer 5: orders
      const r14 = await sql.unsafe(
        `DELETE FROM orders WHERE tenant_id = $1 AND source = $2`, [tenantId, DEMO_SOURCE]
      );
      deleted.orders = r14.count;

      // Layer 6: stress_test_runs
      const r15 = await sql.unsafe(
        `DELETE FROM stress_test_runs WHERE tenant_id = $1`, [tenantId]
      );
      deleted.stress_test_runs = r15.count;
    });

    res.json({ deleted });
  } catch (error) {
    console.error('[DemoData] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete demo data' });
  }
});

export default router;
