import { Router } from 'express';
import { requireOwner } from '../middleware/ownerAuth.js';
import { updateTenant, getTenant } from '../tenants.js';

const router = Router();

/**
 * GET /api/branding — public branding for current tenant
 * Returns primaryColor, logoUrl, restaurantName for CSS theming.
 * Works with tenant middleware — no auth required.
 */
router.get('/', (req, res) => {
  const tenant = req.tenant;

  // No tenant resolved — return defaults
  if (!tenant) {
    return res.json({
      primaryColor: '#dc2626',
      logoUrl: null,
      restaurantName: 'Juanbertos',
    });
  }

  const branding = tenant.branding || {};
  res.json({
    primaryColor: branding.primaryColor || '#dc2626',
    logoUrl: branding.logoUrl || null,
    restaurantName: tenant.name || 'Restaurant',
  });
});

/**
 * PUT /api/branding — update branding (owner-only)
 * Body: { primaryColor, logoUrl }
 */
router.put('/', requireOwner, (req, res) => {
  try {
    const { primaryColor, logoUrl } = req.body;
    const tenantId = req.owner.tenantId;

    const tenant = getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const existing = tenant.branding_json ? JSON.parse(tenant.branding_json) : {};
    const updated = {
      ...existing,
      ...(primaryColor !== undefined && { primaryColor }),
      ...(logoUrl !== undefined && { logoUrl }),
    };

    updateTenant(tenantId, { branding_json: JSON.stringify(updated) });

    res.json({
      primaryColor: updated.primaryColor || '#dc2626',
      logoUrl: updated.logoUrl || null,
      restaurantName: tenant.name,
    });
  } catch (error) {
    console.error('Branding update error:', error);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

export default router;
