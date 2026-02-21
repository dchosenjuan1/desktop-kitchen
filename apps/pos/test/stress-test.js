/**
 * Desktop Kitchen POS — Peak-Hour Stress Test
 *
 * Simulates a busy Friday-night rush with concurrent "agent" customers,
 * cashiers, kitchen staff, and managers all hitting the API at once.
 *
 * Run:  node test/stress-test.js
 */

const BASE = 'http://localhost:3001/api';

// ── Helpers ──────────────────────────────────────────────────────────

async function api(method, path, body, employeeId) {
  const headers = { 'Content-Type': 'application/json' };
  if (employeeId) headers['x-employee-id'] = String(employeeId);

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const start = performance.now();
  const res = await fetch(`${BASE}${path}`, opts);
  const elapsed = performance.now() - start;
  const data = await res.json().catch(() => null);

  return { status: res.status, ok: res.ok, data, elapsed };
}

const get = (p, eid) => api('GET', p, null, eid);
const post = (p, b, eid) => api('POST', p, b, eid);
const put = (p, b, eid) => api('PUT', p, b, eid);

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, arr.length));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Stats tracker ────────────────────────────────────────────────────

const stats = {
  total: 0, ok: 0, fail: 0, errors: [],
  byEndpoint: {},
  latencies: [],
  startTime: 0,
};

function record(label, result) {
  stats.total++;
  stats.latencies.push(result.elapsed);

  if (!stats.byEndpoint[label]) {
    stats.byEndpoint[label] = { ok: 0, fail: 0, totalMs: 0, maxMs: 0, count: 0 };
  }
  const ep = stats.byEndpoint[label];
  ep.count++;
  ep.totalMs += result.elapsed;
  ep.maxMs = Math.max(ep.maxMs, result.elapsed);

  if (result.ok) {
    stats.ok++;
    ep.ok++;
  } else {
    stats.fail++;
    ep.fail++;
    stats.errors.push({ label, status: result.status, data: result.data });
  }
}

// ── Test Scenarios (agent "customers") ───────────────────────────────

/**
 * Agent: POS Cashier — places an order, pays cash
 */
async function agentCashier(employeeId, menuItems, round) {
  // 1. Browse categories
  const catRes = await get('/menu/categories');
  record('GET /menu/categories', catRes);

  // 2. Browse menu items
  const itemRes = await get('/menu/items');
  record('GET /menu/items', itemRes);

  // 3. Place an order with 1-5 random items
  const numItems = Math.floor(Math.random() * 5) + 1;
  const chosenItems = pickN(menuItems, numItems).map(item => ({
    menu_item_id: item.id,
    quantity: Math.floor(Math.random() * 3) + 1,
    notes: round % 3 === 0 ? 'No onions please' : undefined,
  }));

  const orderRes = await post('/orders', {
    employee_id: employeeId,
    items: chosenItems,
  }, employeeId);
  record('POST /orders (create)', orderRes);

  if (!orderRes.ok || !orderRes.data?.id) return null;

  const orderId = orderRes.data.id;

  // 4. Pay with cash (tip ~10% of the time)
  const tip = Math.random() > 0.9 ? Math.floor(Math.random() * 50) + 10 : 0;
  const cashRes = await post('/payments/cash', {
    order_id: orderId,
    tip,
    amount_received: (orderRes.data.total || 200) + tip + 50,
  }, employeeId);
  record('POST /payments/cash', cashRes);

  return orderId;
}

/**
 * Agent: Kitchen Display — polls active orders, moves statuses
 */
async function agentKitchen(orderIds) {
  // 1. Poll kitchen active orders
  const kitchenRes = await get('/orders/kitchen/active');
  record('GET /orders/kitchen/active', kitchenRes);

  // 2. Move some orders through the pipeline
  for (const oid of orderIds.slice(0, 3)) {
    // preparing → ready
    const readyRes = await put(`/orders/${oid}/status`, { status: 'ready' });
    record('PUT /orders/:id/status (ready)', readyRes);

    await sleep(50);

    // ready → completed
    const doneRes = await put(`/orders/${oid}/status`, { status: 'completed' });
    record('PUT /orders/:id/status (completed)', doneRes);
  }
}

/**
 * Agent: Manager Dashboard — pulls reports while rush is happening
 */
async function agentManager() {
  const endpoints = [
    '/reports/sales?period=today',
    '/reports/top-items?period=today&limit=10',
    '/reports/employee-performance?period=today',
    '/reports/hourly',
    '/reports/live',
    '/reports/cash-card-breakdown?period=today',
  ];

  for (const ep of endpoints) {
    const res = await get(ep);
    record(`GET ${ep.split('?')[0]}`, res);
  }
}

/**
 * Agent: Inventory checker — reads inventory and low stock
 */
