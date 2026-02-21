/**
 * JUANBERTOS POS — OPENING DAY STRESS TEST
 *
 * Simulates a full busy day with concurrent agents:
 *   - 2 Cashiers (Maria & Carlos) taking POS orders nonstop
 *   - 1 Kitchen line working through the order queue
 *   - 3 Delivery platforms sending webhook orders
 *   - 1 Manager pulling reports and checking dashboards
 *   - AI suggestions firing on every cart
 *   - Split payments, cash payments, tips, cancellations
 *   - Inventory pressure building toward low-stock alerts
 *
 * Usage: node test/opening-day-stress.mjs [--base-url http://localhost:3001]
 */

const BASE = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3001';

const API = `${BASE}/api`;

// ─── Helpers ──────────────────────────────────────────────

let totalRequests = 0;
let totalErrors = 0;
const errors = [];
const timings = [];

async function api(method, endpoint, body) {
  const url = `${API}${endpoint}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const start = Date.now();
  totalRequests++;

  try {
    const res = await fetch(url, opts);
    const elapsed = Date.now() - start;
    timings.push({ endpoint, method, elapsed, status: res.status });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'no body');
      totalErrors++;
      errors.push({ endpoint, method, status: res.status, body: errText.substring(0, 200) });
      return { ok: false, status: res.status, error: errText };
    }
    return { ok: true, data: await res.json(), elapsed };
  } catch (err) {
    totalErrors++;
    errors.push({ endpoint, method, error: err.message });
    return { ok: false, error: err.message };
  }
}

const get = (e) => api('GET', e);
const post = (e, b) => api('POST', e, b);
const put = (e, b) => api('PUT', e, b);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ─── Menu Knowledge (populated from API at startup) ──────

let BURRITOS = [];
let TACOS = [];
let QUESADILLAS = [];
let COMBOS = [];
let SIDES = [];
let DRINKS = [];
let BEERS = [];
let ALL_ITEMS = [];

let SALSAS = [];
let ADDONS = [];
let TORTILLAS = [];
let ALL_MODIFIERS = [];

const EMPLOYEES = { maria: null, carlos: null, manager: null };

async function loadMenuData() {
  console.log('\n📋 Loading menu data from API...');

  // Load categories and items
  const catRes = await get('/menu/categories');
  const itemRes = await get('/menu/items');

  if (!catRes.ok || !itemRes.ok) {
    console.error('❌ Failed to load menu data');
    process.exit(1);
  }

  const categoryMap = {};
  for (const cat of catRes.data) {
    categoryMap[cat.name.toLowerCase()] = cat.id;
  }

  for (const item of itemRes.data) {
    const id = item.id;
    ALL_ITEMS.push(id);

    if (item.category_id === categoryMap['burritos']) BURRITOS.push(id);
    else if (item.category_id === categoryMap['tacos']) TACOS.push(id);
    else if (item.category_id === categoryMap['quesadillas']) QUESADILLAS.push(id);
    else if (item.category_id === categoryMap['combos']) COMBOS.push(id);
    else if (item.category_id === categoryMap['sides']) SIDES.push(id);
    else if (item.category_id === categoryMap['drinks']) DRINKS.push(id);
    else if (item.category_id === categoryMap['beers']) BEERS.push(id);
  }

  console.log(`   Burritos: ${BURRITOS.join(',')}`);
  console.log(`   Tacos: ${TACOS.join(',')}`);
  console.log(`   Quesadillas: ${QUESADILLAS.join(',')}`);
  console.log(`   Combos: ${COMBOS.join(',')}`);
  console.log(`   Sides: ${SIDES.join(',')}`);
  console.log(`   Drinks: ${DRINKS.join(',')}`);
  console.log(`   Beers: ${BEERS.join(',')}`);

  // Load modifiers
  const modRes = await get('/modifiers/groups');
  if (modRes.ok && modRes.data) {
    for (const group of modRes.data) {
      const mods = (group.modifiers || []).map(m => m.id);
      const name = group.name.toLowerCase();
      if (name === 'salsa') SALSAS = mods;
      else if (name === 'add-ons') ADDONS = mods;
      else if (name === 'tortilla') TORTILLAS = mods;
      ALL_MODIFIERS.push(...mods);
    }
  }

  console.log(`   Modifiers: ${ALL_MODIFIERS.length} total`);
  console.log(`   Total menu items: ${ALL_ITEMS.length}`);
}

// ─── Stats Tracker ────────────────────────────────────────

const stats = {
  ordersCreated: 0,
  ordersCompleted: 0,
  ordersCancelled: 0,
  cashPayments: 0,
  splitPayments: 0,
  deliveryOrders: 0,
  kitchenTransitions: 0,
  aiSuggestionsRequested: 0,
  reportsChecked: 0,
  inventoryChecks: 0,
  modifierOrders: 0,
};

// ─── Agent: Login All Employees ───────────────────────────

async function loginAll() {
  console.log('\n🔑 Logging in employees...');

  const [maria, carlos, manager] = await Promise.all([
    post('/employees/login', { pin: '5678' }),
    post('/employees/login', { pin: '9012' }),
    post('/employees/login', { pin: '1234' }),
  ]);

  if (!maria.ok || !carlos.ok || !manager.ok) {
    console.error('❌ Login failed! Is the server running and seeded?');
    console.error('   Run: npm run seed && npm run dev:server');
    process.exit(1);
  }

  EMPLOYEES.maria = maria.data.id;
  EMPLOYEES.carlos = carlos.data.id;
  EMPLOYEES.manager = manager.data.id;

  console.log(`   ✅ Maria (cashier #${EMPLOYEES.maria})`);
  console.log(`   ✅ Carlos (cashier #${EMPLOYEES.carlos})`);
  console.log(`   ✅ Manager (#${EMPLOYEES.manager})`);
}

// ─── Agent: Cashier ───────────────────────────────────────

function buildRandomOrder(employeeId) {
  const numItems = rand(1, 6);
  const items = [];

  for (let i = 0; i < numItems; i++) {
    const itemId = pick(ALL_ITEMS);
    const item = { menu_item_id: itemId, quantity: rand(1, 3) };

    // Add modifiers to burritos and tacos
    if (BURRITOS.includes(itemId)) {
      item.modifiers = [pick(SALSAS), pick(ADDONS)];
      if (Math.random() > 0.5) item.modifiers.push(pick(TORTILLAS));
      stats.modifierOrders++;
    } else if (TACOS.includes(itemId)) {
      item.modifiers = [pick(SALSAS)];
      if (Math.random() > 0.5) item.modifiers.push(pick(ADDONS));
      stats.modifierOrders++;
    }

    // Occasional notes
    if (Math.random() > 0.7) {
      item.notes = pick([
        'No onions', 'Extra spicy', 'Light on cheese', 'Well done',
        'No cilantro', 'Extra salsa on side', 'Allergic to shellfish',
      ]);
    }

    items.push(item);
  }

  return { employee_id: employeeId, items };
}

async function cashierAgent(name, employeeId, orderCount) {
  console.log(`\n💰 Cashier ${name} starting shift — will take ${orderCount} orders`);

  for (let i = 0; i < orderCount; i++) {
    const order = buildRandomOrder(employeeId);

    // Get AI suggestions before placing order
    const cartItemIds = order.items.map(it => it.menu_item_id);
    const hour = rand(11, 21);
    const sugResp = await get(`/ai/suggestions/cart?items=${cartItemIds.join(',')}&hour=${hour}`);
    stats.aiSuggestionsRequested++;

    if (sugResp.ok && sugResp.data?.length > 0) {
      // 40% chance cashier adds the suggested item
      if (Math.random() > 0.6) {
        const suggestion = sugResp.data[0];
        if (suggestion.suggested_item_id) {
          order.items.push({ menu_item_id: suggestion.suggested_item_id, quantity: 1 });

          // Submit positive feedback
          await post('/ai/suggestions/feedback', {
            suggestion_id: suggestion.id || `heuristic_${Date.now()}`,
            action: 'accepted',
            order_id: null,
          });
        }
      } else {
        // Dismiss
        await post('/ai/suggestions/feedback', {
          suggestion_id: sugResp.data[0]?.id || `heuristic_${Date.now()}`,
          action: 'dismissed',
          order_id: null,
        });
      }
    }

    // Create order
    const res = await post('/orders', order);
    if (res.ok) {
      stats.ordersCreated++;
      const orderId = res.data.id;

      // Random delay simulating customer payment
      await sleep(rand(200, 800));

      // Payment: 60% cash, 20% split, 20% cancel
      const payRoll = Math.random();
      if (payRoll < 0.05) {
        // 5% cancellation
        await put(`/orders/${orderId}/status`, { status: 'cancelled' });
        stats.ordersCancelled++;
      } else if (payRoll < 0.25) {
        // 20% split payment
        const total = res.data.total || 300;
        const half = Math.round(total / 2 * 100) / 100;
        await post('/payments/split', {
          order_id: orderId,
          split_type: 'by_amount',
          splits: [
            { payment_method: 'cash', amount: half, tip: rand(0, 30) },
            { payment_method: 'card', amount: total - half, tip: rand(0, 50) },
          ],
        });
        stats.splitPayments++;
      } else {
        // Cash payment
        const tip = Math.random() > 0.4 ? rand(10, 80) : 0;
        const total = res.data.total || 300;
        await post('/payments/cash', {
          order_id: orderId,
          tip,
          amount_received: total + tip + rand(0, 100),
        });
        stats.cashPayments++;
      }

      // Deduct inventory
      await post('/inventory/deduct', { order_id: orderId });

    } else {
      console.log(`   ⚠️  ${name}: Order ${i + 1} failed — ${res.error?.substring(0, 80)}`);
    }

    // Brief pause between customers
    await sleep(rand(100, 400));
  }

  console.log(`   ✅ ${name} finished shift — ${orderCount} orders taken`);
}

// ─── Agent: Kitchen Line ──────────────────────────────────

async function kitchenAgent(duration) {
  console.log(`\n🔥 Kitchen line open — working for ${duration / 1000}s`);
  const endTime = Date.now() + duration;

  while (Date.now() < endTime) {
    const res = await get('/orders/kitchen/active');
    if (res.ok && res.data?.length > 0) {
      for (const order of res.data) {
        // Move through status pipeline: pending → confirmed → preparing → ready → completed
        if (order.status === 'pending') {
          const c = await put(`/orders/${order.id}/status`, { status: 'confirmed' });
          if (c.ok) stats.kitchenTransitions++;
          await sleep(rand(50, 150));

          const p = await put(`/orders/${order.id}/status`, { status: 'preparing' });
          if (p.ok) stats.kitchenTransitions++;
        } else if (order.status === 'confirmed') {
          const p = await put(`/orders/${order.id}/status`, { status: 'preparing' });
          if (p.ok) stats.kitchenTransitions++;
        } else if (order.status === 'preparing') {
          // Simulate cook time
          await sleep(rand(200, 500));
          const r = await put(`/orders/${order.id}/status`, { status: 'ready' });
          if (r.ok) stats.kitchenTransitions++;

          await sleep(rand(50, 150));
          const d = await put(`/orders/${order.id}/status`, { status: 'completed' });
          if (d.ok) {
            stats.kitchenTransitions++;
            stats.ordersCompleted++;
          }
        }
      }
    }
    await sleep(rand(300, 700));
  }

  console.log(`   ✅ Kitchen closed — ${stats.kitchenTransitions} status transitions`);
}

// ─── Agent: Delivery Platforms ────────────────────────────

async function deliveryAgent(platform, webhookPath, orderCount) {
  console.log(`\n🛵 ${platform} — sending ${orderCount} delivery orders`);

  for (let i = 0; i < orderCount; i++) {
    const numItems = rand(1, 4);
    const items = [];

    for (let j = 0; j < numItems; j++) {
      items.push({
        name: pick(['California Burrito', 'Carne Asada Burrito', 'Street Tacos', 'Nachos', 'Birria Taco']),
        quantity: rand(1, 2),
        unit_price: rand(60, 240),
        notes: Math.random() > 0.7 ? 'No onions' : '',
      });
    }

    const webhookData = {
      external_id: `${platform.toUpperCase()}-${Date.now()}-${i}`,
      items,
      customer_name: pick(['Juan Garcia', 'Ana Lopez', 'Pedro Martinez', 'Sofia Hernandez', 'Diego Rivera']),
      customer_phone: `+5213${rand(10000000, 99999999)}`,
      delivery_address: pick([
        'Av. Reforma 123, Col. Centro',
        'Calle 5 de Mayo 456, Col. Juárez',
        'Blvd. Insurgentes 789, Col. Roma',
        'Av. Chapultepec 321, Col. Condesa',
      ]),
      subtotal: 0,
      delivery_fee: rand(20, 60),
      platform_fee: rand(15, 45),
    };
    webhookData.subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);

    const res = await post(`/delivery/webhook/${webhookPath}`, webhookData);
    if (res.ok) {
      stats.deliveryOrders++;

      // Simulate delivery lifecycle
      if (res.data?.order_id) {
        await sleep(rand(200, 500));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'confirmed' });
        await sleep(rand(200, 400));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'preparing' });
        await sleep(rand(300, 600));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'ready_for_pickup' });
        await sleep(rand(200, 400));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'picked_up' });
      }
    }

    await sleep(rand(300, 800));
  }

  console.log(`   ✅ ${platform} — ${orderCount} orders sent`);
}

