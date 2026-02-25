/**
 * DESKTOP KITCHEN POS — RUSH HOUR STRESS TEST
 *
 * Simulates a full rush hour with all channels firing:
 *
 *   Phase 0 — Pre-Rush Inventory Stocking
 *     Doubles all inventory to prepare for the rush.
 *     Takes a "before" snapshot so you can compare waste after.
 *
 *   Phase 1 — Warm-Up (5 min simulated)
 *     2 cashiers, light delivery trickle, kitchen starts
 *
 *   Phase 2 — Peak Rush (full blast)
 *     3 cashiers, 3 delivery platforms at max rate, kitchen line maxed,
 *     AI suggestions on every POS order, manager watching dashboards
 *
 *   Phase 3 — Cool-Down & Closeout
 *     Kitchen drains the queue, manager pulls final reports
 *
 *   Phase 4 — Rush Hour Report Card
 *     Full breakdown: revenue, orders, inventory consumption, waste
 *     potential, channel split, latency, errors, and recommendations.
 *
 * Usage:
 *   node test/rush-hour.mjs
 *   node test/rush-hour.mjs --base-url http://localhost:3001
 *   node test/rush-hour.mjs --intensity high    # 2x orders
 *   node test/rush-hour.mjs --intensity insane  # 4x orders
 */

// ─── Configuration ────────────────────────────────────────────

const BASE = process.argv.includes('--base-url')
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3001';

const INTENSITY = process.argv.includes('--intensity')
  ? process.argv[process.argv.indexOf('--intensity') + 1]
  : 'normal';

const MULTIPLIER = { normal: 1, high: 2, insane: 4 }[INTENSITY] || 1;

const CONFIG = {
  warmup: {
    cashierOrders: Math.round(8 * MULTIPLIER),
    deliveryOrders: Math.round(3 * MULTIPLIER),
    durationMs: 20000,
  },
  peak: {
    cashierOrders: Math.round(20 * MULTIPLIER),
    deliveryOrdersPerPlatform: Math.round(8 * MULTIPLIER),
    durationMs: 40000,
  },
  cooldown: {
    durationMs: 15000,
  },
};

const API = `${BASE}/api`;

// ─── Tracking ─────────────────────────────────────────────────

let totalRequests = 0;
let totalErrors = 0;
const errors = [];
const timings = [];

const stats = {
  // Orders
  posOrdersCreated: 0,
  posOrdersFailed: 0,
  deliveryOrdersCreated: 0,
  deliveryOrdersFailed: 0,
  ordersCompleted: 0,
  ordersCancelled: 0,
  // Payments
  cashPayments: 0,
  splitPayments: 0,
  tipsCollected: 0,
  // Kitchen
  kitchenTransitions: 0,
  kitchenQueuePeak: 0,
  // AI
  aiSuggestionsRequested: 0,
  aiSuggestionsAccepted: 0,
  // Inventory
  lowStockAlerts: [],
  restockEvents: 0,
  // Revenue
  posRevenue: 0,
  deliveryRevenue: 0,
  // Reports
  reportsChecked: 0,
  // By employee
  byEmployee: {},
  // By channel
  byChannel: { pos: 0, uber_eats: 0, rappi: 0, didi_food: 0 },
};

// ─── Helpers ──────────────────────────────────────────────────

// Default auth token (set after manager login — has all permissions)
let AUTH_TOKEN = '';

async function api(method, endpoint, body, token) {
  const url = `${API}${endpoint}`;
  const authToken = token || AUTH_TOKEN;
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    },
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
    const elapsed = Date.now() - start;
    timings.push({ endpoint, method, elapsed, status: 0 });
    totalErrors++;
    errors.push({ endpoint, method, error: err.message });
    return { ok: false, error: err.message };
  }
}

const get = (e, token) => api('GET', e, null, token);
const post = (e, b, token) => api('POST', e, b, token);
const put = (e, b, token) => api('PUT', e, b, token);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function ts() { return new Date().toLocaleTimeString('en-US', { hour12: false }); }

// ─── Menu Data (populated from API) ──────────────────────────

const MENU = {
  categories: {},  // name → id
  byCategory: {},  // categoryName → [itemId, ...]
  allItems: [],
  itemPrices: {},  // itemId → price
  itemNames: {},   // itemId → name
};

const MODS = {
  salsas: [],
  extras: [],
  tortillas: [],
  all: [],
};

const EMPLOYEES = {};  // name → { id, token }

let INVENTORY_BEFORE = [];

async function loadData() {
  console.log('\n  Loading menu data from API...');

  const [catRes, itemRes, modRes] = await Promise.all([
    get('/menu/categories'),
    get('/menu/items'),
    get('/modifiers/groups'),
  ]);

  if (!catRes.ok || !itemRes.ok) {
    console.error('  FAILED to load menu data. Is the server running and seeded?');
    process.exit(1);
  }

  for (const cat of catRes.data) {
    MENU.categories[cat.name] = cat.id;
    MENU.byCategory[cat.name] = [];
  }

  for (const item of itemRes.data) {
    if (!item.active) continue;
    MENU.allItems.push(item.id);
    MENU.itemPrices[item.id] = item.price;
    MENU.itemNames[item.id] = item.name;

    // Map to category
    for (const [catName, catId] of Object.entries(MENU.categories)) {
      if (item.category_id === catId) {
        MENU.byCategory[catName].push(item.id);
        break;
      }
    }
  }

  if (modRes.ok && modRes.data) {
    for (const group of modRes.data) {
      const ids = (group.modifiers || []).map(m => m.id);
      const name = group.name.toLowerCase();
      if (name === 'salsa') MODS.salsas = ids;
      else if (name === 'extras') MODS.extras = ids;
      else if (name === 'tortilla') MODS.tortillas = ids;
      MODS.all.push(...ids);
    }
  }

  const catSummary = Object.entries(MENU.byCategory)
    .filter(([, ids]) => ids.length > 0)
    .map(([name, ids]) => `${name}(${ids.length})`)
    .join(', ');
  console.log(`  Menu: ${MENU.allItems.length} items across ${catSummary}`);
  console.log(`  Modifiers: ${MODS.all.length} total`);
}

