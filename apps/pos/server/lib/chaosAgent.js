/**
 * Chaos Agent — Multi-tenant isolation stress tester.
 *
 * Provisions ephemeral test tenants, fires concurrent load across all of them
 * through the RLS-enforced tenant pool, then verifies that no data leaked
 * across tenant boundaries. Cleans up everything on exit — even on failure.
 */

import { adminSql, tenantSql } from '../db/index.js';
import { createTenant } from '../tenants.js';
import bcrypt from 'bcrypt';

const CHAOS_SOURCE = 'chaos_test';
const TAX_RATE = 0.16;
const BCRYPT_ROUNDS = 4; // fast — test-only accounts

const TENANT_DEFS = [
  { id: 'chaos-tenant-a', name: 'Chaos Tenant A' },
  { id: 'chaos-tenant-b', name: 'Chaos Tenant B' },
  { id: 'chaos-tenant-c', name: 'Chaos Tenant C' },
];

// ─── State ─────────────────────────────────────────────────
let running = false;

export function isChaosRunning() {
  return running;
}

// ─── Helpers ───────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Provisioning ──────────────────────────────────────────

async function provisionTenants(emit) {
  const tenants = [];

  for (const def of TENANT_DEFS) {
    emit('progress', { phase: 'provision', message: `Creating ${def.id}...`, percent: 5 });

    // Clean up leftover from a previous crashed run
    await cleanupTenantData(def.id);

    const hash = await bcrypt.hash('chaos-test-pw', BCRYPT_ROUNDS);
    await createTenant({
      id: def.id,
      name: def.name,
      subdomain: def.id,
      owner_email: `${def.id}@chaos.test`,
      owner_password_hash: hash,
      plan: 'trial',
    });

    // Seed 2 menu categories
    const [cat1] = await adminSql`
      INSERT INTO menu_categories (tenant_id, name, sort_order, active)
      VALUES (${def.id}, 'Chaos Mains', 1, true) RETURNING id`;
    const [cat2] = await adminSql`
      INSERT INTO menu_categories (tenant_id, name, sort_order, active)
      VALUES (${def.id}, 'Chaos Drinks', 2, true) RETURNING id`;

    // Seed 5 menu items
    const itemIds = [];
    for (let i = 1; i <= 3; i++) {
      const [item] = await adminSql`
        INSERT INTO menu_items (tenant_id, category_id, name, price, active)
        VALUES (${def.id}, ${cat1.id}, ${`Chaos Burger ${i}`}, ${100 + i * 10}, true) RETURNING id`;
      itemIds.push(item.id);
    }
    for (let i = 1; i <= 2; i++) {
      const [item] = await adminSql`
        INSERT INTO menu_items (tenant_id, category_id, name, price, active)
        VALUES (${def.id}, ${cat2.id}, ${`Chaos Soda ${i}`}, ${30 + i * 5}, true) RETURNING id`;
      itemIds.push(item.id);
    }

    // Seed 2 employees
    const employeeIds = [];
    for (let i = 1; i <= 2; i++) {
      const pin = await bcrypt.hash(String(1000 + i), BCRYPT_ROUNDS);
      const [emp] = await adminSql`
        INSERT INTO employees (tenant_id, name, pin, role, active)
        VALUES (${def.id}, ${`Chaos Worker ${i}`}, ${pin}, 'cashier', true) RETURNING id`;
      employeeIds.push(emp.id);
    }

    // Ensure daily_order_counter exists for this tenant
    const dateStr = new Date().toISOString().split('T')[0];
    await adminSql`
      INSERT INTO daily_order_counter (tenant_id, date_key, last_seq)
      VALUES (${def.id}, ${dateStr}::date, 0)
      ON CONFLICT (tenant_id, date_key) DO NOTHING`;

    tenants.push({
      ...def,
      categoryIds: [cat1.id, cat2.id],
      itemIds,
      employeeIds,
    });
  }

  return tenants;
}

// ─── Order Creation (tenant pool + RLS) ────────────────────

