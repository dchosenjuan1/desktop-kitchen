import { tenantContext, tenantSql } from '../db/index.js';
import { getTenant, getTenantBySubdomain } from '../tenants.js';

// Subdomains that belong to the platform itself and should NOT be resolved as tenants.
const RESERVED_SUBDOMAINS = new Set([
  'pos', 'app', 'api', 'admin', 'www', 'es', 'docs', 'staging',
]);

/**
 * Tenant resolution middleware (async, Postgres + RLS).
 *
 * Resolution order:
 *   1. X-Tenant-ID header (for dev/testing)
 *   2. Subdomain from Host header (production)
 *   3. Default tenant from DEFAULT_TENANT_ID env var
 *   4. No tenant — uses adminSql (backward compat)
 *
 * When a tenant is resolved:
 *   - Reserves a dedicated connection from tenantSql pool
 *   - Sets `app.tenant_id` session variable for RLS
 *   - Stores connection in AsyncLocalStorage so run/get/all/exec auto-use it
 *   - Releases connection on response finish
 */
export async function tenantMiddleware(req, res, next) {
  let tenantId = null;
  let tenant = null;

  try {
    // 1. Explicit header (for dev / cross-origin API calls)
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId) {
      tenant = await getTenant(headerTenantId);
      if (!tenant) {
        return res.status(404).json({ error: `Tenant '${headerTenantId}' not found` });
      }
      if (!tenant.active) {
        return res.status(403).json({ error: 'Tenant account is inactive' });
      }
      tenantId = tenant.id;
    }

    // 2. Subdomain resolution (e.g., acme.desktop.kitchen)
    if (!tenantId) {
      const host = req.hostname || req.headers.host?.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        const parts = host.split('.');
        if (parts.length >= 3) {
          const subdomain = parts[0];
          if (!RESERVED_SUBDOMAINS.has(subdomain)) {
            tenant = await getTenantBySubdomain(subdomain);
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
      tenant = await getTenant(process.env.DEFAULT_TENANT_ID);
      if (tenant && tenant.active) {
        tenantId = tenant.id;
      }
    }

    // 4. No tenant resolved — use default admin pool (backward compatibility)
    if (!tenantId) {
      req.tenant = null;
      return next();
    }

    // Reserve a dedicated connection from the tenant pool
    const conn = await tenantSql.reserve();

    // Set the RLS session variable
    await conn`SELECT set_config('app.tenant_id', ${tenantId}, false)`;

    // Double-release guard
    let released = false;
    const releaseConn = () => {
      if (!released) {
        released = true;
        conn.release();
      }
    };

    // Release on response finish or close
    res.on('finish', releaseConn);
    res.on('close', releaseConn);

    // Attach tenant metadata to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      subscription_status: tenant.subscription_status,
      branding: tenant.branding_json ? JSON.parse(tenant.branding_json) : null,
      owner_email: tenant.owner_email || null,
      mp_user_id: tenant.mp_user_id || null,
      mp_default_terminal_id: tenant.mp_default_terminal_id || null,
    };

    // Run the rest of the request inside tenant context
    tenantContext.run({ conn }, () => {
      next();
    });
  } catch (err) {
    console.error('[Tenant] Middleware error:', err.message);
    return res.status(500).json({ error: 'Tenant resolution failed' });
  }
}
