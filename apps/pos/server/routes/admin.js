import { Router } from 'express';
import { createTenant, getTenant, listTenants, updateTenant, openTenantDb } from '../tenants.js';
import { applySchema, createDbHelpers } from '../db/index.js';

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

// POST /admin/tenants — create new tenant
router.post('/tenants', (req, res) => {
  try {
    const { id, name, owner_email, owner_password_hash, subdomain, plan, branding_json } = req.body;

    if (!id || !name || !owner_email || !owner_password_hash) {
      return res.status(400).json({ error: 'Required: id, name, owner_email, owner_password_hash' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(id)) {
      return res.status(400).json({ error: 'Tenant ID must be lowercase alphanumeric with hyphens' });
    }

    // Check uniqueness
    if (getTenant(id)) {
      return res.status(409).json({ error: `Tenant '${id}' already exists` });
    }

    const tenant = createTenant({
      id,
      name,
      subdomain: subdomain || id,
      owner_email,
      owner_password_hash,
      plan,
      branding_json: branding_json ? JSON.stringify(branding_json) : null,
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// GET /admin/tenants — list all tenants with stats
router.get('/tenants', (req, res) => {
  try {
    const tenants = listTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Error listing tenants:', error);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

// GET /admin/tenants/:id — get single tenant
router.get('/tenants/:id', (req, res) => {
  try {
    const tenant = getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tenant' });
  }
});

// PATCH /admin/tenants/:id — update plan/status/branding
router.patch('/tenants/:id', (req, res) => {
  try {
    const tenant = getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const allowed = ['name', 'plan', 'active', 'subscription_status', 'stripe_customer_id',
      'stripe_subscription_id', 'branding_json'];
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

    updateTenant(req.params.id, updates);
    res.json(getTenant(req.params.id));
  } catch (error) {
    console.error('Error updating tenant:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// POST /admin/tenants/:id/seed — seed demo data for a tenant
router.post('/tenants/:id/seed', async (req, res) => {
  try {
    const tenant = getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const tdb = openTenantDb(tenant.id);
    const db = createDbHelpers(tdb);

    // Seed a default admin employee
    db.run('INSERT OR IGNORE INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)',
      ['Manager', '1234', 'admin']);

    // Seed basic menu categories
    const categories = ['Main Dishes', 'Sides', 'Drinks'];
    for (let i = 0; i < categories.length; i++) {
      db.run('INSERT OR IGNORE INTO menu_categories (name, sort_order, active) VALUES (?, ?, 1)',
        [categories[i], i + 1]);
    }

    res.json({ message: `Seeded demo data for tenant '${tenant.id}'` });
  } catch (error) {
    console.error('Error seeding tenant:', error);
    res.status(500).json({ error: 'Failed to seed tenant' });
  }
});

export default router;
