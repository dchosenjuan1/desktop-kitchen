import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/employees - list employees
router.get('/', (req, res) => {
  try {
    const employees = all(`
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
router.post('/', (req, res) => {
  try {
    const { name, pin, role = 'cashier' } = req.body;

    if (!name || !pin) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const validRoles = ['admin', 'cashier', 'manager', 'kitchen', 'bar'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = run(`
      INSERT INTO employees (name, pin, role, active)
      VALUES (?, ?, ?, 1)
    `, [name, pin, role]);

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
router.post('/login', (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN required' });
    }

    const employee = get(`
      SELECT id, name, pin, role, active, created_at
      FROM employees
      WHERE pin = ?
    `, [pin]);

    if (!employee) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    if (employee.active === 0) {
      return res.status(401).json({ error: 'Employee account is inactive' });
    }

    // Fetch permissions for this role
    const perms = all(
      'SELECT permission FROM role_permissions WHERE role = ? AND granted = 1',
      [employee.role]
    );
    const permissions = perms.map(p => p.permission);

    res.json({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      active: employee.active === 1,
      created_at: employee.created_at,
      permissions,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/employees/permissions - all roles with permissions
router.get('/permissions', (req, res) => {
  try {
    const rows = all(`
      SELECT role, permission, granted
      FROM role_permissions
      ORDER BY role, permission
    `);

    // Group by role
    const result = {};
    for (const row of rows) {
      if (!result[row.role]) result[row.role] = {};
      result[row.role][row.permission] = row.granted === 1;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// PUT /api/employees/permissions/:role - update permissions for a role (admin only)
router.put('/permissions/:role', requireAuth('manage_permissions'), (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Missing permissions object' });
    }

    for (const [permission, granted] of Object.entries(permissions)) {
      const existing = get(
        'SELECT id FROM role_permissions WHERE role = ? AND permission = ?',
        [role, permission]
      );

      if (existing) {
        run(
          'UPDATE role_permissions SET granted = ? WHERE role = ? AND permission = ?',
          [granted ? 1 : 0, role, permission]
        );
      } else {
        run(
          'INSERT INTO role_permissions (role, permission, granted) VALUES (?, ?, ?)',
          [role, permission, granted ? 1 : 0]
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
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, pin, role } = req.body;

    const employee = get('SELECT id FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (pin !== undefined) {
      updates.push('pin = ?');
      values.push(pin);
    }
    if (role !== undefined) {
      const validRoles = ['admin', 'cashier', 'manager', 'kitchen', 'bar'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.push('role = ?');
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    run(`
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    res.json({ message: 'Employee updated successfully' });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// PUT /api/employees/:id/toggle - toggle active
router.put('/:id/toggle', (req, res) => {
  try {
    const { id } = req.params;

    const employee = get('SELECT id, active FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const newActive = employee.active === 1 ? 0 : 1;
    run('UPDATE employees SET active = ? WHERE id = ?', [newActive, id]);

    res.json({ id, active: newActive === 1 });
  } catch (error) {
    console.error('Error toggling employee:', error);
    res.status(500).json({ error: 'Failed to toggle employee' });
  }
});

export default router;