async function loginAll() {
  console.log('  Logging in employees...');

  // Login uses no auth header (public endpoint)
  const [maria, carlos, manager] = await Promise.all([
    api('POST', '/employees/login', { pin: '5678' }, ''),
    api('POST', '/employees/login', { pin: '9012' }, ''),
    api('POST', '/employees/login', { pin: '1234' }, ''),
  ]);

  if (!maria.ok || !carlos.ok || !manager.ok) {
    console.error('  FAILED to login. Run: npm run seed && npm run dev:server');
    if (!maria.ok) console.error('    Maria:', maria.error);
    if (!carlos.ok) console.error('    Carlos:', carlos.error);
    if (!manager.ok) console.error('    Manager:', manager.error);
    process.exit(1);
  }

  EMPLOYEES.Maria = { id: maria.data.id, name: 'Maria', token: maria.data.token };
  EMPLOYEES.Carlos = { id: carlos.data.id, name: 'Carlos', token: carlos.data.token };
  EMPLOYEES.Manager = { id: manager.data.id, name: 'Manager', token: manager.data.token };

  // Set the default auth token to manager's (has all permissions)
  AUTH_TOKEN = manager.data.token;

  for (const [name, emp] of Object.entries(EMPLOYEES)) {
    stats.byEmployee[name] = { orders: 0, revenue: 0 };
    console.log(`    ${name} (ID #${emp.id}) - token OK`);
  }
}

// ─── Phase 0: Pre-Rush Inventory Stocking ─────────────────────

async function stockInventory() {
  console.log('\n  Checking current inventory levels...');

  const invRes = await get('/inventory');
  if (!invRes.ok) {
    console.error('  FAILED to load inventory.');
    return;
  }

  INVENTORY_BEFORE = invRes.data.map(i => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    threshold: i.low_stock_threshold,
    category: i.category,
  }));

  console.log(`  Found ${INVENTORY_BEFORE.length} inventory items. Stocking up for rush...\n`);

  // Double inventory for every item
  let restocked = 0;
  for (const item of INVENTORY_BEFORE) {
    const addAmount = Math.max(item.quantity, item.threshold * 5);
    const res = await post(`/inventory/${item.id}/restock`, { quantity: addAmount });
    if (res.ok) {
      restocked++;
      stats.restockEvents++;
    }
  }

  console.log(`  Restocked ${restocked}/${INVENTORY_BEFORE.length} items`);

  // Take fresh snapshot after restocking
  const freshInv = await get('/inventory');
  if (freshInv.ok) {
    INVENTORY_BEFORE = freshInv.data.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      threshold: i.low_stock_threshold,
      category: i.category,
    }));

    const totalStock = INVENTORY_BEFORE.reduce((s, i) => s + i.quantity, 0);
    console.log(`  Total stock after restocking: ${totalStock.toLocaleString()} units`);

    console.log('\n  Inventory snapshot (before rush):');
    for (const item of INVENTORY_BEFORE) {
      const bar = '#'.repeat(Math.min(Math.round(item.quantity / 5), 40));
      console.log(`    ${item.name.padEnd(25)} ${String(item.quantity).padStart(5)} ${item.unit.padEnd(8)} ${bar}`);
    }
  }
}

// ─── Agent: POS Cashier ───────────────────────────────────────

function buildRealisticOrder(employeeId) {
  // Dynamically build orders based on whatever categories exist
  const catNames = Object.keys(MENU.byCategory).filter(c => MENU.byCategory[c].length > 0);

  // Identify main, side, and drink categories by common naming patterns
  const drinkCats = catNames.filter(c => /drink|bebida|beverage/i.test(c));
  const sideCats = catNames.filter(c => /side|acompan/i.test(c));
  const dessertCats = catNames.filter(c => /dessert|postre/i.test(c));
  const mainCats = catNames.filter(c => !drinkCats.includes(c) && !sideCats.includes(c) && !dessertCats.includes(c));

  const getDrinkId = () => {
    for (const cat of drinkCats) {
      if (MENU.byCategory[cat]?.length) return pick(MENU.byCategory[cat]);
    }
    return null;
  };

  const getSideId = () => {
    for (const cat of sideCats) {
      if (MENU.byCategory[cat]?.length) return pick(MENU.byCategory[cat]);
    }
    return null;
  };

  const roll = Math.random();
  const items = [];

  if (roll < 0.40 && mainCats.length > 0) {
    // 40% — Main item(s) + optional side + drink
    const cat = pick(mainCats);
    const numMains = rand(1, 3);
    for (let i = 0; i < numMains; i++) {
      const item = { menu_item_id: pick(MENU.byCategory[cat]), quantity: rand(1, 2) };
      // 50% chance of adding modifiers
      if (Math.random() > 0.5 && MODS.all.length > 0) {
        const numMods = rand(1, Math.min(3, MODS.all.length));
        item.modifiers = [];
        for (let m = 0; m < numMods; m++) {
          const mod = pick(MODS.all);
          if (!item.modifiers.includes(mod)) item.modifiers.push(mod);
        }
      }
      items.push(item);
    }
    // 60% add a side
    if (Math.random() > 0.4) {
      const sideId = getSideId();
      if (sideId) items.push({ menu_item_id: sideId, quantity: 1 });
    }
    // 70% add a drink
    if (Math.random() > 0.3) {
      const drinkId = getDrinkId();
      if (drinkId) items.push({ menu_item_id: drinkId, quantity: rand(1, 2) });
    }
  } else if (roll < 0.65 && mainCats.length > 1) {
    // 25% — Mixed mains from different categories + drink
    const numMains = rand(2, 4);
    for (let i = 0; i < numMains; i++) {
      const cat = pick(mainCats);
      const item = { menu_item_id: pick(MENU.byCategory[cat]), quantity: 1 };
      if (Math.random() > 0.6 && MODS.all.length > 0) {
        item.modifiers = [pick(MODS.all)];
      }
      items.push(item);
    }
    const drinkId = getDrinkId();
    if (drinkId) items.push({ menu_item_id: drinkId, quantity: 1 });
  } else if (roll < 0.85) {
    // 20% — Combo-style order: 1 main + 1 side + 1 drink
    if (mainCats.length > 0) {
      const cat = pick(mainCats);
      items.push({ menu_item_id: pick(MENU.byCategory[cat]), quantity: 1 });
    }
    const sideId = getSideId();
    if (sideId) items.push({ menu_item_id: sideId, quantity: 1 });
    const drinkId = getDrinkId();
    if (drinkId) items.push({ menu_item_id: drinkId, quantity: 1 });
  } else {
    // 15% — Big family order (mixed everything)
    const numItems = rand(4, 8);
    for (let i = 0; i < numItems; i++) {
      const itemId = pick(MENU.allItems);
      items.push({ menu_item_id: itemId, quantity: rand(1, 3) });
    }
  }

  // Random notes on ~20% of items
  for (const item of items) {
    if (Math.random() > 0.8) {
      item.notes = pick([
        'No onions', 'Extra spicy', 'No cilantro',
        'Well done', 'No cheese', 'Extra sauce on side',
        'To go', 'No spice', 'Extra napkins please',
      ]);
    }
  }

  // Safety: ensure at least 1 item
  if (items.length === 0) {
    items.push({ menu_item_id: pick(MENU.allItems), quantity: 1 });
  }

  return { employee_id: employeeId, items };
}