async function createOrdersForTenant(tenantInfo, count, emit) {
  const conn = await tenantSql.reserve();
  const orderIds = [];
  const timings = [];
  let errors = 0;

  try {
    // Set tenant context on this reserved connection
    await conn`SELECT set_config('app.tenant_id', ${tenantInfo.id}, false)`;

    for (let i = 0; i < count; i++) {
      const start = Date.now();
      try {
        const employeeId = pick(tenantInfo.employeeIds);
        const numItems = Math.floor(Math.random() * 3) + 1;
        let itemsTotal = 0;
        const items = [];

        for (let j = 0; j < numItems; j++) {
          const itemId = pick(tenantInfo.itemIds);
          const qty = Math.floor(Math.random() * 2) + 1;
          // Read item price through RLS-enforced connection
          const [item] = await conn`SELECT id, name, price FROM menu_items WHERE id = ${itemId}`;
          if (!item) continue;
          const unitPrice = Number(item.price);
          itemsTotal += unitPrice * qty;
          items.push({ menu_item_id: item.id, item_name: item.name, quantity: qty, unit_price: unitPrice });
        }

        if (items.length === 0) {
          errors++;
          timings.push(Date.now() - start);
          continue;
        }

        const total = itemsTotal;
        const tax = Math.round((total - total / (1 + TAX_RATE)) * 100) / 100;
        const subtotal = Math.round((total - tax) * 100) / 100;

        const dateStr = new Date().toISOString().split('T')[0];
        const datePrefix = parseInt(dateStr.replace(/-/g, '')) * 1000;

        const [counter] = await conn`
          INSERT INTO daily_order_counter (tenant_id, date_key, last_seq)
          VALUES (${tenantInfo.id}, ${dateStr}::date, 1)
          ON CONFLICT (tenant_id, date_key) DO UPDATE SET last_seq = daily_order_counter.last_seq + 1
          RETURNING last_seq`;

        const orderNumber = datePrefix + counter.last_seq;

        const [order] = await conn`
          INSERT INTO orders (tenant_id, order_number, employee_id, status, subtotal, tax, total, payment_status, source)
          VALUES (${tenantInfo.id}, ${orderNumber}, ${employeeId}, 'pending', ${subtotal}, ${tax}, ${total}, 'unpaid', ${CHAOS_SOURCE})
          RETURNING id`;

        for (const item of items) {
          await conn`
            INSERT INTO order_items (tenant_id, order_id, menu_item_id, item_name, quantity, unit_price)
            VALUES (${tenantInfo.id}, ${order.id}, ${item.menu_item_id}, ${item.item_name}, ${item.quantity}, ${item.unit_price})`;
        }

        orderIds.push(order.id);
        timings.push(Date.now() - start);
      } catch (err) {
        errors++;
        timings.push(Date.now() - start);
        console.error(`[ChaosAgent] Order error for ${tenantInfo.id}:`, err.message);
      }
    }
  } finally {
    conn.release();
  }

  return { tenantId: tenantInfo.id, orderIds, timings, errors };
}

// ─── Isolation Verification ────────────────────────────────