// ─── Agent: Manager Dashboard ─────────────────────────────

async function managerAgent(duration) {
  console.log(`\n📊 Manager monitoring dashboards for ${duration / 1000}s`);
  const endTime = Date.now() + duration;

  while (Date.now() < endTime) {
    // Rotate through all report types
    const reports = [
      () => get('/reports/sales?period=daily'),
      () => get('/reports/top-items?period=daily&limit=10'),
      () => get('/reports/employee-performance?period=daily'),
      () => get('/reports/hourly'),
      () => get('/reports/cash-card-breakdown?period=daily'),
      () => get('/reports/cogs?period=daily'),
      () => get('/reports/category-margins?period=daily'),
      () => get('/reports/contribution-margin?period=daily'),
      () => get('/reports/live'),
      () => get('/reports/delivery-margins?period=daily'),
      () => get('/reports/channel-comparison?period=daily'),
    ];

    for (const reportFn of reports) {
      await reportFn();
      stats.reportsChecked++;
    }

    // Check inventory
    const [inv, lowStock] = await Promise.all([
      get('/inventory'),
      get('/inventory/low-stock'),
    ]);
    stats.inventoryChecks += 2;

    if (lowStock.ok && lowStock.data?.length > 0) {
      console.log(`   ⚠️  LOW STOCK ALERT: ${lowStock.data.map(i => i.name).join(', ')}`);
      // Auto-restock critically low items
      for (const item of lowStock.data) {
        if (item.quantity < 5) {
          await post(`/inventory/${item.id}/restock`, { quantity: 50 });
          console.log(`   📦 Emergency restock: ${item.name} (+50)`);
        }
      }
    }

    // Check AI insights & analytics
    await get('/ai/insights');
    await get('/ai/analytics?period=daily');
    await get('/ai/pricing-suggestions');
    await get('/ai/inventory-forecast');
    await get('/ai/category-roles');
    stats.reportsChecked += 5;

    // Check inventory push suggestions
    await get('/ai/suggestions/inventory-push');
    stats.aiSuggestionsRequested++;

    // Check kitchen queue
    await get('/orders/kitchen/active');

    // Check delivery orders
    await get('/delivery/orders');
    await get('/delivery/platforms');

    // Check modifiers and combos are intact
    await get('/modifiers/groups');
    await get('/combos');

    // Check printers
    await get('/printers');
    await get('/printers/routes');

    await sleep(rand(2000, 4000));
  }

  console.log(`   ✅ Manager done — ${stats.reportsChecked} reports checked`);
}