async function cashierAgent(empName, orderCount, phaseLabel) {
  const emp = EMPLOYEES[empName];
  if (!emp) return;
  const token = emp.token;

  for (let i = 0; i < orderCount; i++) {
    const order = buildRealisticOrder(emp.id);

    // AI suggestion before placing order (50% of the time)
    if (Math.random() > 0.5) {
      const cartItemIds = order.items.map(it => it.menu_item_id);
      const hour = rand(12, 21);
      const sugResp = await get(`/ai/suggestions/cart?items=${cartItemIds.join(',')}&hour=${hour}`, token);
      stats.aiSuggestionsRequested++;

      if (sugResp.ok && sugResp.data?.length > 0 && Math.random() > 0.6) {
        const sug = sugResp.data[0];
        if (sug.suggested_item_id) {
          order.items.push({ menu_item_id: sug.suggested_item_id, quantity: 1 });
          stats.aiSuggestionsAccepted++;
          await post('/ai/suggestions/feedback', {
            suggestion_id: sug.id || `heuristic_${Date.now()}`,
            action: 'accepted',
          }, token);
        }
      }
    }

    // Create order
    const res = await post('/orders', order, token);
    if (res.ok) {
      stats.posOrdersCreated++;
      stats.byChannel.pos++;
      stats.byEmployee[empName].orders++;
      const orderId = res.data.id;
      const total = res.data.total || 0;
      stats.posRevenue += total;
      stats.byEmployee[empName].revenue += total;

      // Simulate customer payment delay
      await sleep(rand(100, 500));

      // Payment distribution: 70% cash, 15% split, 10% card-only, 5% cancel
      const payRoll = Math.random();
      if (payRoll < 0.05) {
        // Cancel
        await put(`/orders/${orderId}/status`, { status: 'cancelled' }, token);
        stats.ordersCancelled++;
        stats.posRevenue -= total;
        stats.byEmployee[empName].revenue -= total;
      } else if (payRoll < 0.20) {
        // Split payment
        const half = Math.round(total / 2 * 100) / 100;
        const tip = Math.random() > 0.5 ? rand(10, 60) : 0;
        stats.tipsCollected += tip;
        await post('/payments/split', {
          order_id: orderId,
          split_type: 'by_amount',
          splits: [
            { payment_method: 'cash', amount: half, tip: Math.round(tip / 2) },
            { payment_method: 'card', amount: total - half, tip: tip - Math.round(tip / 2) },
          ],
        }, token);
        stats.splitPayments++;
      } else {
        // Cash
        const tip = Math.random() > 0.4 ? rand(10, 80) : 0;
        stats.tipsCollected += tip;
        await post('/payments/cash', {
          order_id: orderId,
          tip,
          amount_received: total + tip + rand(0, 100),
        }, token);
        stats.cashPayments++;
      }

      // Deduct inventory (use manager token for inventory permissions)
      await post('/inventory/deduct', { order_id: orderId }, AUTH_TOKEN);
    } else {
      stats.posOrdersFailed++;
    }

    // Brief pause between customers (faster during peak)
    await sleep(rand(50, 300));
  }
}

// ─── Agent: Delivery Platform ──────────────────────────────────

async function deliveryAgent(platformName, webhookPath, orderCount) {
  for (let i = 0; i < orderCount; i++) {
    const numItems = rand(1, 5);
    const items = [];

    for (let j = 0; j < numItems; j++) {
      const itemId = pick(MENU.allItems);
      items.push({
        name: MENU.itemNames[itemId] || 'Unknown Item',
        quantity: rand(1, 3),
        unit_price: MENU.itemPrices[itemId] || rand(35, 180),
        notes: Math.random() > 0.8 ? pick(['Sin cebolla', 'Extra picante', 'Sin cilantro']) : '',
      });
    }

    const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
    const webhookData = {
      external_id: `${platformName.toUpperCase()}-${Date.now()}-${i}`,
      items,
      customer_name: pick([
        'Juan Garcia', 'Ana Lopez', 'Pedro Martinez', 'Sofia Hernandez',
        'Diego Rivera', 'Lucia Torres', 'Miguel Sanchez', 'Carmen Flores',
      ]),
      customer_phone: `+5213${rand(10000000, 99999999)}`,
      delivery_address: pick([
        'Av. Reforma 123, Col. Centro',
        'Calle 5 de Mayo 456, Col. Juarez',
        'Blvd. Insurgentes 789, Col. Roma',
        'Av. Chapultepec 321, Col. Condesa',
        'Calle Durango 654, Col. Roma Norte',
        'Av. Sonora 987, Col. Hipodromo',
      ]),
      subtotal,
      delivery_fee: rand(25, 65),
      platform_fee: rand(15, 50),
    };

    const res = await post(`/delivery/webhook/${webhookPath}`, webhookData);
    if (res.ok) {
      stats.deliveryOrdersCreated++;
      const channelKey = webhookPath === 'uber-eats' ? 'uber_eats' : webhookPath === 'didi' ? 'didi_food' : webhookPath;
      stats.byChannel[channelKey] = (stats.byChannel[channelKey] || 0) + 1;
      stats.deliveryRevenue += subtotal;

      // Simulate delivery lifecycle
      if (res.data?.order_id) {
        await sleep(rand(100, 300));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'confirmed' });
        await sleep(rand(100, 200));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'preparing' });
        await sleep(rand(200, 400));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'ready_for_pickup' });
        await sleep(rand(100, 300));
        await put(`/delivery/orders/${res.data.order_id}/status`, { status: 'picked_up' });
      }
    } else {
      stats.deliveryOrdersFailed++;
    }

    await sleep(rand(200, 600));
  }
}

