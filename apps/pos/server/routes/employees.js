import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { all, get, run, getTenantId } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { checkLimit } from '../planLimits.js';
import { audit } from '../lib/auditLog.js';
import { BCRYPT_ROUNDS, JWT_SECRET } from '../lib/constants.js';

const pinLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => `pin-login:${ipKeyGenerator(req.ip)}:${req.tenant?.id || 'unknown'}`,
  message: { error: 'Too many login attempts, please try again later' },
});

const router = Router();

// GET /api/employees - list employees
router.get('/', async (req, res) => {
  try {
    const employees = await all(`
      SELECT id, name, role, active, created_at
      FROM employees
      ORDER BY name ASC
    `);

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// POST /api/employees - create employee
router.post('/', async (req, res) => {
  try {
    const { name, pin, role = 'cashier' } = req.body;

    if (!name || !pin) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validRoles = ['admin', 'cashier', 'manager', 'kitchen', 'bar'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Plan limit check
    const plan = req.tenant?.plan || 'trial';
    const { cnt } = await get('SELECT COUNT(*) as cnt FROM employees WHERE active = true') || { cnt: 0 };
    const check = checkLimit(plan, 'employees', cnt);
    if (!check.allowed) {
      return res.status(403).json({ error: `Employee limit reached (${check.limit})`, upgrade: true, limit: check.limit, current: check.current });
    }

    const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);

    const tid = getTenantId();
    const result = await run(`
      INSERT INTO employees (tenant_id, name, pin, role, active)
      VALUES ($1, $2, $3, $4, true)
    `, [tid, name, hashedPin, role]);

    audit({
      tenantId: req.tenant?.id || 'default',
      actorType: 'employee',
      actorId: req.headers['x-employee-id'] || 'unknown',
      action: 'create',
      resource: 'employee',
      resourceId: String(result.lastInsertRowid),
      ip: req.ip,
    });

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      role,
      active: true,
    });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// POST /api/employees/login - PIN login (must be before /:id to avoid shadowing)
router.post('/login', pinLoginLimiter, async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN required' });
    }

    // Fetch all active employees and compare PIN with bcrypt
    const employees = await all(`
      SELECT id, name, pin, role, active, created_at
      FROM employees
      WHERE active = true
    `);

    let employee = null;
    for (const emp of employees) {
      const match = await bcrypt.compare(pin, emp.pin);
      if (match) {
        employee = emp;
        break;
      }
    }

    if (!employee) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Fetch permissions for this role
    const perms = await all(
      'SELECT permission FROM role_permissions WHERE role = $1 AND granted = true',
      [employee.role]
    );
    const permissions = perms.map(p => p.permission);

    const tenantId = req.tenant?.id || 'default';
    const token = jwt.sign(
      { tenantId, employeeId: employee.id, role: employee.role, type: 'employee' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      active: employee.active,
      created_at: employee.created_at,
      permissions,
      token,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/employees/permissions - all roles with permissions
router.get('/permissions', async (req, res) => {
  try {
    const rows = await all(`
      SELECT role, permission, granted
      FROM role_permissions
      ORDER BY role, permission
    `);

    // Group by role
    const result = {};
    for (const row of rows) {
      if (!result[row.role]) result[row.role] = {};
      result[row.role][row.permission] = row.granted;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// PUT /api/employees/permissions/:role - update permissions for a role (admin only)
router.put('/permissions/:role', requireAuth('manage_permissions'), async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Missing permissions object' });
    }

    for (const [permission, granted] of Object.entries(permissions)) {
      const existing = await get(
        'SELECT id FROM role_permissions WHERE role = $1 AND permission = $2',
        [role, permission]
      );

      if (existing) {
        await run(
          'UPDATE role_permissions SET granted = $1 WHERE role = $2 AND permission = $3',
          [granted ? true : false, role, permission]
        );
      } else {
        const tid = getTenantId();
        await run(
          'INSERT INTO role_permissions (tenant_id, role, permission, granted) VALUES ($1, $2, $3, $4)',
          [tid, role, permission, granted ? true : false]
        );
      }
    }

    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// PUT /api/employees/:id - update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, pin, role } = req.body;

    const employee = await get('SELECT id FROM employees WHERE id = $1', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(name);
    }
    if (pin !== undefined) {
      const hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
      updates.push(`pin = $${values.length + 1}`);
      values.push(hashedPin);
    }
    if (role !== undefined) {
      const validRoles = ['admin', 'cashier', 'manager', 'kitchen', 'bar'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push(`role = $${values.length + 1}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    await run(`
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
    `, values);

    audit({
      tenantId: req.tenant?.id || 'default',
      actorType: 'employee',
      actorId: req.headers['x-employee-id'] || 'unknown',
      action: 'update',
      resource: 'employee',
      resourceId: String(id),
      ip: req.ip,
    });

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// PUT /api/employees/:id/toggle - toggle active
router.put('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await get('SELECT id, active FROM employees WHERE id = $1', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const newActive = !employee.active;
    await run('UPDATE employees SET active = $1 WHERE id = $2', [newActive, id]);

    res.json({ id, active: newActive });
  } catch (error) {
    console.error('Error toggling employee:', error);
    res.status(500).json({ error: 'Failed to toggle employee' });
  }
});

export default router;
