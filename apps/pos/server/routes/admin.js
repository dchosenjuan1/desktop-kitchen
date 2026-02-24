import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createTenant, getTenant, listTenants, updateTenant } from '../tenants.js';
import { run, adminSql } from '../db/index.js';
import { sendPinEmail } from '../helpers/email.js';
import { audit } from '../lib/auditLog.js';
import os from 'os';

const BCRYPT_ROUNDS = 12;

const router = Router();

/**
 * Admin auth middleware — protects all admin routes with ADMIN_SECRET env var.
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

// ==================== Analytics Endpoints ====================

const PLAN_PRICES = { starter: 29, pro: 79 };

// GET /admin/analytics/overview — KPIs: total tenants, plan breakdown, MRR, total orders/revenue
router.get('/analytics/overview', async (req, res) => {
  try {
    const [tenantStats] = await adminSql`
      SELECT
        COUNT(*) AS total_tenants,
        COUNT(*) FILTER (WHERE active = true) AS active_tenants,
        COUNT(*) FILTER (WHERE plan = 'trial') AS trial_count,
        COUNT(*) FILTER (WHERE plan = 'starter') AS starter_count,
        COUNT(*) FILTER (WHERE plan = 'pro') AS pro_count
      FROM tenants
    `;

    const [orderStats] = await adminSql`
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total), 0) AS total_revenue
      FROM orders
    `;

    const mrr = (tenantStats.starter_count * PLAN_PRICES.starter)
              + (tenantStats.pro_count * PLAN_PRICES.pro);

    res.json({
      total_tenants: Number(tenantStats.total_tenants),
      active_tenants: Number(tenantStats.active_tenants),
      plan_breakdown: {
        trial: Number(tenantStats.trial_count),
        starter: Number(tenantStats.starter_count),
        pro: Number(tenantStats.pro_count),
      },
      mrr,
      total_orders: Number(orderStats.total_orders),
      total_revenue: Number(orderStats.total_revenue),
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// GET /admin/analytics/signups?months=12 — Monthly signup trend
router.get('/analytics/signups', async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 36);
    const rows = await adminSql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM tenants
      WHERE created_at >= NOW() - MAKE_INTERVAL(months => ${months})
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;
    res.json(rows.map(r => ({ month: r.month, count: Number(r.count) })));
  } catch (error) {
    console.error('Analytics signups error:', error);
    res.status(500).json({ error: 'Failed to fetch signup analytics' });
  }
});

// GET /admin/analytics/revenue?months=12 — Monthly platform revenue + order counts
router.get('/analytics/revenue', async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 36);
    const rows = await adminSql`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*) AS order_count,
        COALESCE(SUM(total), 0) AS revenue
      FROM orders
      WHERE created_at >= NOW() - MAKE_INTERVAL(months => ${months})
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;
    res.json(rows.map(r => ({
      month: r.month,
      order_count: Number(r.order_count),
      revenue: Number(r.revenue),
    })));
  } catch (error) {
    console.error('Analytics revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// GET /admin/analytics/churn?months=12 — Monthly cancellation counts
router.get('/analytics/churn', async (req, res) => {
  try {
    const months = Math.min(parseInt(req.query.months) || 12, 36);
    const rows = await adminSql`
      SELECT
        TO_CHAR(subscription_cancelled_at, 'YYYY-MM') AS month,
        COUNT(*) AS count
      FROM tenants
      WHERE subscription_cancelled_at IS NOT NULL
        AND subscription_cancelled_at >= NOW() - MAKE_INTERVAL(months => ${months})
      GROUP BY TO_CHAR(subscription_cancelled_at, 'YYYY-MM')
      ORDER BY month
    `;
    res.json(rows.map(r => ({ month: r.month, count: Number(r.count) })));
  } catch (error) {
    console.error('Analytics churn error:', error);
    res.status(500).json({ error: 'Failed to fetch churn analytics' });
  }
});

// GET /admin/analytics/health — System health info
router.get('/analytics/health', async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const [pgVersion] = await adminSql`SELECT version() AS v`;
    res.json({
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      platform: process.platform,
      memory: {
        rss_mb: Math.round(mem.rss / 1048576),
        heap_used_mb: Math.round(mem.heapUsed / 1048576),
        heap_total_mb: Math.round(mem.heapTotal / 1048576),
      },
      os: {
        total_mem_mb: Math.round(os.totalmem() / 1048576),
        free_mem_mb: Math.round(os.freemem() / 1048576),
        cpus: os.cpus().length,
      },
      postgres_version: pgVersion?.v || 'unknown',
    });
  } catch (error) {
    console.error('Analytics health error:', error);
    res.status(500).json({ error: 'Failed to fetch health data' });
  }
});

// GET /admin/analytics/activity — Top 10 most/least active tenants (last 30 days)
router.get('/analytics/activity', async (req, res) => {
  try {
    const mostActive = await adminSql`
      SELECT t.id, t.name, t.plan, COUNT(o.id) AS order_count,
             COALESCE(SUM(o.total), 0) AS revenue
      FROM tenants t
      LEFT JOIN orders o ON o.tenant_id = t.id
        AND o.created_at >= NOW() - INTERVAL '30 days'
      WHERE t.active = true
      GROUP BY t.id, t.name, t.plan
      ORDER BY order_count DESC
      LIMIT 10
    `;

    const leastActive = await adminSql`
      SELECT t.id, t.name, t.plan, COUNT(o.id) AS order_count,
             COALESCE(SUM(o.total), 0) AS revenue
      FROM tenants t
      LEFT JOIN orders o ON o.tenant_id = t.id
        AND o.created_at >= NOW() - INTERVAL '30 days'
      WHERE t.active = true
      GROUP BY t.id, t.name, t.plan
      ORDER BY order_count ASC
      LIMIT 10
    `;

    res.json({
      most_active: mostActive.map(r => ({ ...r, order_count: Number(r.order_count), revenue: Number(r.revenue) })),
      least_active: leastActive.map(r => ({ ...r, order_count: Number(r.order_count), revenue: Number(r.revenue) })),
    });
  } catch (error) {
    console.error('Analytics activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity analytics' });
  }
});

// GET /admin/tenants/:id/deep-dive — Per-tenant detailed stats
router.get('/tenants/:id/deep-dive', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const [stats] = await adminSql`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenant.id}) AS total_orders,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE tenant_id = ${tenant.id}) AS total_revenue,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = ${tenant.id}
          AND created_at >= NOW() - INTERVAL '30 days') AS orders_30d,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE tenant_id = ${tenant.id}
          AND created_at >= NOW() - INTERVAL '30 days') AS revenue_30d,
        (SELECT COUNT(*) FROM employees WHERE tenant_id = ${tenant.id}) AS employee_count,
        (SELECT COUNT(*) FROM menu_items WHERE tenant_id = ${tenant.id}) AS menu_item_count,
        (SELECT COUNT(*) FROM menu_categories WHERE tenant_id = ${tenant.id}) AS category_count,
        (SELECT COUNT(*) FROM loyalty_customers WHERE tenant_id = ${tenant.id}) AS customer_count,
        (SELECT MAX(created_at) FROM orders WHERE tenant_id = ${tenant.id}) AS last_order_at
    `;

    // Strip sensitive fields
    const { owner_password_hash, ...safeTenant } = tenant;

    res.json({
      tenant: safeTenant,
      stats: {
        total_orders: Number(stats.total_orders),
        total_revenue: Number(stats.total_revenue),
        orders_30d: Number(stats.orders_30d),
        revenue_30d: Number(stats.revenue_30d),
        employee_count: Number(stats.employee_count),
        menu_item_count: Number(stats.menu_item_count),
        category_count: Number(stats.category_count),
        customer_count: Number(stats.customer_count),
        last_order_at: stats.last_order_at,
      },
    });
  } catch (error) {
    console.error('Tenant deep-dive error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant deep-dive' });
  }
});

// ==================== Tenant CRUD ====================

// POST /admin/tenants — create new tenant
router.post('/tenants', async (req, res) => {
  try {
    const { id, name, owner_email, owner_password, subdomain, plan, branding_json } = req.body;

    if (!id || !name || !owner_email || !owner_password) {
      return res.status(400).json({ error: 'Required: id, name, owner_email, owner_password' });
    }

    if (owner_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(id)) {
      return res.status(400).json({ error: 'Tenant ID must be lowercase alphanumeric with hyphens' });
    }

    // Check uniqueness
    if (await getTenant(id)) {
      return res.status(409).json({ error: `Tenant '${id}' already exists` });
    }

    // Hash password
    const owner_password_hash = await bcrypt.hash(owner_password, BCRYPT_ROUNDS);

    const tenant = await createTenant({
      id,
      name,
      subdomain: subdomain || id,
      owner_email,
      owner_password_hash,
      plan,
      branding_json: branding_json ? JSON.stringify(branding_json) : null,
    });

    // Generate random 4-digit PIN for the admin employee
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);

    await adminSql`
      INSERT INTO employees (tenant_id, name, pin, role, active)
      VALUES (${id}, ${owner_email}, ${hashedPin}, 'admin', true)
    `;

    // Fire-and-forget email with PIN
    sendPinEmail(owner_email, pin, name).catch(() => {});

    audit({
      tenantId: id,
      actorType: 'admin',
      actorId: 'super-admin',
      action: 'create',
      resource: 'tenant',
      resourceId: id,
      details: { name, owner_email, plan: plan || 'trial' },
      ip: req.ip,
    });

    // Strip sensitive field from response
    const { owner_password_hash: _, ...safeTenant } = tenant;

    res.status(201).json({ ...safeTenant, pin });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// GET /admin/tenants — list all tenants with stats, search/filter/sort
router.get('/tenants', async (req, res) => {
  try {
    const { search, plan, status, sort, order } = req.query;

    let tenants = await listTenants();

    // Filter by search term (name, id, email)
    if (search) {
      const q = search.toLowerCase();
      tenants = tenants.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.owner_email || '').toLowerCase().includes(q)
      );
    }

    // Filter by plan
    if (plan) {
      tenants = tenants.filter(t => t.plan === plan);
    }

    // Filter by status (active/inactive)
    if (status === 'active') {
      tenants = tenants.filter(t => t.active);
    } else if (status === 'inactive') {
      tenants = tenants.filter(t => !t.active);
    }

    // Sort
    if (sort) {
      const dir = order === 'asc' ? 1 : -1;
      tenants.sort((a, b) => {
        const av = a[sort] ?? '';
        const bv = b[sort] ?? '';
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    res.json(tenants);
  } catch (error) {
    console.error('Error listing tenants:', error);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

// GET /admin/tenants/:id — get single tenant
router.get('/tenants/:id', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// PATCH /admin/tenants/:id — update plan/status/branding
router.patch('/tenants/:id', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const allowed = ['name', 'subdomain', 'owner_email', 'plan', 'active', 'subscription_status',
      'stripe_customer_id', 'stripe_subscription_id', 'branding_json'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = key === 'branding_json' && typeof req.body[key] === 'object'
          ? JSON.stringify(req.body[key])
          : req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await updateTenant(req.params.id, updates);

    audit({
      tenantId: req.params.id,
      actorType: 'admin',
      actorId: 'super-admin',
      action: 'update',
      resource: 'tenant',
      resourceId: req.params.id,
      details: { fields: Object.keys(updates) },
      ip: req.ip,
    });

    res.json(await getTenant(req.params.id));
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// POST /admin/tenants/:id/reset-password — reset tenant owner password
router.post('/tenants/:id/reset-password', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const { new_password } = req.body;
    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const owner_password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await updateTenant(req.params.id, { owner_password_hash });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /admin/tenants/:id/export — export all tenant data as JSON
router.get('/tenants/:id/export', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const tid = tenant.id;
    const tables = [
      'employees', 'menu_categories', 'menu_items', 'menu_item_modifier_groups',
      'menu_item_ingredients', 'modifier_groups', 'modifiers', 'combo_definitions',
      'combo_slots', 'orders', 'order_items', 'order_item_modifiers', 'order_payments',
      'order_payment_items', 'inventory_items', 'inventory_counts', 'vendors',
      'vendor_items', 'purchase_orders', 'purchase_order_items', 'printers',
      'category_printer_routes', 'delivery_platforms', 'delivery_orders',
      'delivery_markup_rules', 'delivery_recapture', 'virtual_brands',
      'virtual_brand_items', 'loyalty_customers', 'stamp_cards', 'stamp_events',
      'referral_events', 'loyalty_messages', 'loyalty_config',
      'ai_config', 'ai_suggestion_cache', 'ai_suggestion_events',
      'ai_hourly_snapshots', 'ai_item_pairs', 'ai_inventory_velocity',
      'ai_restock_log', 'ai_category_roles', 'shrinkage_alerts', 'refunds',
      'crypto_payments', 'role_permissions', 'financial_targets', 'financial_actuals',
      'order_templates',
    ];

    const queries = tables.map(async (table) => {
      try {
        const rows = await adminSql.unsafe(
          `SELECT * FROM ${table} WHERE tenant_id = $1`,
          [tid]
        );
        return [table, Array.from(rows)];
      } catch {
        return [table, []];
      }
    });

    const results = await Promise.all(queries);
    const data = Object.fromEntries(results);

    // Add tenant metadata (strip password hash)
    const { owner_password_hash, ...safeTenant } = tenant;
    data._tenant = safeTenant;

    res.setHeader('Content-Disposition', `attachment; filename="${tid}-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(data);
  } catch (error) {
    console.error('Error exporting tenant:', error);
    res.status(500).json({ error: 'Failed to export tenant data' });
  }
});

// DELETE /admin/tenants/:id — permanently delete a tenant and all data
router.delete('/tenants/:id', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const { confirm } = req.body;
    if (confirm !== req.params.id) {
      return res.status(400).json({ error: 'Must confirm deletion by passing { confirm: tenantId }' });
    }

    const tid = tenant.id;

    // Delete in FK-safe order using a transaction
    await adminSql.begin(async (sql) => {
      // Layer 1 — deepest leaves
      const layer1 = [
        'order_payment_items', 'order_item_modifiers', 'stamp_events', 'referral_events',
        'loyalty_messages', 'delivery_recapture', 'delivery_markup_rules',
        'virtual_brand_items', 'category_printer_routes', 'menu_item_modifier_groups',
        'menu_item_ingredients', 'purchase_order_items', 'vendor_items',
        'ai_suggestion_events', 'ai_item_pairs', 'ai_inventory_velocity', 'ai_restock_log',
        'ai_category_roles', 'inventory_counts', 'shrinkage_alerts', 'refunds', 'crypto_payments',
      ];
      for (const t of layer1) {
        await sql.unsafe(`DELETE FROM ${t} WHERE tenant_id = $1`, [tid]);
      }

      // Layer 2
      const layer2 = [
        'stamp_cards', 'order_items', 'order_payments', 'delivery_orders',
        'combo_slots', 'modifiers', 'purchase_orders',
      ];
      for (const t of layer2) {
        await sql.unsafe(`DELETE FROM ${t} WHERE tenant_id = $1`, [tid]);
      }

      // Layer 3
      const layer3 = [
        'orders', 'menu_items', 'virtual_brands', 'combo_definitions',
        'modifier_groups', 'delivery_platforms', 'printers',
      ];
      for (const t of layer3) {
        await sql.unsafe(`DELETE FROM ${t} WHERE tenant_id = $1`, [tid]);
      }

      // Layer 4
      const layer4 = [
        'menu_categories', 'inventory_items', 'vendors', 'employees', 'loyalty_customers',
      ];
      for (const t of layer4) {
        await sql.unsafe(`DELETE FROM ${t} WHERE tenant_id = $1`, [tid]);
      }

      // Config tables (no FK deps)
      const config = [
        'ai_config', 'ai_suggestion_cache', 'ai_hourly_snapshots',
        'financial_targets', 'financial_actuals', 'loyalty_config',
        'role_permissions', 'order_templates',
      ];
      for (const t of config) {
        await sql.unsafe(`DELETE FROM ${t} WHERE tenant_id = $1`, [tid]);
      }

      // Finally delete the tenant record
      await sql`DELETE FROM tenants WHERE id = ${tid}`;
    });

    audit({
      tenantId: tid,
      actorType: 'admin',
      actorId: 'super-admin',
      action: 'delete',
      resource: 'tenant',
      resourceId: tid,
      details: { reason: 'admin action' },
      ip: req.ip,
    });

    res.json({ message: `Tenant '${tid}' and all associated data deleted permanently` });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// POST /admin/tenants/:id/seed — seed demo data for a tenant
router.post('/tenants/:id/seed', async (req, res) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Seed a default admin employee (uses adminSql since we need to specify tenant_id)
    const seedPin = await bcrypt.hash('1234', BCRYPT_ROUNDS);
    await adminSql`
      INSERT INTO employees (tenant_id, name, pin, role, active)
      VALUES (${tenant.id}, 'Manager', ${seedPin}, 'admin', true)
      ON CONFLICT DO NOTHING
    `;

    // Seed basic menu categories
    const categories = ['Main Dishes', 'Sides', 'Drinks'];
    for (let i = 0; i < categories.length; i++) {
      await adminSql`
        INSERT INTO menu_categories (tenant_id, name, sort_order, active)
        VALUES (${tenant.id}, ${categories[i]}, ${i + 1}, true)
        ON CONFLICT DO NOTHING
      `;
    }

    res.json({ message: `Seeded demo data for tenant '${tenant.id}'` });
  } catch (error) {
    console.error('Error seeding tenant:', error);
    res.status(500).json({ error: 'Failed to seed tenant' });
  }
});

export default router;