// ─── Agent: Kitchen Line ──────────────────────────────────────

async function kitchenAgent(durationMs) {
  const endTime = Date.now() + durationMs;
  const token = AUTH_TOKEN; // kitchen uses manager auth

  while (Date.now() < endTime) {
    const res = await get('/orders/kitchen/active', token);
    if (res.ok && res.data?.length > 0) {
      const queueSize = res.data.length;
      if (queueSize > stats.kitchenQueuePeak) stats.kitchenQueuePeak = queueSize;

      // Process up to 5 orders per cycle (realistic kitchen throughput)
      for (const order of res.data.slice(0, 5)) {
        if (order.status === 'pending') {
          const c = await put(`/orders/${order.id}/status`, { status: 'confirmed' }, token);
          if (c.ok) stats.kitchenTransitions++;
          await sleep(rand(30, 80));
          const p = await put(`/orders/${order.id}/status`, { status: 'preparing' }, token);
          if (p.ok) stats.kitchenTransitions++;
        } else if (order.status === 'confirmed') {
          const p = await put(`/orders/${order.id}/status`, { status: 'preparing' }, token);
          if (p.ok) stats.kitchenTransitions++;
        } else if (order.status === 'preparing') {
          await sleep(rand(150, 400)); // cook time
          const r = await put(`/orders/${order.id}/status`, { status: 'ready' }, token);
          if (r.ok) stats.kitchenTransitions++;
          await sleep(rand(30, 100));
          const d = await put(`/orders/${order.id}/status`, { status: 'completed' }, token);
          if (d.ok) {
            stats.kitchenTransitions++;
            stats.ordersCompleted++;
          }
        }
      }
    }
    await sleep(rand(200, 500));
  }
}

// ─── Agent: Manager Dashboard ─────────────────────────────────

async function managerAgent(durationMs) {
  const endTime = Date.now() + durationMs;

  while (Date.now() < endTime) {
    // Check all reports
    const reports = [
      '/reports/sales?period=daily',
      '/reports/top-items?period=daily&limit=10',
      '/reports/employee-performance?period=daily',
      '/reports/hourly',
      '/reports/cash-card-breakdown?period=daily',
      '/reports/cogs?period=daily',
      '/reports/live',
      '/reports/delivery-margins?period=daily',
      '/reports/channel-comparison?period=daily',
    ];

    for (const ep of reports) {
      await get(ep);
      stats.reportsChecked++;
    }

    // Check inventory and alert on low stock
    const [inv, lowStock] = await Promise.all([
      get('/inventory'),
      get('/inventory/low-stock'),
    ]);

    if (lowStock.ok && lowStock.data?.length > 0) {
      for (const item of lowStock.data) {
        const already = stats.lowStockAlerts.find(a => a.id === item.id);
        if (!already) {
          stats.lowStockAlerts.push({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            threshold: item.low_stock_threshold,
            time: ts(),
          });
          console.log(`    [${ts()}] LOW STOCK: ${item.name} — ${item.quantity} ${item.unit} left`);
        }
      }
    }

    // AI insights
    await get('/ai/insights');
    await get('/ai/suggestions/inventory-push');
    stats.reportsChecked += 2;

    // Kitchen queue status
    await get('/orders/kitchen/active');

    // Delivery status
    await get('/delivery/orders');

    await sleep(rand(2000, 4000));
  }
}

// ─── Agent: Inventory Monitor (runs in background) ────────────

async function inventoryMonitorAgent(durationMs) {
  const endTime = Date.now() + durationMs;
  const snapshots = [];

  while (Date.now() < endTime) {
    const res = await get('/inventory');
    if (res.ok) {
      const snap = {};
      for (const item of res.data) {
        snap[item.name] = item.quantity;
      }
      snapshots.push({ time: Date.now(), data: snap });
    }
    await sleep(5000); // snapshot every 5s
  }

  return snapshots;
}

// ─── Performance Analysis ─────────────────────────────────────

