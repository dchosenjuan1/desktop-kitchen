import { get, all } from '../db/index.js';

/**
 * Auth middleware factory.
 * If `permission` is provided, checks role_permissions for that employee's role.
 * Always attaches `req.employee` for downstream use.
 *
 * Usage:
 *   router.post('/', requireAuth('manage_menu'), handler)
 *   router.get('/', requireAuth(), handler)            // just requires login
 */
export function requireAuth(permission) {
  return (req, res, next) => {
    const employeeId = req.headers['x-employee-id'];

    if (!employeeId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const employee = get(
      'SELECT id, name, role, active FROM employees WHERE id = ?',
      [employeeId]
    );

    if (!employee) {
      return res.status(401).json({ error: 'Employee not found' });
    }

    if (employee.active === 0) {
      return res.status(401).json({ error: 'Employee account is inactive' });
    }

    req.employee = employee;

    // If no specific permission required, just authenticate
    if (!permission) {
      return next();
    }

    const perm = get(
      'SELECT granted FROM role_permissions WHERE role = ? AND permission = ?',
      [employee.role, permission]
    );

    if (!perm || perm.granted !== 1) {
      return res.status(403).json({
        error: `Permission denied: ${permission} is not granted for role ${employee.role}`,
      });
    }

    next();
  };
}
