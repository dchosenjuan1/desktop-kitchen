import { tenantContext, tenantSql } from '../db/index.js';
import { getTenant, getTenantBySubdomain } from '../tenants.js';
import { onReserveStart, onReserveSuccess, onReserveFailure, onRelease } from '../lib/poolMetrics.js';

// Subdomains that belong to the platform itself and should NOT be resolved as tenants.
const RESERVED_SUBDOMAINS = new Set([
  'pos', 'app', 'api', 'admin', 'www', 'es', 'docs', 'staging', 'sales',
]);

/**
 * Tenant resolution middleware (async, Postgres + RLS).
 *
 * Resolution order:
 *   1. X-Tenant-ID header (dev: unrestricted, production: requires admin secret)
 *   2. Subdomain from Host header (production)
 *   3. Default tenant from DEFAULT_TENANT_ID env var
 *   4. No tenant — REJECT in production, warn in dev
 *
 * When a tenant is resolved:
 *   - Reserves a dedicated connection from tenantSql pool (with timeout)
 *   - Starts an explicit transaction (BEGIN) for PgBouncer safety
 *   - Sets `app.tenant_id` as transaction-scoped variable for RLS
 *   - Stores connection in AsyncLocalStorage so run/get/all/exec auto-use it
 *   - COMMITs and releases connection on response finish
 *   - ROLLBACKs and releases on premature close
 */
export async function tenantMiddleware(req, res, next) {
  let tenantId = null;
  let tenant = null;

  try {
    // 1. Explicit header (dev: unrestricted, production: requires admin secret)
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

    // 4. No tenant resolved — REJECT in production, warn in dev
    if (!tenantId) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Tenant] No tenant resolved — request proceeding without tenant scope (dev mode)');
        req.tenant = null;
        return next();
      }
      return res.status(401).json({ error: 'Could not resolve tenant. Check your subdomain or X-Tenant-ID header.' });
    }

    // Reserve a dedicated connection from the tenant pool (with timeout)
    let conn;
    const reserveStart = onReserveStart('tenant');
    try {
      conn = await Promise.race([
        tenantSql.reserve(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection pool exhausted')), 5000)
        ),
      ]);
      onReserveSuccess(reserveStart, 'tenant');
    } catch (poolErr) {
      onReserveFailure('tenant');
      console.error('[Tenant] Connection pool exhausted:', poolErr.message);
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
    }

    // Double-release guard — defined BEFORE any query so the connection is
    // always released even if BEGIN or set_config fail (e.g., dead TCP socket).
    let released = false;
    const releaseConn = (shouldCommit) => {
      if (!released) {
        released = true;
        onRelease('tenant');
        const finish = shouldCommit
          ? conn`COMMIT`.catch(() => conn`ROLLBACK`.catch(() => {}))
          : conn`ROLLBACK`.catch(() => {});
        finish.finally(() => conn.release());
      }
    };

    // COMMIT on successful response, ROLLBACK on premature close
    res.on('finish', () => releaseConn(true));
    res.on('close', () => {
      if (!res.writableFinished) releaseConn(false);
    });

    // Start an explicit transaction and set tenant_id as transaction-scoped.
    // This is PgBouncer-safe: even in transaction mode, set_config(..., true)
    // is guaranteed to persist for all queries within the same transaction.
    // Without BEGIN, autocommit queries may be routed to different backends
    // by PgBouncer, losing the session-scoped setting.
    try {
      await conn`BEGIN`;
      await conn`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    } catch (txErr) {
      console.error('[Tenant] Failed to initialize connection:', txErr.message);
      releaseConn(false);
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
    }

    // Normalize unknown plans to 'free'
    const plan = (tenant.plan === 'free' || tenant.plan === 'pro') ? tenant.plan : 'free';

    // Attach tenant metadata to request
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      plan,
      subscription_status: tenant.subscription_status,
      branding: tenant.branding_json ? JSON.parse(tenant.branding_json) : null,
      owner_email: tenant.owner_email || null,
      mp_user_id: tenant.mp_user_id || null,
      mp_default_terminal_id: tenant.mp_default_terminal_id || null,
    };

    // Run the rest of the request inside tenant context
    tenantContext.run({ conn, tenantId }, () => {
      next();
    });
  } catch (err) {
    console.error('[Tenant] Middleware error:', err.message);
    return res.status(500).json({ error: 'Tenant resolution failed' });
  }
}