async function agentInventory() {
  const invRes = await get('/inventory');
  record('GET /inventory', invRes);

  const lowRes = await get('/inventory/low-stock');
  record('GET /inventory/low-stock', lowRes);
}

/**
 * Agent: Delivery orders poller
 */
async function agentDelivery() {
  const res = await get('/delivery/orders');
  record('GET /delivery/orders', res);
}

/**
 * Agent: AI suggestions (a cashier asking for upsell tips)
 */
async function agentAI(menuItems) {
  const itemIds = pickN(menuItems, 3).map(i => i.id);
  const hour = new Date().getHours();
  const res = await get(`/ai/suggestions/cart?items=${itemIds.join(',')}&hour=${hour}`);
  record('GET /ai/suggestions/cart', res);
}

// ── Main Orchestrator ────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      Desktop Kitchen POS — Peak-Hour Stress Test         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── Pre-flight: verify server & load seed data ──
  console.log('▶ Checking server health...');
  try {
    const health = await fetch(`http://localhost:3001/health`);
    if (!health.ok) throw new Error(`Status ${health.status}`);
    console.log('  ✓ Server is up\n');
  } catch (e) {
    console.error('  ✗ Server is not running on :3001 — start it with `npm run dev:server`');
    process.exit(1);
  }

  // Load employees
  const empRes = await get('/employees');
  if (!empRes.ok || !empRes.data?.length) {
    console.error('  ✗ No employees found — run `npm run seed` first');
    process.exit(1);
  }
  const cashiers = empRes.data.filter(e => e.role === 'cashier' || e.role === 'admin');
  const employees = empRes.data;
  console.log(`  Found ${employees.length} employees (${cashiers.length} cashiers/admins)`);

  // Load menu items
  const menuRes = await get('/menu/items');
  if (!menuRes.ok || !menuRes.data?.length) {
    console.error('  ✗ No menu items found — run `npm run seed` first');
    process.exit(1);
  }
  const menuItems = menuRes.data.filter(i => i.active !== 0);
  console.log(`  Found ${menuItems.length} active menu items\n`);

  // ── Configuration ──
  const TOTAL_WAVES = 5;            // simulate 5 waves of peak traffic
  const ORDERS_PER_WAVE = 10;       // 10 concurrent order-placement agents per wave
  const PAUSE_BETWEEN_WAVES = 500;  // ms between waves

  console.log(`▶ Simulating ${TOTAL_WAVES} waves × ${ORDERS_PER_WAVE} concurrent customers`);
  console.log(`  (${TOTAL_WAVES * ORDERS_PER_WAVE} total orders + kitchen/reports/inventory/AI)\n`);

  stats.startTime = performance.now();
  const allOrderIds = [];

  for (let wave = 1; wave <= TOTAL_WAVES; wave++) {
    console.log(`  Wave ${wave}/${TOTAL_WAVES}...`);

    // Fire off concurrent agents
    const promises = [];

    // POS Cashiers placing orders concurrently
    for (let i = 0; i < ORDERS_PER_WAVE; i++) {
      const emp = pick(cashiers);
      promises.push(
        agentCashier(emp.id, menuItems, wave * ORDERS_PER_WAVE + i)
          .then(oid => { if (oid) allOrderIds.push(oid); })
          .catch(e => { stats.fail++; stats.errors.push({ label: 'agentCashier', error: e.message }); })
      );
    }

    // Manager pulling reports in parallel
    promises.push(
      agentManager().catch(e => {
        stats.fail++;
        stats.errors.push({ label: 'agentManager', error: e.message });
      })
    );

    // Inventory checker
    promises.push(
      agentInventory().catch(e => {
        stats.fail++;
        stats.errors.push({ label: 'agentInventory', error: e.message });
      })
    );

    // Delivery poller
    promises.push(
      agentDelivery().catch(e => {
        stats.fail++;
        stats.errors.push({ label: 'agentDelivery', error: e.message });
      })
    );

    // AI suggestion requests
    for (let i = 0; i < 3; i++) {
      promises.push(
        agentAI(menuItems).catch(e => {
          stats.fail++;
          stats.errors.push({ label: 'agentAI', error: e.message });
        })
      );
    }

    await Promise.all(promises);

    // Kitchen processes orders from this wave
    if (allOrderIds.length > 0) {
      const recentOrders = allOrderIds.slice(-ORDERS_PER_WAVE);
      await agentKitchen(recentOrders).catch(e => {
        stats.fail++;
        stats.errors.push({ label: 'agentKitchen', error: e.message });
      });
    }

    if (wave < TOTAL_WAVES) await sleep(PAUSE_BETWEEN_WAVES);
  }

  const totalTime = performance.now() - stats.startTime;

  // ── Final burst: everyone checks everything at once ──
  console.log('\n  Final burst: all agents hit the system simultaneously...');
  const finalPromises = [];
  for (let i = 0; i < 5; i++) {
    const emp = pick(cashiers);
    finalPromises.push(agentCashier(emp.id, menuItems, 999).then(oid => { if (oid) allOrderIds.push(oid); }));
  }
  finalPromises.push(agentManager());
  finalPromises.push(agentInventory());
  finalPromises.push(agentKitchen(allOrderIds.slice(-5)));
  finalPromises.push(agentAI(menuItems));
  finalPromises.push(agentDelivery());

  // Also hit a bunch of order detail endpoints concurrently
  for (const oid of allOrderIds.slice(-10)) {
    finalPromises.push(get(`/orders/${oid}`).then(r => record('GET /orders/:id', r)));
    finalPromises.push(get(`/payments/${oid}`).then(r => record('GET /payments/:id', r)));
  }

  await Promise.allSettled(finalPromises);
  const finalTime = performance.now() - stats.startTime;

  // ── Report ─────────────────────────────────────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    STRESS TEST RESULTS                  ║');
  console.log('╠══════════════════════════════════════════════════════════╣');

  console.log(`║ Total requests:   ${String(stats.total).padStart(6)}                              ║`);
  console.log(`║ Successful:       ${String(stats.ok).padStart(6)}  (${((stats.ok / stats.total) * 100).toFixed(1)}%)                      ║`);
  console.log(`║ Failed:           ${String(stats.fail).padStart(6)}  (${((stats.fail / stats.total) * 100).toFixed(1)}%)                       ║`);
  console.log(`║ Orders created:   ${String(allOrderIds.length).padStart(6)}                              ║`);
  console.log(`║ Total time:       ${(finalTime / 1000).toFixed(2).padStart(6)}s                             ║`);
  console.log(`║ Throughput:       ${(stats.total / (finalTime / 1000)).toFixed(1).padStart(6)} req/s                        ║`);

  // Latency stats
  const sorted = stats.latencies.sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const avg = sorted.reduce((s, v) => s + v, 0) / sorted.length || 0;
  const max = sorted[sorted.length - 1] || 0;

  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║ LATENCY (ms)                                           ║');
  console.log(`║   Avg:   ${avg.toFixed(1).padStart(8)}                                    ║`);
  console.log(`║   p50:   ${p50.toFixed(1).padStart(8)}                                    ║`);
  console.log(`║   p95:   ${p95.toFixed(1).padStart(8)}                                    ║`);
  console.log(`║   p99:   ${p99.toFixed(1).padStart(8)}                                    ║`);
  console.log(`║   Max:   ${max.toFixed(1).padStart(8)}                                    ║`);
  console.log('╠══════════════════════════════════════════════════════════╣');

  // Per-endpoint breakdown
  console.log('║ ENDPOINT BREAKDOWN                                     ║');
  console.log('╠──────────────────────────────────────────────────────── ╣');

  const epEntries = Object.entries(stats.byEndpoint)
    .sort((a, b) => b[1].count - a[1].count);

  for (const [label, ep] of epEntries) {
    const avgMs = (ep.totalMs / ep.count).toFixed(0);
    const failTag = ep.fail > 0 ? ` [${ep.fail} FAIL]` : '';
    const shortLabel = label.length > 38 ? label.slice(0, 35) + '...' : label;
    console.log(`║  ${shortLabel.padEnd(38)} ${String(ep.count).padStart(4)}× avg ${avgMs.padStart(4)}ms max ${ep.maxMs.toFixed(0).padStart(5)}ms${failTag}`);
  }

  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Error summary
  if (stats.errors.length > 0) {
    console.log('⚠ ERRORS:');
    // Group errors
    const grouped = {};
    for (const e of stats.errors) {
      const key = `${e.label} → ${e.status || 'network'}: ${e.data?.error || e.error || 'unknown'}`;
      grouped[key] = (grouped[key] || 0) + 1;
    }
    for (const [msg, count] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
      console.log(`  (${count}×) ${msg}`);
    }
    console.log();
  }

  // Verdict
  const successRate = (stats.ok / stats.total) * 100;
  if (successRate >= 99) {
    console.log('✅ VERDICT: System PASSED peak-hour stress test with flying colors!');
  } else if (successRate >= 95) {
    console.log('⚠️  VERDICT: System held up mostly, but some requests failed under load.');
  } else if (successRate >= 80) {
    console.log('⚠️  VERDICT: System showed strain — review the error breakdown above.');
  } else {
    console.log('❌ VERDICT: System FAILED under peak-hour load. Investigate errors above.');
  }

  console.log(`   Success rate: ${successRate.toFixed(1)}% | ${allOrderIds.length} orders created in ${(finalTime / 1000).toFixed(1)}s\n`);
}

main().catch(e => {
  console.error('Stress test crashed:', e);
  process.exit(1);
});