async function verifyIsolation(tenants, orderResults, emit) {
  const breaches = [];

  for (const result of orderResults) {
    const tenantId = result.tenantId;
    const expectedCount = result.orderIds.length;

    emit('progress', {
      phase: 'verify',
      message: `Verifying isolation for ${tenantId} (${expectedCount} orders)...`,
      percent: 70,
    });

    // 1. Query via tenant-scoped connection — should see only its own orders
    const conn = await tenantSql.reserve();
    let scopedCount = 0;
    try {
      await conn`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
      const [row] = await conn`
        SELECT COUNT(*)::int AS cnt FROM orders WHERE source = ${CHAOS_SOURCE}`;
      scopedCount = row.cnt;
    } finally {
      conn.release();
    }

    if (scopedCount !== expectedCount) {
      breaches.push({
        type: 'count_mismatch',
        tenantId,
        expected: expectedCount,
        actual: scopedCount,
        message: `Tenant ${tenantId}: expected ${expectedCount} orders via RLS, got ${scopedCount}`,
      });
    }

    // 2. Cross-check via adminSql — verify every order row has correct tenant_id
    if (result.orderIds.length > 0) {
      const rows = await adminSql`
        SELECT id, tenant_id FROM orders WHERE id = ANY(${result.orderIds})`;

      for (const row of rows) {
        if (row.tenant_id !== tenantId) {
          breaches.push({
            type: 'cross_tenant_row',
            severity: 'CRITICAL',
            orderId: row.id,
            expectedTenant: tenantId,
            actualTenant: row.tenant_id,
            message: `CRITICAL: Order ${row.id} created by ${tenantId} connection has tenant_id=${row.tenant_id}`,
          });
        }
      }
    }

    // 3. Verify no chaos orders from OTHER tenants are visible through this tenant's RLS
    const otherTenantIds = tenants.map(t => t.id).filter(id => id !== tenantId);
    const conn2 = await tenantSql.reserve();
    try {
      await conn2`SELECT set_config('app.tenant_id', ${tenantId}, false)`;
      // This should return 0 — if RLS is working, we can't see other tenants' orders
      const [leaked] = await conn2`
        SELECT COUNT(*)::int AS cnt FROM orders
        WHERE source = ${CHAOS_SOURCE} AND tenant_id = ANY(${otherTenantIds})`;
      if (leaked.cnt > 0) {
        breaches.push({
          type: 'rls_leak',
          severity: 'CRITICAL',
          tenantId,
          leakedCount: leaked.cnt,
          message: `CRITICAL: Tenant ${tenantId} can see ${leaked.cnt} orders from other tenants through RLS`,
        });
      }
    } finally {
      conn2.release();
    }
  }

  return breaches;
}

// ─── Connection Pool Integrity ─────────────────────────────

async function checkConnectionPool(tenants, emit) {
  emit('progress', { phase: 'pool_check', message: 'Checking connection pool integrity...', percent: 80 });

  const tenantIds = tenants.map(t => t.id);
  const anomalies = [];

  const rows = await adminSql`
    SELECT pid, usename, application_name,
           (SELECT setting FROM pg_settings WHERE name = 'app.tenant_id' LIMIT 0) AS note
    FROM pg_stat_activity
    WHERE state = 'idle' AND usename = ${process.env.PG_APP_USER || 'app_user'}`;

  // Check for connections that still have a chaos tenant_id set
  // We do this by briefly reserving and checking each idle connection
  // This is a best-effort check — connections may have been returned cleanly
  for (const row of rows) {
    try {
      const conn = await tenantSql.reserve();
      try {
        const [cfg] = await conn`SELECT current_setting('app.tenant_id', true) AS tid`;
        if (cfg.tid && tenantIds.includes(cfg.tid)) {
          anomalies.push({
            pid: row.pid,
            staleTenanId: cfg.tid,
            message: `Connection PID ${row.pid} still has app.tenant_id=${cfg.tid} after chaos run`,
          });
        }
        // Reset it
        await conn`SELECT set_config('app.tenant_id', '', false)`;
      } finally {
        conn.release();
      }
    } catch {
      // Pool exhausted or connection error — skip
      break;
    }
  }

  return anomalies;
}

// ─── Cleanup ───────────────────────────────────────────────

async function cleanupTenantData(tenantId) {
  // Delete in FK-safe order using adminSql (bypasses RLS)
  try {
    await adminSql`DELETE FROM order_item_modifiers WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM order_items WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM order_payments WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM orders WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM menu_item_ingredients WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM menu_items WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM menu_categories WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM employees WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM role_permissions WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM loyalty_config WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM financial_targets WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM virtual_brands WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM daily_order_counter WHERE tenant_id = ${tenantId}`;
    await adminSql`DELETE FROM tenants WHERE id = ${tenantId}`;
  } catch (err) {
    console.error(`[ChaosAgent] Cleanup error for ${tenantId}:`, err.message);
  }
}

// ─── Main Entry Point ──────────────────────────────────────

export async function runChaosAgent(ordersPerTenant, emit) {
  if (running) throw new Error('Chaos agent is already running');
  running = true;

  const startTime = Date.now();
  let tenants = [];
  let orderResults = [];
  let breaches = [];
  let anomalies = [];
  let verdict = 'FAIL';

  try {
    // ── Step 1: Provision ──────────────────────────────────
    emit('progress', { phase: 'provision', message: 'Provisioning test tenants...', percent: 2 });
    tenants = await provisionTenants(emit);
    emit('progress', {
      phase: 'provision',
      message: `Provisioned ${tenants.length} tenants with menu items and employees`,
      percent: 15,
    });

    // ── Step 2: Concurrent load ────────────────────────────
    emit('progress', {
      phase: 'load',
      message: `Firing ${ordersPerTenant} orders × ${tenants.length} tenants concurrently...`,
      percent: 20,
    });

    orderResults = await Promise.all(
      tenants.map(t => createOrdersForTenant(t, ordersPerTenant, emit))
    );

    const totalOrders = orderResults.reduce((s, r) => s + r.orderIds.length, 0);
    const totalErrors = orderResults.reduce((s, r) => s + r.errors, 0);
    emit('progress', {
      phase: 'load',
      message: `Created ${totalOrders} orders (${totalErrors} errors) across ${tenants.length} tenants`,
      percent: 60,
    });

    // ── Step 3: Isolation verification ─────────────────────
    emit('progress', { phase: 'verify', message: 'Verifying tenant isolation...', percent: 65 });
    breaches = await verifyIsolation(tenants, orderResults, emit);
    emit('progress', {
      phase: 'verify',
      message: breaches.length === 0
        ? 'Isolation verified — zero breaches'
        : `WARNING: ${breaches.length} isolation breach(es) detected!`,
      percent: 78,
    });

    // ── Step 4: Connection pool check ──────────────────────
    anomalies = await checkConnectionPool(tenants, emit);
    emit('progress', {
      phase: 'pool_check',
      message: anomalies.length === 0
        ? 'Connection pool clean — no stale tenant contexts'
        : `${anomalies.length} connection anomaly(ies) found`,
      percent: 85,
    });

    // ── Verdict ────────────────────────────────────────────
    const criticalBreaches = breaches.filter(b => b.severity === 'CRITICAL');
    if (criticalBreaches.length === 0 && breaches.length === 0) {
      verdict = 'PASS';
    } else if (criticalBreaches.length === 0) {
      verdict = 'WARN';
    }

  } finally {
    // ── Step 5: Cleanup (always runs) ──────────────────────
    emit('progress', { phase: 'cleanup', message: 'Cleaning up test data...', percent: 90 });
    for (const t of tenants) {
      await cleanupTenantData(t.id);
    }
    // Also clean up any tenants from TENANT_DEFS that might exist from a crashed run
    for (const def of TENANT_DEFS) {
      if (!tenants.find(t => t.id === def.id)) {
        await cleanupTenantData(def.id);
      }
    }
    emit('progress', { phase: 'cleanup', message: 'Cleanup complete', percent: 98 });
    running = false;
  }

  const durationMs = Date.now() - startTime;

  // ── Build report ───────────────────────────────────────────
  const allTimings = orderResults.flatMap(r => r.timings);
  const sorted = [...allTimings].sort((a, b) => a - b);
  const avg = sorted.length > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length) : 0;

  return {
    verdict,
    durationMs,
    tenantsProvisioned: tenants.length,
    ordersPerTenant,
    tenantResults: orderResults.map(r => ({
      tenantId: r.tenantId,
      ordersCreated: r.orderIds.length,
      errors: r.errors,
      avgLatencyMs: r.timings.length > 0
        ? Math.round(r.timings.reduce((a, b) => a + b, 0) / r.timings.length)
        : 0,
    })),
    totalOrdersCreated: orderResults.reduce((s, r) => s + r.orderIds.length, 0),
    totalErrors: orderResults.reduce((s, r) => s + r.errors, 0),
    isolationBreaches: breaches,
    connectionAnomalies: anomalies,
    latency: {
      avg,
      p50: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0,
      p95: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0,
      max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
    },
  };
}