// ─── Agent: Edge Case Tester ──────────────────────────────

async function edgeCaseAgent() {
  console.log('\n🧪 Running edge cases...');

  // 1. Empty order (should fail)
  const empty = await post('/orders', { employee_id: EMPLOYEES.maria, items: [] });
  console.log(`   Empty order: ${empty.ok ? '⚠️ ACCEPTED (unexpected)' : '✅ Rejected'}`);

  // 2. Invalid menu item
  const badItem = await post('/orders', {
    employee_id: EMPLOYEES.maria,
    items: [{ menu_item_id: 99999, quantity: 1 }],
  });
  console.log(`   Invalid item: ${badItem.ok ? '⚠️ ACCEPTED (unexpected)' : '✅ Rejected'}`);

  // 3. Invalid employee
  const badEmp = await post('/orders', {
    employee_id: 99999,
    items: [{ menu_item_id: 1, quantity: 1 }],
  });
  console.log(`   Invalid employee: ${badEmp.ok ? '⚠️ ACCEPTED (unexpected)' : '✅ Rejected'}`);

  // 4. Negative quantity
  const negQty = await post('/orders', {
    employee_id: EMPLOYEES.maria,
    items: [{ menu_item_id: 1, quantity: -5 }],
  });
  console.log(`   Negative qty: ${negQty.ok ? '⚠️ ACCEPTED (unexpected)' : '✅ Rejected'}`);

  // 5. Massive order (20 items, qty 10 each — inventory stress)
  const bigItems = [];
  for (let i = 0; i < 20; i++) {
    bigItems.push({ menu_item_id: pick(BURRITOS), quantity: 10 });
  }
  const bigOrder = await post('/orders', {
    employee_id: EMPLOYEES.carlos,
    items: bigItems,
  });
  console.log(`   Massive order (200 items): ${bigOrder.ok ? '✅ Created' : '⚠️ Failed'}`);
  if (bigOrder.ok) {
    stats.ordersCreated++;
    // Try to pay it
    await post('/payments/cash', {
      order_id: bigOrder.data.id,
      amount_received: 99999,
      tip: 500,
    });
    stats.cashPayments++;
    await post('/inventory/deduct', { order_id: bigOrder.data.id });
  }

  // 6. Double payment on same order
  const dblOrder = await post('/orders', {
    employee_id: EMPLOYEES.maria,
    items: [{ menu_item_id: 1, quantity: 1 }],
  });
  if (dblOrder.ok) {
    stats.ordersCreated++;
    await post('/payments/cash', { order_id: dblOrder.data.id, amount_received: 500 });
    const dblPay = await post('/payments/cash', { order_id: dblOrder.data.id, amount_received: 500 });
    console.log(`   Double payment: ${dblPay.ok ? '⚠️ ACCEPTED (possible issue)' : '✅ Rejected'}`);
  }

  // 7. Invalid status transition (pending → completed, skipping steps)
  const skipOrder = await post('/orders', {
    employee_id: EMPLOYEES.carlos,
    items: [{ menu_item_id: pick(DRINKS), quantity: 1 }],
  });
  if (skipOrder.ok) {
    stats.ordersCreated++;
    const skip = await put(`/orders/${skipOrder.data.id}/status`, { status: 'completed' });
    console.log(`   Skip status: ${skip.ok ? '⚠️ Allowed skip (no validation)' : '✅ Rejected'}`);
  }

  // 8. Wrong PIN login
  const badPin = await post('/employees/login', { pin: '0000' });
  console.log(`   Wrong PIN: ${badPin.ok ? '⚠️ ACCEPTED (security issue!)' : '✅ Rejected'}`);

  // 9. Concurrent orders on same employee (race condition test)
  console.log('   Racing 10 concurrent orders...');
  const raceOrders = Array.from({ length: 10 }, () =>
    post('/orders', {
      employee_id: EMPLOYEES.maria,
      items: [{ menu_item_id: pick(ALL_ITEMS), quantity: 1 }],
    })
  );
  const raceResults = await Promise.all(raceOrders);
  const raceOk = raceResults.filter(r => r.ok).length;
  const raceFail = raceResults.filter(r => !r.ok).length;
  stats.ordersCreated += raceOk;
  console.log(`   Concurrent race: ${raceOk} succeeded, ${raceFail} failed`);

  // 10. Payment on non-existent order
  const ghostPay = await post('/payments/cash', { order_id: 99999, amount_received: 100 });
  console.log(`   Ghost payment: ${ghostPay.ok ? '⚠️ ACCEPTED (unexpected)' : '✅ Rejected'}`);

  console.log('   ✅ Edge cases complete');
}

