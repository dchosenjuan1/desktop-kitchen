import { tenantContext } from '../db/index.js';
import { getTenant, getTenantBySubdomain, openTenantDb } from '../tenants.js';

// Subdomains that belong to the platform itself and should NOT be resolved as tenants.
// Specific DNS records (www, es, docs, pos) take priority over the wildcard CNAME.
const RESERVED_SUBDOMAINS = new Set([
  'pos', 'app', 'api', 'admin', 'www', 'es', 'docs', 'staging',
]);

/**
 * Tenant resolution middleware.
 *
 * Resolution order:
 *   1. X-Tenant-ID header (for dev/testing)
 *   2. Subdomain from Host header (production)
 *      e.g., juanbertos.desktop.kitchen → tenant "juanbertos"
 *      Reserved subdomains (pos, www, docs, etc.) are skipped.
 *   3. Default tenant from DEFAULT_TENANT_ID env var
 *   4. No tenant — uses default DB (backward compat)
 *
 * When a tenant is resolved, the request runs inside an AsyncLocalStorage
 * context so all db.js run/get/all/exec calls automatically use that
 * tenant's database. No changes needed in route files.
 *
 * Also attaches req.tenant = { id, name, config, ... } for metadata access.
 */
export function tenantMiddleware(req, res, next) {
  let tenantId = null;
  let tenant = null;

  // 1. Explicit header (for dev / cross-origin API calls)
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId) {
    tenant = getTenant(headerTenantId);
    if (!tenant) {
      return res.status(404).json({ error: `Tenant '${headerTenantId}' not found` });
    }
    if (!tenant.active) {
      return res.status(403).json({ error: 'Tenant account is inactive' });
    }
    tenantId = tenant.id;
  }

  // 2. Subdomain resolution (e.g., juanbertos.desktop.kitchen)
  if (!tenantId) {
    const host = req.hostname || req.headers.host?.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      const parts = host.split('.');
      if (parts.length >= 3) {
        const subdomain = parts[0];
        if (!RESERVED_SUBDOMAINS.has(subdomain)) {
          tenant = getTenantBySubdomain(subdomain);
          if (tenant) {
            if (!tenant.active) {
              return res.status(403).json({ error: 'Tenant account is inactive' });
            }
            tenantId = tenant.id;
          }
        }
      }
    }
  }

  // 3. Default tenant fallback
  if (!tenantId && process.env.DEFAULT_TENANT_ID) {
    tenant = getTenant(process.env.DEFAULT_TENANT_ID);
    if (tenant && tenant.active) {
      tenantId = tenant.id;
    }
  }

  // 4. No tenant resolved — use default DB (backward compatibility)
  if (!tenantId) {
    req.tenant = null;
    return next();
  }

  // Open tenant's database
  const tenantDb = openTenantDb(tenantId);

  // Attach tenant metadata to request
  req.tenant = {
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    subscription_status: tenant.subscription_status,
    branding: tenant.branding_json ? JSON.parse(tenant.branding_json) : null,
  };

  // Run the rest of the request inside tenant context
  // so all db.js calls automatically use this tenant's DB
  tenantContext.run({ db: tenantDb }, () => {
    next();
  });
}
