import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { adminSql } from '../db/index.js';
import { BCRYPT_ROUNDS } from '../lib/constants.js';
import { getTenant } from '../tenants.js';
import { generateDemoData } from '../lib/demoDataGenerator.js';
import { sendSalesRepWelcomeEmail } from '../helpers/email.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const SALES_JWT_EXPIRY = '7d';

// ==================== Auth Middleware ====================

/**
 * Verify Bearer JWT, look up the sales rep, and attach to req.salesRep.
 * Token payload must contain { salesRepId }.
 */
async function requireSalesAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);

    if (!decoded.salesRepId) {
      return res.status(401).json({ error: 'Invalid token: missing salesRepId' });
    }

    const [rep] = await adminSql`
      SELECT id, user_id, full_name, email, phone, is_manager, is_active, created_at
      FROM sales_reps WHERE id = ${decoded.salesRepId}
    `;

    if (!rep) {
      return res.status(401).json({ error: 'Sales rep not found' });
    }
    if (!rep.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    req.salesRep = rep;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('[sales] Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Requires requireSalesAuth to have run first, then checks is_manager.
 */
function requireManager(req, res, next) {
  if (!req.salesRep?.is_manager) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
}

// ==================== Public Endpoints (no auth) ====================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
});

// POST /api/sales/login — email + password → JWT
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rep] = await adminSql`
      SELECT id, full_name, email, phone, is_manager, is_active, password_hash
      FROM sales_reps WHERE email = ${email.toLowerCase().trim()}
    `;

    if (!rep || !rep.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!rep.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    const valid = await bcrypt.compare(password, rep.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { salesRepId: rep.id, email: rep.email, is_manager: rep.is_manager },
      JWT_SECRET,
      { expiresIn: SALES_JWT_EXPIRY }
    );

    res.json({
      token,
      rep: { id: rep.id, full_name: rep.full_name, email: rep.email, phone: rep.phone, is_manager: rep.is_manager },
    });
  } catch (error) {
    console.error('[sales] POST /login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// All routes below require sales rep auth
router.use(requireSalesAuth);

// ==================== Rep Endpoints ====================

// GET /api/sales/me — rep profile + summary stats
router.get('/me', async (req, res) => {
  try {
    const repId = req.salesRep.id;

    const [stats] = await adminSql`
      SELECT
        (SELECT COUNT(*) FROM prospects WHERE sales_rep_id = ${repId})::int
          AS total_prospects,
        (SELECT COUNT(*) FROM prospects WHERE sales_rep_id = ${repId} AND status = 'converted')::int
          AS conversion_count,
        COALESCE((SELECT SUM(commission_amount_usd) FROM commissions WHERE sales_rep_id = ${repId} AND status = 'pending'), 0)
          AS pending_commissions_total,
        COALESCE((SELECT SUM(commission_amount_usd) FROM commissions WHERE sales_rep_id = ${repId} AND status = 'approved'), 0)
          AS approved_commissions_total,
        COALESCE((SELECT SUM(commission_amount_usd) FROM commissions WHERE sales_rep_id = ${repId} AND status = 'paid'), 0)
          AS paid_commissions_total
    `;

    res.json({ rep: req.salesRep, stats });
  } catch (error) {
    console.error('[sales] GET /me error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// GET /api/sales/prospects — rep's prospects (filterable)
router.get('/prospects', async (req, res) => {
  try {
    const repId = req.salesRep.id;
    const { status, search } = req.query;

    const prospects = await adminSql`
      SELECT *
      FROM prospects
      WHERE sales_rep_id = ${repId}
        ${status ? adminSql`AND status = ${status}` : adminSql``}
        ${search ? adminSql`AND business_name ILIKE ${'%' + search + '%'}` : adminSql``}
      ORDER BY updated_at DESC
    `;

    res.json(prospects);
  } catch (error) {
    console.error('[sales] GET /prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

// POST /api/sales/prospects — create a new prospect
router.post('/prospects', async (req, res) => {
  try {
    const { business_name, contact_name, phone, email, address, neighborhood, notes, status } = req.body;

    if (!business_name) {
      return res.status(400).json({ error: 'business_name is required' });
    }

    const validStatuses = ['visited', 'interested', 'demo_scheduled', 'trial', 'converted', 'not_interested'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [prospect] = await adminSql`
      INSERT INTO prospects (sales_rep_id, business_name, contact_name, phone, email, address, neighborhood, notes, status)
      VALUES (${req.salesRep.id}, ${business_name}, ${contact_name || null}, ${phone || null}, ${email || null},
              ${address || null}, ${neighborhood || null}, ${notes || null}, ${status || 'visited'})
      RETURNING *
    `;

    res.status(201).json(prospect);
  } catch (error) {
    console.error('[sales] POST /prospects error:', error);
    res.status(500).json({ error: 'Failed to create prospect' });
  }
});

// PATCH /api/sales/prospects/:id — update prospect
router.patch('/prospects/:id', async (req, res) => {
  try {
    const repId = req.salesRep.id;
    const { id } = req.params;

    // Verify ownership
    const [existing] = await adminSql`
      SELECT id FROM prospects WHERE id = ${id} AND sales_rep_id = ${repId}
    `;
    if (!existing) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    const { status, notes, contact_name, phone, email, address, neighborhood, business_name, converted_tenant_id } = req.body;

    const validStatuses = ['visited', 'interested', 'demo_scheduled', 'trial', 'converted', 'not_interested'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [updated] = await adminSql`
      UPDATE prospects SET
        status = COALESCE(${status || null}, status),
        notes = COALESCE(${notes !== undefined ? notes : null}, notes),
        contact_name = COALESCE(${contact_name || null}, contact_name),
        phone = COALESCE(${phone || null}, phone),
        email = COALESCE(${email || null}, email),
        address = COALESCE(${address || null}, address),
        neighborhood = COALESCE(${neighborhood || null}, neighborhood),
        business_name = COALESCE(${business_name || null}, business_name),
        converted_tenant_id = COALESCE(${converted_tenant_id || null}, converted_tenant_id),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(updated);
  } catch (error) {
    console.error('[sales] PATCH /prospects/:id error:', error);
    res.status(500).json({ error: 'Failed to update prospect' });
  }
});

// GET /api/sales/commissions — rep's commissions with details
router.get('/commissions', async (req, res) => {
  try {
    const repId = req.salesRep.id;

    const commissions = await adminSql`
      SELECT
        c.*,
        p.business_name AS prospect_business_name,
        p.contact_name AS prospect_contact_name,
        p.status AS prospect_status,
        t.name AS tenant_name,
        t.plan AS tenant_plan,
        a.full_name AS approved_by_name
      FROM commissions c
      JOIN prospects p ON p.id = c.prospect_id
      LEFT JOIN tenants t ON t.id = c.tenant_id
      LEFT JOIN sales_reps a ON a.id = c.approved_by
      WHERE c.sales_rep_id = ${repId}
      ORDER BY c.created_at DESC
    `;

    res.json(commissions);
  } catch (error) {
    console.error('[sales] GET /commissions error:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// GET /api/sales/tenants — list tenants for linking to prospects
router.get('/tenants', async (req, res) => {
  try {
    // Only show trial tenants — prevents accidentally seeding paying customers
    const tenants = await adminSql`
      SELECT id, name, subdomain, plan FROM tenants
      WHERE active = true AND plan = 'trial'
      ORDER BY name
    `;
    res.json(tenants);
  } catch (error) {
    console.error('[sales] GET /tenants error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// ==================== Demo Data Endpoints ====================

const DEMO_SOURCE = 'demo_generator';

/**
 * Helper: look up a prospect, verify it belongs to the requesting rep,
 * and optionally require a linked tenant.
 */
async function getOwnedProspect(repId, prospectId, { requireTenant = false } = {}) {
  const [prospect] = await adminSql`
    SELECT id, sales_rep_id, status, converted_tenant_id
    FROM prospects WHERE id = ${prospectId} AND sales_rep_id = ${repId}
  `;
  if (!prospect) return { error: 'Prospect not found', status: 404 };
  if (requireTenant && !prospect.converted_tenant_id) {
    return { error: 'No tenant linked to this prospect', status: 400 };
  }
  return { prospect };
}

// POST /api/sales/demo/generate — generate demo data for a prospect's tenant
router.post('/demo/generate', async (req, res) => {
  try {
    const { prospect_id } = req.body;
    if (!prospect_id) return res.status(400).json({ error: 'prospect_id is required' });

    const result = await getOwnedProspect(req.salesRep.id, prospect_id, { requireTenant: true });
    if (result.error) return res.status(result.status).json({ error: result.error });

    const { prospect } = result;
    const tenantId = prospect.converted_tenant_id;

    const tenant = await getTenant(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Linked tenant not found' });

    // Safety: only allow demo data on trial tenants
    if (tenant.plan !== 'trial') {
      return res.status(403).json({ error: `Cannot generate demo data for a ${tenant.plan} plan tenant. Only trial tenants are allowed.` });
    }

    // Check for existing demo data
    const [existing] = await adminSql`
      SELECT COUNT(*)::int AS c FROM orders
      WHERE tenant_id = ${tenantId} AND source = ${DEMO_SOURCE}
    `;
    if (existing.c > 0) {
      return res.status(409).json({ error: 'Demo data already exists. Delete it first.' });
    }

    // Create tracking record
    const [run] = await adminSql`
      INSERT INTO stress_test_runs (tenant_id, config)
      VALUES (${tenantId}, ${JSON.stringify({ volume: 'medium', date_range_days: 30, source: 'sales_rep', sales_rep_id: req.salesRep.id })})
      RETURNING id
    `;

    const summary = await generateDemoData(adminSql, {
      tenantId,
      batchId: run.id,
      volume: 'medium',
      dateRangeDays: 30,
      includeDelivery: true,
      includeLoyalty: true,
      includeAi: true,
      includeFinancials: true,
    });

    await adminSql`
      UPDATE stress_test_runs SET summary = ${JSON.stringify(summary)} WHERE id = ${run.id}
    `;

    res.json({ run_id: run.id, summary });
  } catch (error) {
    console.error('[sales] POST /demo/generate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate demo data' });
  }
});

// GET /api/sales/demo/status/:prospectId — check demo data status
router.get('/demo/status/:prospectId', async (req, res) => {
  try {
    const result = await getOwnedProspect(req.salesRep.id, req.params.prospectId);
    if (result.error) return res.status(result.status).json({ error: result.error });

    const { prospect } = result;
    if (!prospect.converted_tenant_id) {
      return res.json({ hasTenant: false, tenant_id: null, tenant_name: null, hasDemo: false, counts: null });
    }

    const tenantId = prospect.converted_tenant_id;
    const tenant = await getTenant(tenantId);

    const [[orderCount], [customerCount], [deliveryCount], [snapshotCount], [financialCount]] = await Promise.all([
      adminSql`SELECT COUNT(*)::int AS c FROM orders WHERE tenant_id = ${tenantId} AND source = ${DEMO_SOURCE}`,
      adminSql`SELECT COUNT(*)::int AS c FROM loyalty_customers WHERE tenant_id = ${tenantId} AND demo_batch_id IS NOT NULL`,
      adminSql`SELECT COUNT(*)::int AS c FROM delivery_orders WHERE tenant_id = ${tenantId} AND order_id IN (SELECT id FROM orders WHERE tenant_id = ${tenantId} AND source = ${DEMO_SOURCE})`,
      adminSql`SELECT COUNT(*)::int AS c FROM ai_hourly_snapshots WHERE tenant_id = ${tenantId} AND demo_batch_id IS NOT NULL`,
      adminSql`SELECT COUNT(*)::int AS c FROM financial_actuals WHERE tenant_id = ${tenantId} AND demo_batch_id IS NOT NULL`,
    ]);

    res.json({
      hasTenant: true,
      tenant_id: tenantId,
      tenant_name: tenant?.name || tenantId,
      hasDemo: orderCount.c > 0 || customerCount.c > 0,
      counts: {
        orders: orderCount.c,
        customers: customerCount.c,
        delivery_orders: deliveryCount.c,
        ai_snapshots: snapshotCount.c,
        financial_actuals: financialCount.c,
      },
    });
  } catch (error) {
    console.error('[sales] GET /demo/status error:', error);
    res.status(500).json({ error: 'Failed to fetch demo status' });
  }
});

// DELETE /api/sales/demo/:prospectId — delete demo data for a prospect's tenant
router.delete('/demo/:prospectId', async (req, res) => {
  try {
    const result = await getOwnedProspect(req.salesRep.id, req.params.prospectId, { requireTenant: true });
    if (result.error) return res.status(result.status).json({ error: result.error });

    const tenantId = result.prospect.converted_tenant_id;
    const deleted = {};

    await adminSql.begin(async (sql) => {
      const r1 = await sql.unsafe(`
        DELETE FROM order_item_modifiers WHERE tenant_id = $1
          AND order_item_id IN (
            SELECT oi.id FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.tenant_id = $1 AND o.source = $2
          )
      `, [tenantId, DEMO_SOURCE]);
      deleted.order_item_modifiers = r1.count;

      const r2 = await sql.unsafe(
        `DELETE FROM stamp_events WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.stamp_events = r2.count;

      const r3 = await sql.unsafe(
        `DELETE FROM referral_events WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.referral_events = r3.count;

      const r4 = await sql.unsafe(`
        DELETE FROM order_items WHERE tenant_id = $1
          AND order_id IN (SELECT id FROM orders WHERE tenant_id = $1 AND source = $2)
      `, [tenantId, DEMO_SOURCE]);
      deleted.order_items = r4.count;

      const r5 = await sql.unsafe(`
        DELETE FROM order_payments WHERE tenant_id = $1
          AND order_id IN (SELECT id FROM orders WHERE tenant_id = $1 AND source = $2)
      `, [tenantId, DEMO_SOURCE]);
      deleted.order_payments = r5.count;

      const r6 = await sql.unsafe(`
        DELETE FROM delivery_orders WHERE tenant_id = $1
          AND order_id IN (SELECT id FROM orders WHERE tenant_id = $1 AND source = $2)
      `, [tenantId, DEMO_SOURCE]);
      deleted.delivery_orders = r6.count;

      const r7 = await sql.unsafe(
        `DELETE FROM stamp_cards WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.stamp_cards = r7.count;

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

      const r12 = await sql.unsafe(
        `DELETE FROM financial_actuals WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.financial_actuals = r12.count;

      const r13 = await sql.unsafe(
        `DELETE FROM loyalty_customers WHERE tenant_id = $1 AND demo_batch_id IS NOT NULL`, [tenantId]
      );
      deleted.loyalty_customers = r13.count;

      const r14 = await sql.unsafe(
        `DELETE FROM orders WHERE tenant_id = $1 AND source = $2`, [tenantId, DEMO_SOURCE]
      );
      deleted.orders = r14.count;

      const r15 = await sql.unsafe(
        `DELETE FROM stress_test_runs WHERE tenant_id = $1`, [tenantId]
      );
      deleted.stress_test_runs = r15.count;
    });

    res.json({ deleted });
  } catch (error) {
    console.error('[sales] DELETE /demo error:', error);
    res.status(500).json({ error: 'Failed to delete demo data' });
  }
});

// ==================== Manager Endpoints ====================

// GET /api/sales/manager/reps — all active reps with stats
router.get('/manager/reps', requireManager, async (req, res) => {
  try {
    const reps = await adminSql`
      SELECT
        sr.id, sr.user_id, sr.full_name, sr.email, sr.phone, sr.is_manager, sr.is_active, sr.created_at,
        (SELECT COUNT(*) FROM prospects WHERE sales_rep_id = sr.id)::int
          AS total_prospects,
        (SELECT COUNT(*) FROM prospects WHERE sales_rep_id = sr.id AND status = 'converted')::int
          AS conversion_count,
        COALESCE((SELECT SUM(commission_amount_usd) FROM commissions WHERE sales_rep_id = sr.id AND status = 'pending'), 0)
          AS pending_commissions_total,
        COALESCE((SELECT SUM(commission_amount_usd) FROM commissions WHERE sales_rep_id = sr.id AND status = 'approved'), 0)
          AS approved_commissions_total,
        COALESCE((SELECT SUM(commission_amount_usd) FROM commissions WHERE sales_rep_id = sr.id AND status = 'paid'), 0)
          AS paid_commissions_total
      FROM sales_reps sr
      WHERE sr.is_active = true
      ORDER BY sr.full_name
    `;

    res.json(reps);
  } catch (error) {
    console.error('[sales] GET /manager/reps error:', error);
    res.status(500).json({ error: 'Failed to fetch reps' });
  }
});

// GET /api/sales/manager/prospects — all prospects, filterable
router.get('/manager/prospects', requireManager, async (req, res) => {
  try {
    const { rep_id, status } = req.query;

    const prospects = await adminSql`
      SELECT
        p.*,
        sr.full_name AS sales_rep_name
      FROM prospects p
      JOIN sales_reps sr ON sr.id = p.sales_rep_id
      WHERE 1=1
        ${rep_id ? adminSql`AND p.sales_rep_id = ${rep_id}` : adminSql``}
        ${status ? adminSql`AND p.status = ${status}` : adminSql``}
      ORDER BY p.updated_at DESC
    `;

    res.json(prospects);
  } catch (error) {
    console.error('[sales] GET /manager/prospects error:', error);
    res.status(500).json({ error: 'Failed to fetch prospects' });
  }
});

// GET /api/sales/manager/commissions — all commissions, filterable
router.get('/manager/commissions', requireManager, async (req, res) => {
  try {
    const { status, rep_id } = req.query;

    const commissions = await adminSql`
      SELECT
        c.*,
        sr.full_name AS sales_rep_name,
        p.business_name AS prospect_business_name,
        t.name AS tenant_name,
        a.full_name AS approved_by_name
      FROM commissions c
      JOIN sales_reps sr ON sr.id = c.sales_rep_id
      JOIN prospects p ON p.id = c.prospect_id
      LEFT JOIN tenants t ON t.id = c.tenant_id
      LEFT JOIN sales_reps a ON a.id = c.approved_by
      WHERE 1=1
        ${status ? adminSql`AND c.status = ${status}` : adminSql``}
        ${rep_id ? adminSql`AND c.sales_rep_id = ${rep_id}` : adminSql``}
      ORDER BY c.created_at DESC
    `;

    res.json(commissions);
  } catch (error) {
    console.error('[sales] GET /manager/commissions error:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// PATCH /api/sales/manager/commissions/:id — approve, reject, or mark paid
router.patch('/manager/commissions/:id', requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['approved', 'rejected', 'paid'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `status is required. Must be one of: ${validStatuses.join(', ')}` });
    }

    const [existing] = await adminSql`
      SELECT id, status FROM commissions WHERE id = ${id}
    `;
    if (!existing) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    // Build update fields based on status
    const approvedBy = (status === 'approved' || status === 'rejected') ? req.salesRep.id : null;
    const approvedAt = (status === 'approved' || status === 'rejected') ? new Date() : null;
    const paidAt = status === 'paid' ? new Date() : null;

    const [updated] = await adminSql`
      UPDATE commissions SET
        status = ${status},
        notes = COALESCE(${notes || null}, notes),
        approved_by = COALESCE(${approvedBy}, approved_by),
        approved_at = COALESCE(${approvedAt}, approved_at),
        paid_at = COALESCE(${paidAt}, paid_at)
      WHERE id = ${id}
      RETURNING *
    `;

    res.json(updated);
  } catch (error) {
    console.error('[sales] PATCH /manager/commissions/:id error:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// GET /api/sales/manager/velocity — VC-ready analytics
router.get('/manager/velocity', requireManager, async (req, res) => {
  try {
    const { months } = req.query;
    const monthCount = Math.min(Math.max(parseInt(months) || 6, 1), 24);
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - monthCount);
    fromDate.setDate(1);
    fromDate.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      monthlyPipeline,
      monthlyConversions,
      monthlyMrr,
      cycleStats,
      cycleByRep,
      overallCounts,
      rateByRep,
      repLeaderboard,
      cohortRaw,
      repWeeklyConversions,
      activePipeline,
    ] = await Promise.all([
      // 1. Monthly pipeline: new prospects per month
      adminSql`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM prospects
        WHERE created_at >= ${fromDate.toISOString()}
        GROUP BY 1 ORDER BY 1
      `,
      // 2. Monthly conversions
      adminSql`
        SELECT to_char(date_trunc('month', converted_at), 'YYYY-MM') AS month,
               COUNT(*)::int AS count
        FROM prospects
        WHERE status = 'converted' AND converted_at IS NOT NULL
          AND converted_at >= ${fromDate.toISOString()}
        GROUP BY 1 ORDER BY 1
      `,
      // 3. Monthly MRR attributed (commission_amount_usd for converted, which represents plan_price_usd)
      adminSql`
        SELECT to_char(date_trunc('month', c.created_at), 'YYYY-MM') AS month,
               COALESCE(SUM(c.plan_price_usd), 0)::numeric AS mrr
        FROM commissions c
        WHERE c.created_at >= ${fromDate.toISOString()}
        GROUP BY 1 ORDER BY 1
      `,
      // 4. Avg cycle days overall (created_at → converted_at)
      adminSql`
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (converted_at - created_at)) / 86400), 0)::numeric AS avg_days,
               COUNT(*)::int AS count
        FROM prospects
        WHERE status = 'converted' AND converted_at IS NOT NULL
      `,
      // 5. Avg cycle days per rep
      adminSql`
        SELECT p.sales_rep_id, sr.full_name,
               AVG(EXTRACT(EPOCH FROM (p.converted_at - p.created_at)) / 86400)::numeric AS avg_days,
               COUNT(*)::int AS count
        FROM prospects p
        JOIN sales_reps sr ON sr.id = p.sales_rep_id
        WHERE p.status = 'converted' AND p.converted_at IS NOT NULL
        GROUP BY p.sales_rep_id, sr.full_name
      `,
      // 6. Overall conversion rate
      adminSql`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'converted')::int AS converted
        FROM prospects
      `,
      // 7. Conversion rate by rep
      adminSql`
        SELECT p.sales_rep_id, sr.full_name,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE p.status = 'converted')::int AS converted
        FROM prospects p
        JOIN sales_reps sr ON sr.id = p.sales_rep_id
        GROUP BY p.sales_rep_id, sr.full_name
      `,
      // 8. Rep leaderboard
      adminSql`
        SELECT sr.id, sr.full_name,
               COUNT(DISTINCT p.id)::int AS prospects_logged,
               COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'converted')::int AS converted,
               COALESCE(AVG(EXTRACT(EPOCH FROM (p.converted_at - p.created_at)) / 86400)
                 FILTER (WHERE p.status = 'converted' AND p.converted_at IS NOT NULL), 0)::numeric AS avg_cycle_days,
               COALESCE(SUM(c.plan_price_usd), 0)::numeric AS mrr_attributed,
               COALESCE(SUM(c.commission_amount_usd), 0)::numeric AS commission_earned
        FROM sales_reps sr
        LEFT JOIN prospects p ON p.sales_rep_id = sr.id
        LEFT JOIN commissions c ON c.sales_rep_id = sr.id AND c.prospect_id = p.id
        WHERE sr.is_active = true
        GROUP BY sr.id, sr.full_name
        ORDER BY mrr_attributed DESC
      `,
      // 9. Cohort data: prospects grouped by week created, with conversion bucket counts
      adminSql`
        SELECT
          date_trunc('week', created_at)::date AS cohort_week,
          COUNT(*)::int AS logged,
          COUNT(*) FILTER (WHERE status = 'converted' AND converted_at IS NOT NULL
            AND converted_at - created_at <= interval '7 days')::int AS within_7d,
          COUNT(*) FILTER (WHERE status = 'converted' AND converted_at IS NOT NULL
            AND converted_at - created_at <= interval '14 days')::int AS within_14d,
          COUNT(*) FILTER (WHERE status = 'converted' AND converted_at IS NOT NULL
            AND converted_at - created_at <= interval '30 days')::int AS within_30d,
          COUNT(*) FILTER (WHERE status = 'converted' AND converted_at IS NOT NULL
            AND converted_at - created_at <= interval '60 days')::int AS within_60d,
          COUNT(*) FILTER (WHERE status = 'converted' AND converted_at IS NOT NULL)::int AS within_90d_plus
        FROM prospects
        GROUP BY 1
        ORDER BY 1 DESC
      `,
      // 10. Rep weekly conversions (last 8 weeks) for sparklines
      adminSql`
        SELECT p.sales_rep_id,
               date_trunc('week', p.converted_at)::date AS week,
               COUNT(*)::int AS count
        FROM prospects p
        WHERE p.status = 'converted' AND p.converted_at IS NOT NULL
          AND p.converted_at >= NOW() - interval '8 weeks'
        GROUP BY 1, 2
        ORDER BY 2
      `,
      // 11. Active pipeline count + avg plan value for velocity score
      adminSql`
        SELECT
          COUNT(*)::int AS active_count,
          COALESCE(AVG(c.plan_price_usd), 0)::numeric AS avg_plan_value
        FROM prospects p
        LEFT JOIN commissions c ON c.prospect_id = p.id
        WHERE p.status NOT IN ('converted', 'not_interested')
      `,
    ]);

    // Build month labels
    const monthLabels = [];
    const d = new Date(fromDate);
    const now = new Date();
    while (d <= now) {
      monthLabels.push(d.toISOString().slice(0, 7));
      d.setMonth(d.getMonth() + 1);
    }

    const toMap = (rows, keyCol = 'month', valCol = 'count') =>
      Object.fromEntries(rows.map(r => [r[keyCol], Number(r[valCol])]));

    const pipelineMap = toMap(monthlyPipeline);
    const conversionMap = toMap(monthlyConversions);
    const mrrMap = toMap(monthlyMrr, 'month', 'mrr');

    // Compute velocity score
    const oc = overallCounts[0] || { total: 0, converted: 0 };
    const convRate = oc.total > 0 ? oc.converted / oc.total : 0;
    const avgCycle = Number(cycleStats[0]?.avg_days || 0);
    const ap = activePipeline[0] || { active_count: 0, avg_plan_value: 0 };
    const velocityScore = avgCycle > 0
      ? (ap.active_count * convRate * Number(ap.avg_plan_value)) / avgCycle
      : 0;

    // Build sparkline data per rep (8 weeks)
    const sparklineMap = {};
    const weekLabels = [];
    for (let i = 7; i >= 0; i--) {
      const wd = new Date();
      wd.setDate(wd.getDate() - wd.getDay() - (i * 7));
      weekLabels.push(wd.toISOString().slice(0, 10));
    }
    for (const row of repWeeklyConversions) {
      if (!sparklineMap[row.sales_rep_id]) sparklineMap[row.sales_rep_id] = {};
      sparklineMap[row.sales_rep_id][row.week] = row.count;
    }

    const totalMrr = monthLabels.reduce((s, m) => s + (mrrMap[m] || 0), 0);

    res.json({
      monthly_pipeline: monthLabels.map(m => ({ month: m, count: pipelineMap[m] || 0 })),
      monthly_conversions: monthLabels.map(m => ({ month: m, count: conversionMap[m] || 0 })),
      monthly_mrr_attributed: monthLabels.map(m => ({ month: m, mrr: mrrMap[m] || 0 })),
      avg_cycle_days: {
        overall: Math.round(avgCycle * 10) / 10,
        by_rep: cycleByRep.map(r => ({
          rep_id: r.sales_rep_id,
          rep_name: r.full_name,
          avg_days: Math.round(Number(r.avg_days) * 10) / 10,
          count: r.count,
        })),
      },
      conversion_rate_overall: {
        rate: oc.total > 0 ? Math.round((oc.converted / oc.total) * 1000) / 10 : 0,
        total: oc.total,
        converted: oc.converted,
      },
      conversion_rate_by_rep: rateByRep.map(r => ({
        rep_id: r.sales_rep_id,
        rep_name: r.full_name,
        rate: r.total > 0 ? Math.round((r.converted / r.total) * 1000) / 10 : 0,
        total: r.total,
        converted: r.converted,
      })),
      sales_velocity_score: Math.round(velocityScore * 100) / 100,
      total_mrr: totalMrr,
      rep_leaderboard: repLeaderboard.map(r => ({
        id: r.id,
        name: r.full_name,
        prospects_logged: r.prospects_logged,
        converted: r.converted,
        conversion_rate: r.prospects_logged > 0
          ? Math.round((r.converted / r.prospects_logged) * 1000) / 10 : 0,
        avg_cycle_days: Math.round(Number(r.avg_cycle_days) * 10) / 10,
        mrr_attributed: Number(r.mrr_attributed),
        commission_earned: Number(r.commission_earned),
        weekly_conversions: weekLabels.map(w => (sparklineMap[r.id]?.[w] || 0)),
      })),
      cohort_data: cohortRaw.map(c => ({
        cohort_week: c.cohort_week,
        logged: c.logged,
        within_7d: c.within_7d,
        within_14d: c.within_14d,
        within_30d: c.within_30d,
        within_60d: c.within_60d,
        within_90d_plus: c.within_90d_plus,
      })),
    });
  } catch (error) {
    console.error('[sales] GET /manager/velocity error:', error);
    res.status(500).json({ error: 'Failed to fetch velocity data' });
  }
});

// PATCH /api/sales/manager/reps/:id/set-password — manager sets a rep's password
router.patch('/manager/reps/:id/set-password', requireManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [rep] = await adminSql`SELECT id, full_name, email FROM sales_reps WHERE id = ${id}`;
    if (!rep) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await adminSql`UPDATE sales_reps SET password_hash = ${hash} WHERE id = ${id}`;

    // Send welcome email with new credentials (fire-and-forget)
    sendSalesRepWelcomeEmail(rep.email, rep.full_name, password);

    res.json({ success: true });
  } catch (error) {
    console.error('[sales] PATCH /manager/reps/:id/set-password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// POST /api/sales/manager/reps — create a new sales rep with password
router.post('/manager/reps', requireManager, async (req, res) => {
  try {
    const { full_name, email, phone, is_manager, password } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ error: 'full_name and email are required' });
    }

    const [existing] = await adminSql`SELECT id FROM sales_reps WHERE email = ${email.toLowerCase().trim()}`;
    if (existing) {
      return res.status(409).json({ error: 'A sales rep with this email already exists' });
    }

    let hash = null;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const [rep] = await adminSql`
      INSERT INTO sales_reps (full_name, email, phone, is_manager, password_hash)
      VALUES (${full_name}, ${email.toLowerCase().trim()}, ${phone || null}, ${is_manager || false}, ${hash})
      RETURNING id, full_name, email, phone, is_manager, is_active, created_at
    `;

    // Send welcome email with credentials (fire-and-forget)
    if (password) {
      sendSalesRepWelcomeEmail(rep.email, rep.full_name, password);
    }

    res.status(201).json(rep);
  } catch (error) {
    console.error('[sales] POST /manager/reps error:', error);
    res.status(500).json({ error: 'Failed to create sales rep' });
  }
});

export default router;