// ─── Performance Analyzer ─────────────────────────────────

function analyzePerformance() {
  console.log('\n' + '═'.repeat(60));
  console.log('📈 PERFORMANCE ANALYSIS');
  console.log('═'.repeat(60));

  if (timings.length === 0) {
    console.log('No timing data collected.');
    return;
  }

  const sorted = [...timings].sort((a, b) => b.elapsed - a.elapsed);
  const avg = Math.round(timings.reduce((s, t) => s + t.elapsed, 0) / timings.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)]?.elapsed || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.05)]?.elapsed || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.01)]?.elapsed || 0;
  const maxT = sorted[0];

  console.log(`\nTotal requests:  ${totalRequests}`);
  console.log(`Total errors:    ${totalErrors} (${((totalErrors / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Avg response:    ${avg}ms`);
  console.log(`P50 response:    ${p50}ms`);
  console.log(`P95 response:    ${p95}ms`);
  console.log(`P99 response:    ${p99}ms`);
  console.log(`Slowest:         ${maxT?.elapsed}ms → ${maxT?.method} ${maxT?.endpoint}`);

  // Slow endpoints (>500ms)
  const slow = timings.filter(t => t.elapsed > 500);
  if (slow.length > 0) {
    console.log(`\n🐢 Slow requests (>500ms): ${slow.length}`);
    const grouped = {};
    for (const t of slow) {
      const key = `${t.method} ${t.endpoint}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t.elapsed);
    }
    for (const [key, times] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
      const avgSlow = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
      console.log(`   ${times.length}x ${key} (avg ${avgSlow}ms)`);
    }
  }

  // Error breakdown
  if (errors.length > 0) {
    console.log(`\n❌ Error breakdown:`);
    const errGrouped = {};
    for (const e of errors) {
      const key = `${e.method} ${e.endpoint} → ${e.status || 'NETWORK'}`;
      if (!errGrouped[key]) errGrouped[key] = 0;
      errGrouped[key]++;
    }
    for (const [key, count] of Object.entries(errGrouped).sort((a, b) => b - a)) {
      console.log(`   ${count}x ${key}`);
    }
  }
}

// ─── Main Simulation ──────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     JUANBERTOS POS — OPENING DAY STRESS TEST         ║');
  console.log('║     Simulating a full busy day                       ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Server: ${API.padEnd(45)}║`);
  console.log('╚════════════════════════════════════════════════════════╝');

  // Check server is alive
  const health = await get('/menu/categories');
  if (!health.ok) {
    console.error('\n❌ Cannot reach server! Make sure it\'s running:');
    console.error('   npm run dev:server');
    process.exit(1);
  }
  console.log('✅ Server is alive\n');

  // Load menu data from API and login
  await loadMenuData();
  await loginAll();

  const simStart = Date.now();

  // ── Phase 1: Morning Rush (concurrent everything) ──────
  console.log('\n' + '─'.repeat(60));
  console.log('☀️  PHASE 1: MORNING RUSH — All systems go');
  console.log('─'.repeat(60));

  await Promise.all([
    cashierAgent('Maria', EMPLOYEES.maria, 25),
    cashierAgent('Carlos', EMPLOYEES.carlos, 25),
    kitchenAgent(30000), // 30 seconds
    deliveryAgent('Uber Eats', 'uber-eats', 8),
    deliveryAgent('Rappi', 'rappi', 6),
    deliveryAgent('DiDi Food', 'didi', 5),
    managerAgent(25000), // 25 seconds
  ]);

  // ── Phase 2: Lunch Peak (more pressure) ────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('🌮 PHASE 2: LUNCH PEAK — Maximum pressure');
  console.log('─'.repeat(60));

  await Promise.all([
    cashierAgent('Maria', EMPLOYEES.maria, 30),
    cashierAgent('Carlos', EMPLOYEES.carlos, 30),
    kitchenAgent(35000),
    deliveryAgent('Uber Eats', 'uber-eats', 12),
    deliveryAgent('Rappi', 'rappi', 10),
    deliveryAgent('DiDi Food', 'didi', 8),
    managerAgent(30000),
  ]);

  // ── Phase 3: Edge Cases ────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('🧪 PHASE 3: EDGE CASES & CHAOS');
  console.log('─'.repeat(60));

  await edgeCaseAgent();

  // ── Phase 4: End-of-Day Reports ────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('📋 PHASE 4: END-OF-DAY CLOSEOUT');
  console.log('─'.repeat(60));

  // Pull every single report
  const finalReports = await Promise.all([
    get('/reports/sales?period=daily'),
    get('/reports/top-items?period=daily&limit=20'),
    get('/reports/employee-performance?period=daily'),
    get('/reports/hourly'),
    get('/reports/cash-card-breakdown?period=daily'),
    get('/reports/cogs?period=daily'),
    get('/reports/category-margins?period=daily'),
    get('/reports/contribution-margin?period=daily'),
    get('/reports/live'),
    get('/reports/delivery-margins?period=daily'),
    get('/reports/channel-comparison?period=daily'),
    get('/inventory'),
    get('/inventory/low-stock'),
    get('/orders?status=completed'),
    get('/orders?status=cancelled'),
    get('/delivery/orders'),
    get('/ai/insights'),
    get('/ai/analytics?period=daily'),
    get('/ai/config/export'),
  ]);

  const salesReport = finalReports[0];
  const topItems = finalReports[1];
  const empPerf = finalReports[2];
  const lowStock = finalReports[12];
  const completedOrders = finalReports[13];
  const cancelledOrders = finalReports[14];
  const deliveryOrdersList = finalReports[15];

  const simDuration = ((Date.now() - simStart) / 1000).toFixed(1);

  // ── Final Report ───────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🏁 OPENING DAY RESULTS');
  console.log('═'.repeat(60));

  console.log(`\nSimulation duration: ${simDuration}s`);
  console.log(`\n📊 Order Stats:`);
  console.log(`   Orders created:      ${stats.ordersCreated}`);
  console.log(`   Orders completed:    ${stats.ordersCompleted}`);
  console.log(`   Orders cancelled:    ${stats.ordersCancelled}`);
  console.log(`   Delivery orders:     ${stats.deliveryOrders}`);
  console.log(`   Kitchen transitions: ${stats.kitchenTransitions}`);

  console.log(`\n💳 Payment Stats:`);
  console.log(`   Cash payments:       ${stats.cashPayments}`);
  console.log(`   Split payments:      ${stats.splitPayments}`);
  console.log(`   Orders w/ modifiers: ${stats.modifierOrders}`);

  console.log(`\n🤖 AI Stats:`);
  console.log(`   Suggestions requested: ${stats.aiSuggestionsRequested}`);

  console.log(`\n📈 Reports checked:     ${stats.reportsChecked}`);
  console.log(`📦 Inventory checks:    ${stats.inventoryChecks}`);

  if (salesReport.ok && salesReport.data) {
    const s = salesReport.data;
    console.log(`\n💰 Sales Summary:`);
    console.log(`   Total revenue:  $${s.total_revenue || s.totalRevenue || 'N/A'} MXN`);
    console.log(`   Total orders:   ${s.total_orders || s.totalOrders || 'N/A'}`);
    console.log(`   Avg ticket:     $${s.average_ticket || s.avgTicket || 'N/A'} MXN`);
  }

  if (topItems.ok && topItems.data?.length > 0) {
    console.log(`\n🏆 Top 5 Items:`);
    for (const item of topItems.data.slice(0, 5)) {
      console.log(`   ${item.name}: ${item.quantity_sold || item.total_quantity} sold — $${item.revenue || item.total_revenue} MXN`);
    }
  }

  if (empPerf.ok && empPerf.data?.length > 0) {
    console.log(`\n👥 Employee Performance:`);
    for (const emp of empPerf.data) {
      console.log(`   ${emp.name}: ${emp.total_orders || emp.order_count} orders — $${emp.total_sales || emp.total_revenue} MXN`);
    }
  }

  if (lowStock.ok && lowStock.data?.length > 0) {
    console.log(`\n⚠️  Low Stock Items:`);
    for (const item of lowStock.data) {
      console.log(`   ${item.name}: ${item.quantity} ${item.unit} (threshold: ${item.low_stock_threshold})`);
    }
  }

  // Performance analysis
  analyzePerformance();

  // ── Issues Found ───────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🔍 ISSUES & RECOMMENDATIONS');
  console.log('═'.repeat(60));

  const issues = [];

  if (totalErrors > 0) {
    const errorRate = ((totalErrors / totalRequests) * 100).toFixed(1);
    issues.push(`Error rate: ${errorRate}% (${totalErrors}/${totalRequests} requests failed)`);
  }

  const slowRequests = timings.filter(t => t.elapsed > 1000);
  if (slowRequests.length > 0) {
    issues.push(`${slowRequests.length} requests took >1s — potential bottleneck`);
  }

  const avgTime = timings.reduce((s, t) => s + t.elapsed, 0) / timings.length;
  if (avgTime > 200) {
    issues.push(`Average response time ${Math.round(avgTime)}ms is high — consider caching`);
  }

  // Check specific error patterns
  const orderErrors = errors.filter(e => e.endpoint?.includes('/orders'));
  if (orderErrors.length > 5) {
    issues.push(`${orderErrors.length} order-related errors — check order creation logic`);
  }

  const paymentErrors = errors.filter(e => e.endpoint?.includes('/payments'));
  if (paymentErrors.length > 0) {
    issues.push(`${paymentErrors.length} payment errors — check payment flow`);
  }

  if (issues.length === 0) {
    console.log('\n✅ No critical issues found! System held up well.');
  } else {
    for (const issue of issues) {
      console.log(`\n⚠️  ${issue}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('Done! 🎉');
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('💥 Simulation crashed:', err);
  process.exit(1);
});