function analyzePerformance() {
  if (timings.length === 0) return;

  const sorted = [...timings].sort((a, b) => a.elapsed - b.elapsed);
  const avg = Math.round(timings.reduce((s, t) => s + t.elapsed, 0) / timings.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)]?.elapsed || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)]?.elapsed || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)]?.elapsed || 0;
  const maxT = sorted[sorted.length - 1];

  console.log(`\n  Response Latency:`);
  console.log(`    Avg:    ${avg}ms`);
  console.log(`    P50:    ${p50}ms`);
  console.log(`    P95:    ${p95}ms`);
  console.log(`    P99:    ${p99}ms`);
  console.log(`    Max:    ${maxT?.elapsed}ms -> ${maxT?.method} ${maxT?.endpoint}`);

  // Slow requests (>500ms)
  const slow = timings.filter(t => t.elapsed > 500);
  if (slow.length > 0) {
    console.log(`\n  Slow Requests (>500ms): ${slow.length} of ${timings.length} total`);
    const grouped = {};
    for (const t of slow) {
      const key = `${t.method} ${t.endpoint.split('?')[0]}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t.elapsed);
    }
    for (const [key, times] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 8)) {
      const avgSlow = Math.round(times.reduce((s, t) => s + t, 0) / times.length);
      console.log(`    ${times.length}x ${key} (avg ${avgSlow}ms, max ${Math.max(...times)}ms)`);
    }
  }

  // Connection pool pressure (503s)
  const pool503s = errors.filter(e => e.status === 503);
  if (pool503s.length > 0) {
    console.log(`\n  CONNECTION POOL EXHAUSTION: ${pool503s.length} requests got 503`);
    console.log(`    This means the 30-connection pool was saturated.`);
  }
}

// ─── Main Simulation ──────────────────────────────────────────

async function main() {
  console.log('');
  console.log('='.repeat(65));
  console.log('  DESKTOP KITCHEN POS - RUSH HOUR STRESS TEST');
  console.log('  ' + '='.repeat(61));
  console.log(`  Server:     ${API}`);
  console.log(`  Intensity:  ${INTENSITY} (${MULTIPLIER}x multiplier)`);
  console.log(`  Config:     Warmup ${CONFIG.warmup.cashierOrders} orders/cashier`);
  console.log(`              Peak ${CONFIG.peak.cashierOrders} orders/cashier`);
  console.log(`              Delivery ${CONFIG.peak.deliveryOrdersPerPlatform}/platform`);
  console.log('='.repeat(65));

  // Pre-flight check
  const health = await get('/menu/categories');
  if (!health.ok) {
    console.error('\n  Cannot reach server! Start it with: npm run dev:server');
    process.exit(1);
  }
  console.log('  Server is alive.\n');

  await loadData();
  await loginAll();

  const simStart = Date.now();

  // ════════════════════════════════════════════════════════════
  // PHASE 0: PRE-RUSH INVENTORY STOCKING
  // ════════════════════════════════════════════════════════════
  console.log('\n' + '-'.repeat(65));
  console.log('  PHASE 0: PRE-RUSH INVENTORY STOCKING');
  console.log('-'.repeat(65));

  await stockInventory();

  // ════════════════════════════════════════════════════════════
  // PHASE 1: WARM-UP
  // ════════════════════════════════════════════════════════════
  console.log('\n' + '-'.repeat(65));
  console.log('  PHASE 1: WARM-UP - Store just opened, first customers arriving');
  console.log('-'.repeat(65));

  const warmupStart = Date.now();

  await Promise.all([
    cashierAgent('Maria', CONFIG.warmup.cashierOrders, 'warmup'),
    cashierAgent('Carlos', CONFIG.warmup.cashierOrders, 'warmup'),
    kitchenAgent(CONFIG.warmup.durationMs),
    deliveryAgent('Uber Eats', 'uber-eats', CONFIG.warmup.deliveryOrders),
    deliveryAgent('Rappi', 'rappi', Math.round(CONFIG.warmup.deliveryOrders * 0.7)),
  ]);

  const warmupElapsed = ((Date.now() - warmupStart) / 1000).toFixed(1);
  console.log(`  Warm-up complete (${warmupElapsed}s) — ${stats.posOrdersCreated} POS + ${stats.deliveryOrdersCreated} delivery orders so far`);

  // ════════════════════════════════════════════════════════════
  // PHASE 2: PEAK RUSH - ALL SYSTEMS FULL BLAST
  // ════════════════════════════════════════════════════════════
  console.log('\n' + '-'.repeat(65));
  console.log('  PHASE 2: PEAK RUSH - Full house, all channels maxed out');
  console.log('-'.repeat(65));

  const peakStart = Date.now();
  const preRushPosOrders = stats.posOrdersCreated;
  const preRushDelivery = stats.deliveryOrdersCreated;

  // Start inventory monitor in background
  const inventoryMonitorPromise = inventoryMonitorAgent(CONFIG.peak.durationMs);

  await Promise.all([
    // 3 cashiers (manager jumps in to help)
    cashierAgent('Maria', CONFIG.peak.cashierOrders, 'peak'),
    cashierAgent('Carlos', CONFIG.peak.cashierOrders, 'peak'),
    cashierAgent('Manager', Math.round(CONFIG.peak.cashierOrders * 0.6), 'peak'),
    // Kitchen running full speed
    kitchenAgent(CONFIG.peak.durationMs),
    // All 3 delivery platforms hammering
    deliveryAgent('Uber Eats', 'uber-eats', CONFIG.peak.deliveryOrdersPerPlatform),
    deliveryAgent('Rappi', 'rappi', CONFIG.peak.deliveryOrdersPerPlatform),
    deliveryAgent('DiDi Food', 'didi', Math.round(CONFIG.peak.deliveryOrdersPerPlatform * 0.8)),
    // Manager checking dashboards between orders
    managerAgent(CONFIG.peak.durationMs),
  ]);

  const peakElapsed = ((Date.now() - peakStart) / 1000).toFixed(1);
  const peakPosOrders = stats.posOrdersCreated - preRushPosOrders;
  const peakDeliveryOrders = stats.deliveryOrdersCreated - preRushDelivery;
  console.log(`  Peak rush complete (${peakElapsed}s) — ${peakPosOrders} POS + ${peakDeliveryOrders} delivery orders this phase`);

  // ════════════════════════════════════════════════════════════
  // PHASE 3: COOL-DOWN & KITCHEN DRAIN
  // ════════════════════════════════════════════════════════════
  console.log('\n' + '-'.repeat(65));
  console.log('  PHASE 3: COOL-DOWN - Kitchen clearing remaining orders');
  console.log('-'.repeat(65));

  await kitchenAgent(CONFIG.cooldown.durationMs);

  // Wait for inventory monitor
  const inventorySnapshots = await inventoryMonitorPromise;

  // ════════════════════════════════════════════════════════════
  // PHASE 4: RUSH HOUR REPORT CARD
  // ════════════════════════════════════════════════════════════
  const simDuration = ((Date.now() - simStart) / 1000).toFixed(1);

  // Pull final reports for the summary
  const [
    salesReport, topItems, empPerf, inventoryFinal, lowStockFinal,
    cashCardBreak, cogsReport, channelComparison, deliveryMargins,
    aiInsights, aiAnalytics,
  ] = await Promise.all([
    get('/reports/sales?period=daily'),
    get('/reports/top-items?period=daily&limit=20'),
    get('/reports/employee-performance?period=daily'),
    get('/inventory'),
    get('/inventory/low-stock'),
    get('/reports/cash-card-breakdown?period=daily'),
    get('/reports/cogs?period=daily'),
    get('/reports/channel-comparison?period=daily'),
    get('/reports/delivery-margins?period=daily'),
    get('/ai/insights'),
    get('/ai/analytics?period=daily'),
  ]);

  // ─── PRINT REPORT CARD ─────────────────────────────────────

  console.log('\n');
  console.log('='.repeat(65));
  console.log('  RUSH HOUR REPORT CARD');
  console.log('='.repeat(65));

  console.log(`\n  Duration: ${simDuration}s | Intensity: ${INTENSITY} (${MULTIPLIER}x)`);
  console.log(`  Total API requests: ${totalRequests}`);
  console.log(`  Throughput: ${(totalRequests / parseFloat(simDuration)).toFixed(1)} req/s`);

  // ─── Orders ─────────────────────────────────────────────────
  console.log('\n  --- ORDERS ---');
  const totalOrders = stats.posOrdersCreated + stats.deliveryOrdersCreated;
  console.log(`  Total orders:        ${totalOrders}`);
  console.log(`    POS (in-store):    ${stats.posOrdersCreated}`);
  console.log(`    Delivery:          ${stats.deliveryOrdersCreated}`);
  console.log(`    Completed:         ${stats.ordersCompleted}`);
  console.log(`    Cancelled:         ${stats.ordersCancelled}`);
  console.log(`    Failed to create:  ${stats.posOrdersFailed + stats.deliveryOrdersFailed}`);
  console.log(`  Kitchen transitions: ${stats.kitchenTransitions}`);
  console.log(`  Kitchen queue peak:  ${stats.kitchenQueuePeak} orders`);

  // ─── Revenue ────────────────────────────────────────────────
  console.log('\n  --- REVENUE ---');
  const totalRevenue = stats.posRevenue + stats.deliveryRevenue;
  console.log(`  Total revenue:       $${totalRevenue.toFixed(2)} MXN`);
  console.log(`    POS:               $${stats.posRevenue.toFixed(2)} MXN (${((stats.posRevenue / totalRevenue) * 100).toFixed(0)}%)`);
  console.log(`    Delivery:          $${stats.deliveryRevenue.toFixed(2)} MXN (${((stats.deliveryRevenue / totalRevenue) * 100).toFixed(0)}%)`);
  console.log(`  Tips collected:      $${stats.tipsCollected.toFixed(2)} MXN`);
  console.log(`  Avg ticket (POS):    $${stats.posOrdersCreated > 0 ? (stats.posRevenue / stats.posOrdersCreated).toFixed(2) : '0'} MXN`);

  if (salesReport.ok && salesReport.data) {
    const s = salesReport.data;
    console.log(`\n  Server-side sales report:`);
    console.log(`    Revenue:  $${Number(s.total_revenue || 0).toFixed(2)} MXN`);
    console.log(`    Orders:   ${s.order_count || 0}`);
    console.log(`    Avg:      $${Number(s.avg_ticket || 0).toFixed(2)} MXN`);
    console.log(`    Tips:     $${Number(s.tip_total || 0).toFixed(2)} MXN`);
    console.log(`    Tax:      $${Number(s.tax_total || 0).toFixed(2)} MXN`);
  }

  // ─── Payments ───────────────────────────────────────────────
  console.log('\n  --- PAYMENTS ---');
  console.log(`  Cash payments:       ${stats.cashPayments}`);
  console.log(`  Split payments:      ${stats.splitPayments}`);

  if (cashCardBreak.ok && cashCardBreak.data) {
    const c = cashCardBreak.data;
    console.log(`  Total (server):      ${Number(c.total_orders || 0)} orders | $${Number(c.total_revenue || 0).toFixed(2)} MXN`);
    if (c.breakdown?.length > 0) {
      for (const m of c.breakdown) {
        console.log(`    ${(m.payment_method || '?').padEnd(10)} ${String(Number(m.count || 0)).padStart(4)} orders | $${Number(m.total || 0).toFixed(2)} MXN | tips $${Number(m.tips || 0).toFixed(2)} | ${Number(m.percentage || 0).toFixed(1)}%`);
      }
    }
  }

  // ─── Channel Split ─────────────────────────────────────────
  console.log('\n  --- CHANNEL SPLIT ---');
  for (const [channel, count] of Object.entries(stats.byChannel)) {
    if (count > 0) {
      const pct = ((count / totalOrders) * 100).toFixed(1);
      const bar = '#'.repeat(Math.round(count / 2));
      console.log(`    ${channel.padEnd(12)} ${String(count).padStart(4)} orders (${pct}%) ${bar}`);
    }
  }

  // ─── Employee Performance ───────────────────────────────────
  console.log('\n  --- EMPLOYEE PERFORMANCE ---');
  for (const [name, data] of Object.entries(stats.byEmployee)) {
    console.log(`    ${name.padEnd(10)} ${String(data.orders).padStart(4)} orders | $${data.revenue.toFixed(2)} MXN`);
  }

  if (empPerf.ok && empPerf.data?.length > 0) {
    console.log('\n  Server-side employee report:');
    for (const emp of empPerf.data) {
      console.log(`    ${(emp.employee_name || 'Unknown').padEnd(12)} ${String(emp.orders_processed || 0).padStart(4)} orders | $${Number(emp.total_sales || 0).toFixed(2)} MXN | avg $${Number(emp.avg_ticket || 0).toFixed(2)} | tips $${Number(emp.tips_received || 0).toFixed(2)}`);
    }
  }

  // ─── AI Intelligence ────────────────────────────────────────
  console.log('\n  --- AI INTELLIGENCE ---');
  console.log(`  Suggestions requested: ${stats.aiSuggestionsRequested}`);
  console.log(`  Suggestions accepted:  ${stats.aiSuggestionsAccepted}`);
  const acceptRate = stats.aiSuggestionsRequested > 0
    ? ((stats.aiSuggestionsAccepted / stats.aiSuggestionsRequested) * 100).toFixed(1)
    : '0';
  console.log(`  Accept rate:           ${acceptRate}%`);

  if (aiInsights.ok && aiInsights.data) {
    const ins = aiInsights.data;
    console.log('\n  AI Insights (server):');
    if (ins.inventory) {
      console.log(`    Inventory push items:   ${ins.inventory.pushItems || 0}`);
      console.log(`    Items to avoid:         ${ins.inventory.avoidItems || 0}`);
      console.log(`    Low ingredients:        ${ins.inventory.lowIngredients || 0}`);
    }
    if (ins.suggestions) {
      console.log(`    Suggestion events:      ${ins.suggestions.totalEvents || 0}`);
      console.log(`    Accepted:               ${ins.suggestions.accepted || 0}`);
      console.log(`    Server accept rate:     ${Number(ins.suggestions.acceptanceRate || 0).toFixed(1)}%`);
    }
    if (ins.topItemPairs?.length > 0) {
      console.log('    Top item pairs (frequently ordered together):');
      for (const pair of ins.topItemPairs.slice(0, 5)) {
        console.log(`      ${pair.item_a_name || '?'} + ${pair.item_b_name || '?'} (${pair.pair_count} times)`);
      }
    }
    if (ins.recentSnapshots?.length > 0) {
      console.log('    Recent hourly snapshots:');
      for (const snap of ins.recentSnapshots.slice(0, 5)) {
        console.log(`      ${snap.snapshot_hour}: ${snap.order_count} orders | $${Number(snap.revenue || 0).toFixed(2)} MXN | avg $${Number(snap.avg_ticket || 0).toFixed(2)}`);
      }
    }
  }

  if (aiAnalytics.ok && aiAnalytics.data) {
    const ana = aiAnalytics.data;
    console.log('\n  AI Analytics (server):');
    if (ana.byType?.length > 0) {
      console.log('    Suggestions by type:');
      for (const t of ana.byType) {
        console.log(`      ${(t.suggestion_type || '?').padEnd(20)} ${t.action}: ${t.count}`);
      }
    }
    if (ana.aiRevenue) {
      console.log(`    AI-driven revenue:  ${ana.aiRevenue.itemsSold || 0} items sold | $${Number(ana.aiRevenue.revenue || 0).toFixed(2)} MXN`);
    }
  }

  // ─── Top Items ──────────────────────────────────────────────
  if (topItems.ok && topItems.data?.length > 0) {
    console.log('\n  --- TOP SELLING ITEMS ---');
    for (const item of topItems.data.slice(0, 10)) {
      const name = (item.item_name || 'Unknown').padEnd(28);
      const qty = String(item.quantity_sold || 0).padStart(4);
      const rev = Number(item.revenue || 0).toFixed(2);
      console.log(`    ${name} ${qty} sold | $${rev} MXN`);
    }
  }

  // ─── Inventory Consumption ──────────────────────────────────
  console.log('\n  --- INVENTORY CONSUMPTION ---');

  if (inventoryFinal.ok) {
    const afterMap = {};
    for (const item of inventoryFinal.data) {
      afterMap[item.name] = { quantity: item.quantity, unit: item.unit };
    }

    let totalConsumed = 0;
    let totalCostConsumed = 0;
    const consumption = [];

    for (const before of INVENTORY_BEFORE) {
      const after = afterMap[before.name];
      if (after) {
        const consumed = before.quantity - after.quantity;
        if (consumed > 0) {
          consumption.push({
            name: before.name,
            before: before.quantity,
            after: after.quantity,
            consumed,
            unit: before.unit,
            pctUsed: ((consumed / before.quantity) * 100).toFixed(1),
          });
          totalConsumed += consumed;
        }
      }
    }

    // Sort by most consumed
    consumption.sort((a, b) => parseFloat(b.pctUsed) - parseFloat(a.pctUsed));

    for (const c of consumption) {
      const bar = '#'.repeat(Math.min(Math.round(parseFloat(c.pctUsed) / 2.5), 40));
      const bef = Number(c.before).toFixed(1);
      const aft = Number(c.after).toFixed(1);
      const cons = Number(c.consumed).toFixed(1);
      console.log(`    ${c.name.padEnd(25)} ${bef.padStart(8)} -> ${aft.padStart(8)} ${c.unit.padEnd(8)} -${cons} (${c.pctUsed}%) ${bar}`);
    }

    // Waste potential analysis
    console.log('\n  --- WASTE RISK ANALYSIS ---');
    console.log('  Items that barely moved (potential over-stock/waste):');
    const lowMovers = [];
    for (const before of INVENTORY_BEFORE) {
      const after = afterMap[before.name];
      if (after) {
        const consumed = before.quantity - after.quantity;
        const pctUsed = before.quantity > 0 ? (consumed / before.quantity) * 100 : 0;
        if (pctUsed < 5 && before.quantity > 0) {
          lowMovers.push({ name: before.name, pctUsed: pctUsed.toFixed(1), stock: after.quantity, unit: before.unit });
        }
      }
    }

    if (lowMovers.length > 0) {
      for (const item of lowMovers) {
        console.log(`    ${item.name.padEnd(25)} Only ${item.pctUsed}% consumed — ${item.stock} ${item.unit} still in stock`);
      }
    } else {
      console.log('    All inventory items had meaningful consumption.');
    }

    // Low stock alerts during rush
    if (stats.lowStockAlerts.length > 0) {
      console.log('\n  Low-stock alerts triggered during rush:');
      for (const alert of stats.lowStockAlerts) {
        console.log(`    [${alert.time}] ${alert.name}: ${alert.quantity} ${alert.unit} (threshold: ${alert.threshold})`);
      }
    }

    // Items that hit zero
    const zeroItems = consumption.filter(c => c.after === 0);
    if (zeroItems.length > 0) {
      console.log('\n  STOCKOUT - Items that ran out completely:');
      for (const item of zeroItems) {
        console.log(`    ${item.name} - was ${item.before} ${item.unit}, now ZERO`);
      }
    }
  }

  // ─── COGS ───────────────────────────────────────────────────
  if (cogsReport.ok && cogsReport.data) {
    console.log('\n  --- COST OF GOODS SOLD ---');
    const c = cogsReport.data;

    if (c.items?.length > 0) {
      console.log(`    ${'Item'.padEnd(28)} ${'Qty'.padStart(5)} ${'Revenue'.padStart(10)} ${'COGS'.padStart(10)} ${'Margin'.padStart(10)} ${'Margin%'.padStart(8)}`);
      console.log('    ' + '-'.repeat(75));
      for (const item of c.items.slice(0, 15)) {
        const name = (item.item_name || '?').padEnd(28);
        const qty = String(item.quantity_sold || 0).padStart(5);
        const rev = `$${Number(item.revenue || 0).toFixed(2)}`.padStart(10);
        const cogs = `$${Number(item.cogs || 0).toFixed(2)}`.padStart(10);
        const margin = `$${Number(item.margin || 0).toFixed(2)}`.padStart(10);
        const marginPct = `${Number(item.margin_percent || 0).toFixed(1)}%`.padStart(8);
        console.log(`    ${name} ${qty} ${rev} ${cogs} ${margin} ${marginPct}`);
      }
    }

    if (c.totals) {
      console.log('    ' + '-'.repeat(75));
      console.log(`    ${'TOTAL'.padEnd(28)} ${' '.padStart(5)} ${'$' + Number(c.totals.total_revenue || 0).toFixed(2)} COGS $${Number(c.totals.total_cogs || 0).toFixed(2)} Margin $${Number(c.totals.total_margin || 0).toFixed(2)} (${Number(c.totals.overall_margin_percent || 0).toFixed(1)}%)`);
    }

    if (!c.items?.length) {
      console.log('    No COGS data — check that menu_item_ingredients are seeded.');
    }
  }

  // ─── Delivery Margins ──────────────────────────────────────
  if (deliveryMargins.ok && deliveryMargins.data) {
    console.log('\n  --- DELIVERY MARGINS ---');
    const d = deliveryMargins.data;
    const platforms = d.platforms || (Array.isArray(d) ? d : []);
    if (platforms.length > 0) {
      console.log(`    ${'Platform'.padEnd(16)} ${'Orders'.padStart(7)} ${'Revenue'.padStart(12)} ${'Commission'.padStart(12)} ${'Net'.padStart(12)} ${'Margin%'.padStart(8)}`);
      console.log('    ' + '-'.repeat(70));
      for (const p of platforms) {
        const name = (p.display_name || p.platform || '?').padEnd(16);
        const orders = String(p.order_count || 0).padStart(7);
        const rev = `$${Number(p.revenue || 0).toFixed(2)}`.padStart(12);
        const comm = `$${Number(p.total_commission || 0).toFixed(2)}`.padStart(12);
        const net = `$${Number(p.net_revenue || 0).toFixed(2)}`.padStart(12);
        const margin = `${Number(p.margin_percent || 0).toFixed(1)}%`.padStart(8);
        console.log(`    ${name} ${orders} ${rev} ${comm} ${net} ${margin}`);
      }
    } else {
      console.log('    No delivery margin data for today.');
    }
  }

  // ─── Performance ────────────────────────────────────────────
  console.log('\n  --- SYSTEM PERFORMANCE ---');
  console.log(`  Total requests:   ${totalRequests}`);
  console.log(`  Total errors:     ${totalErrors} (${((totalErrors / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`  Reports checked:  ${stats.reportsChecked}`);

  analyzePerformance();

  // ─── Error Breakdown ────────────────────────────────────────
  if (errors.length > 0) {
    console.log('\n  --- ERROR BREAKDOWN ---');
    const errGrouped = {};
    for (const e of errors) {
      const key = `${e.method} ${e.endpoint?.split('?')[0] || 'unknown'} -> ${e.status || 'NETWORK'}`;
      if (!errGrouped[key]) errGrouped[key] = { count: 0, sample: e.body || e.error };
      errGrouped[key].count++;
    }
    for (const [key, val] of Object.entries(errGrouped).sort((a, b) => b.count - a.count).slice(0, 15)) {
      console.log(`    ${val.count}x ${key}`);
      if (val.sample) console.log(`       Sample: ${String(val.sample).substring(0, 100)}`);
    }
  }

  // ─── Recommendations ───────────────────────────────────────
  console.log('\n  --- RECOMMENDATIONS ---');
  const recs = [];

  const errorRate = (totalErrors / totalRequests) * 100;
  if (errorRate > 5) recs.push(`High error rate (${errorRate.toFixed(1)}%) — investigate API failures`);
  if (errorRate > 0 && errorRate <= 5) recs.push(`Some errors (${errorRate.toFixed(1)}%) — check breakdown above`);

  const slowReqs = timings.filter(t => t.elapsed > 1000);
  if (slowReqs.length > 10) recs.push(`${slowReqs.length} requests >1s — consider query optimization or caching`);

  if (stats.kitchenQueuePeak > 20) recs.push(`Kitchen queue peaked at ${stats.kitchenQueuePeak} — consider adding kitchen staff`);

  const pool503s = errors.filter(e => e.status === 503);
  if (pool503s.length > 0) recs.push(`${pool503s.length} connection pool exhaustion events — increase pool size or reduce concurrent connections`);

  if (stats.lowStockAlerts.length > 3) recs.push(`${stats.lowStockAlerts.length} low-stock alerts — review par levels and reorder points`);

  if (stats.ordersCancelled > totalOrders * 0.1) recs.push(`High cancellation rate (${((stats.ordersCancelled / totalOrders) * 100).toFixed(1)}%) — investigate why`);

  if (recs.length === 0) {
    console.log('  System handled rush hour well. No critical issues found.');
  } else {
    for (const rec of recs) {
      console.log(`  * ${rec}`);
    }
  }

  // ─── Quick Summary ──────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  const successRate = ((totalRequests - totalErrors) / totalRequests * 100).toFixed(1);
  const verdict = successRate >= 99 ? 'EXCELLENT'
    : successRate >= 95 ? 'GOOD'
    : successRate >= 90 ? 'FAIR'
    : 'NEEDS ATTENTION';

  console.log(`  VERDICT: ${verdict} (${successRate}% success rate)`);
  console.log(`  ${totalOrders} orders | $${totalRevenue.toFixed(0)} MXN revenue | ${simDuration}s runtime`);
  console.log(`  Now open your POS reports to review the data in detail.`);
  console.log('='.repeat(65));
  console.log('');
}

main().catch(err => {
  console.error('\nSimulation crashed:', err);
  process.exit(1);
});
