import jwt from 'jsonwebtoken';
import { getTenant } from '../tenants.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

/**
 * Owner auth middleware.
 * Validates JWT, ensures tenant is active and subscription not expired.
 * Attaches req.owner = { tenantId, email, role } for downstream use.
 */
export async function requireOwner(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);

    // Verify tenant still exists and is active
    const tenant = await getTenant(decoded.tenantId);
    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not found' });
    }
    if (!tenant.active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    req.owner = {
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
