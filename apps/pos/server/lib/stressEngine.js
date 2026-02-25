/**
 * Stress Test Engine — runs simulated load against the tenant's database.
 *
 * Creates real orders (marked source='stress_test'), processes them through
 * the kitchen pipeline, tracks latency/throughput, then cleans up everything.
 */

import { getConn, all, get, run } from '../db/index.js';

const TAX_RATE = 0.16;
const SOURCES = ['pos', 'uber_eats', 'rappi', 'didi_food'];

// ─── Templates ──────────────────────────────────────────────

export const TEMPLATES = [
  {
    id: 'slow_day',
    name: 'Slow Day',
    description: 'Quiet afternoon with sporadic orders. Tests baseline DB performance and kitchen flow at low volume.',
    icon: 'cloud-rain',
    params: [
      { key: 'totalOrders', label: 'Total Orders', min: 5, max: 30, step: 1, default: 15 },
      { key: 'batchSize', label: 'Concurrent Orders', min: 1, max: 5, step: 1, default: 2 },
      { key: 'delayMs', label: 'Delay Between Batches (ms)', min: 200, max: 2000, step: 100, default: 800, unit: 'ms' },
    ],
  },
  {
    id: 'lunch_rush',
    name: 'Lunch Rush',
    description: 'Typical busy lunch period. POS cashiers + delivery orders hitting simultaneously.',
    icon: 'utensils',
    params: [
      { key: 'posOrders', label: 'POS Orders', min: 10, max: 60, step: 5, default: 40 },
      { key: 'deliveryOrders', label: 'Delivery Orders', min: 0, max: 30, step: 5, default: 10 },
      { key: 'batchSize', label: 'Concurrent Orders', min: 2, max: 8, step: 1, default: 4 },
      { key: 'delayMs', label: 'Delay Between Batches (ms)', min: 100, max: 1000, step: 50, default: 400, unit: 'ms' },
    ],
  },
  {
    id: 'friday_night',
    name: 'Friday Night Peak',
    description: 'Maximum capacity. All hands on deck with POS, delivery, and kitchen fully loaded.',
    icon: 'flame',
    params: [
      { key: 'posOrders', label: 'POS Orders', min: 30, max: 120, step: 10, default: 80 },
      { key: 'deliveryOrders', label: 'Delivery Orders', min: 10, max: 60, step: 5, default: 30 },
      { key: 'batchSize', label: 'Concurrent Orders', min: 3, max: 12, step: 1, default: 6 },
      { key: 'delayMs', label: 'Delay Between Batches (ms)', min: 50, max: 500, step: 50, default: 200, unit: 'ms' },
    ],
  },
  {
    id: 'delivery_blitz',
    name: 'Delivery Blitz',
    description: 'Platform promotion causing massive delivery surge while POS stays normal. Tests kitchen bottleneck under delivery pressure.',
    icon: 'truck',
    params: [
      { key: 'posOrders', label: 'POS Orders', min: 5, max: 30, step: 5, default: 10 },
      { key: 'deliveryOrders', label: 'Delivery Orders', min: 20, max: 100, step: 10, default: 60 },
      { key: 'batchSize', label: 'Concurrent Orders', min: 3, max: 10, step: 1, default: 5 },
      { key: 'delayMs', label: 'Delay Between Batches (ms)', min: 50, max: 500, step: 50, default: 250, unit: 'ms' },
    ],
  },
  {
    id: 'breaking_point',
    name: 'Breaking Point',
    description: 'Progressive ramp: increases concurrent orders each round until the system slows down. Finds your capacity ceiling.',
    icon: 'gauge',
    params: [
      { key: 'startBatch', label: 'Starting Batch Size', min: 2, max: 10, step: 1, default: 5 },
      { key: 'increment', label: 'Batch Increment', min: 1, max: 10, step: 1, default: 5 },
      { key: 'maxBatches', label: 'Max Rounds', min: 3, max: 15, step: 1, default: 10 },
      { key: 'latencyThresholdMs', label: 'Latency Threshold (ms)', min: 500, max: 5000, step: 250, default: 2000, unit: 'ms' },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

function calcLatencyStats(timings) {
  if (timings.length === 0) {
    return { avg: 0, p50: 0, p95: 0, p99: 0, max: 0, min: 0 };
  }
  const sorted = [...timings].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / sorted.length),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1],
    min: sorted[0],
  };
}

// ─── Core Operations ────────────────────────────────────────

async function fetchTestData() {
  const menuItems = await all('SELECT id, name, price FROM menu_items WHERE active = true');
  const employees = await all('SELECT id, name, role FROM employees WHERE active = true');
  const modifiers = await all(`
    SELECT m.id, m.name, m.price_adjustment, m.modifier_group_id
    FROM modifiers m
    JOIN modifier_groups mg ON mg.id = m.modifier_group_id
    WHERE mg.active = true
  `);

  if (menuItems.length === 0) throw new Error('No active menu items found. Seed your menu before running stress tests.');
  if (employees.length === 0) throw new Error('No active employees found.');

  return { menuItems, employees, modifiers };
}

async function createTestOrder(conn, { menuItems, employees, modifiers, source, tenantId }) {
  const employee = pick(employees);
  const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items

  let itemsTotal = 0;
  const orderItems = [];

  for (let i = 0; i < numItems; i++) {
    const item = pick(menuItems);
    const qty = Math.floor(Math.random() * 3) + 1;
    let modAdj = 0;
    const itemMods = [];

    // 30% chance of adding a modifier
    if (modifiers.length > 0 && Math.random() < 0.3) {
      const mod = pick(modifiers);
      modAdj = mod.price_adjustment;
      itemMods.push(mod);
    }

    const unitPrice = item.price + modAdj;
    itemsTotal += unitPrice * qty;
    orderItems.push({
      menu_item_id: item.id,
      item_name: item.name,
      quantity: qty,
      unit_price: unitPrice,
      modifiers: itemMods,
    });
  }

  const total = itemsTotal;
  const tax = Math.round((total - total / (1 + TAX_RATE)) * 100) / 100;
  const subtotal = Math.round((total - tax) * 100) / 100;

  // Generate order number
  const dateStr = new Date().toISOString().split('T')[0];
  const datePrefix = parseInt(dateStr.replace(/-/g, '')) * 1000;
  const tid = tenantId || 'default';

  const [counter] = await conn.unsafe(`
    INSERT INTO daily_order_counter (tenant_id, date_key, last_seq)
    VALUES ($1, $2::date, 1)
    ON CONFLICT (tenant_id, date_key) DO UPDATE SET last_seq = daily_order_counter.last_seq + 1
    RETURNING last_seq
  `, [tid, dateStr]);

  const orderNumber = datePrefix + counter.last_seq;

  const [inserted] = await conn.unsafe(`
    INSERT INTO orders (order_number, employee_id, status, subtotal, tax, total, payment_status, source)
    VALUES ($1, $2, 'pending', $3, $4, $5, 'unpaid', $6)
    RETURNING id
  `, [orderNumber, employee.id, subtotal, tax, total, source]);

  const orderId = inserted.id;

  // Insert items and modifiers
  for (const item of orderItems) {
    const [itemRow] = await conn.unsafe(`
      INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [orderId, item.menu_item_id, item.item_name, item.quantity, item.unit_price]);

    for (const mod of item.modifiers) {
      await conn.unsafe(`
        INSERT INTO order_item_modifiers (order_item_id, modifier_id, modifier_name, price_adjustment)
        VALUES ($1, $2, $3, $4)
      `, [itemRow.id, mod.id, mod.name, mod.price_adjustment]);
    }
  }

  return orderId;
}

async function transitionOrder(conn, orderId, toStatus) {
  await conn.unsafe(`UPDATE orders SET status = $1 WHERE id = $2`, [toStatus, orderId]);
}

async function cleanupOrders(conn, orderIds) {
  if (orderIds.length === 0) return;

  // Delete in reverse FK order
  const ids = orderIds;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

  // Get all order_items IDs
  const itemRows = await conn.unsafe(
    `SELECT id FROM order_items WHERE order_id IN (${placeholders})`, ids
  );
  const itemIds = itemRows.map(r => r.id);

  if (itemIds.length > 0) {
    const itemPlaceholders = itemIds.map((_, i) => `$${i + 1}`).join(',');
    await conn.unsafe(
      `DELETE FROM order_item_modifiers WHERE order_item_id IN (${itemPlaceholders})`, itemIds
    );
  }

  await conn.unsafe(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ids);
  await conn.unsafe(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
}

// ─── Runners ────────────────────────────────────────────────

async function runBatchOrders({ conn, testData, count, source, tenantId }) {
  const timings = [];
  const orderIds = [];
  let errors = 0;

  for (let i = 0; i < count; i++) {
    const start = Date.now();
    try {
      const id = await createTestOrder(conn, { ...testData, source, tenantId });
      orderIds.push(id);
      timings.push(Date.now() - start);
    } catch {
      errors++;
      timings.push(Date.now() - start);
    }
  }

  return { timings, orderIds, errors };
}

async function runKitchenPipeline(conn, orderIds, emit) {
  const statuses = ['confirmed', 'preparing', 'ready', 'completed'];
  const timings = [];
  let peakQueue = 0;
  let processed = 0;

  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize);
    peakQueue = Math.max(peakQueue, batch.length);

    for (const status of statuses) {
      for (const orderId of batch) {
        const start = Date.now();
        try {
          await transitionOrder(conn, orderId, status);
          timings.push(Date.now() - start);
        } catch {
          timings.push(Date.now() - start);
        }
      }
    }

    processed += batch.length;
    if (emit) {
      emit('progress', {
        phase: 'kitchen',
        message: `Kitchen processed ${processed}/${orderIds.length} orders`,
        percent: Math.round(50 + (processed / orderIds.length) * 40),
        ordersProcessed: processed,
      });
    }
  }

  return { timings, peakQueue };
}

// ─── Template Runners ───────────────────────────────────────

async function runStandardTest(conn, testData, tenantId, params, templateId, emit) {
  const { posOrders = 0, totalOrders = 0, deliveryOrders = 0, batchSize = 4, delayMs = 400 } = params;
  const posCount = totalOrders || posOrders;
  const deliveryCount = deliveryOrders || 0;
  const total = posCount + deliveryCount;

  const allOrderIds = [];
  const allTimings = [];
  let totalErrors = 0;
  let created = 0;

  // Build order queue: interleave POS and delivery
  const orderQueue = [];
  for (let i = 0; i < posCount; i++) orderQueue.push('pos');
  for (let i = 0; i < deliveryCount; i++) orderQueue.push(pick(['uber_eats', 'rappi', 'didi_food']));
  // Shuffle
  for (let i = orderQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orderQueue[i], orderQueue[j]] = [orderQueue[j], orderQueue[i]];
  }

  emit('progress', {
    phase: 'orders',
    message: `Creating ${total} orders (${posCount} POS, ${deliveryCount} delivery)...`,
    percent: 5,
    ordersCreated: 0,
  });

  // Process in batches
  for (let i = 0; i < orderQueue.length; i += batchSize) {
    const batch = orderQueue.slice(i, i + batchSize);
    const promises = batch.map(source =>
      runBatchOrders({ conn, testData, count: 1, source, tenantId })
    );

    const results = await Promise.all(promises);
    for (const r of results) {
      allOrderIds.push(...r.orderIds);
      allTimings.push(...r.timings);
      totalErrors += r.errors;
    }

    created += batch.length;
    emit('progress', {
      phase: 'orders',
      message: `Created ${created}/${total} orders`,
      percent: Math.round(5 + (created / total) * 45),
      ordersCreated: created,
      errorsCount: totalErrors,
      currentLatencyMs: allTimings.length > 0 ? allTimings[allTimings.length - 1] : 0,
    });

    if (i + batchSize < orderQueue.length) {
      await sleep(delayMs);
    }
  }

  // Kitchen pipeline
  emit('progress', { phase: 'kitchen', message: 'Processing kitchen pipeline...', percent: 50 });
  const kitchen = await runKitchenPipeline(conn, allOrderIds, emit);

  return {
    allOrderIds,
    orderTimings: allTimings,
    kitchenTimings: kitchen.timings,
    peakKitchenQueue: kitchen.peakQueue,
    totalErrors,
    posCount,
    deliveryCount,
  };
}

async function runBreakingPoint(conn, testData, tenantId, params, emit) {
  const { startBatch = 5, increment = 5, maxBatches = 10, latencyThresholdMs = 2000 } = params;

  const allOrderIds = [];
  const allTimings = [];
  const batches = [];
  let totalErrors = 0;
  let round = 0;

  emit('progress', {
    phase: 'breaking_point',
    message: `Starting breaking point test (threshold: ${latencyThresholdMs}ms)...`,
    percent: 5,
  });

  for (round = 0; round < maxBatches; round++) {
    const batchSize = startBatch + round * increment;

    emit('progress', {
      phase: 'breaking_point',
      message: `Round ${round + 1}: Creating ${batchSize} concurrent orders...`,
      percent: Math.round(5 + (round / maxBatches) * 80),
      ordersCreated: allOrderIds.length,
    });

    // Fire all orders in this batch concurrently
    const promises = Array.from({ length: batchSize }, () =>
      runBatchOrders({ conn, testData, count: 1, source: pick(SOURCES), tenantId })
    );

    const results = await Promise.all(promises);
    let batchTimings = [];
    let batchErrors = 0;

    for (const r of results) {
      allOrderIds.push(...r.orderIds);
      allTimings.push(...r.timings);
      batchTimings.push(...r.timings);
      batchErrors += r.errors;
      totalErrors += r.errors;
    }

    const avgLatency = batchTimings.length > 0
      ? Math.round(batchTimings.reduce((a, b) => a + b, 0) / batchTimings.length)
      : 0;
    const errorRate = batchSize > 0 ? batchErrors / batchSize : 0;

    batches.push({ batchSize, avgLatencyMs: avgLatency, errorRate });

    emit('progress', {
      phase: 'breaking_point',
      message: `Round ${round + 1}: ${batchSize} orders, avg ${avgLatency}ms, ${Math.round(errorRate * 100)}% errors`,
      percent: Math.round(5 + ((round + 1) / maxBatches) * 80),
      currentLatencyMs: avgLatency,
      errorsCount: totalErrors,
    });

    // Stop if threshold exceeded or error rate too high
    if (avgLatency > latencyThresholdMs || errorRate > 0.1) {
      emit('progress', {
        phase: 'breaking_point',
        message: avgLatency > latencyThresholdMs
          ? `Latency threshold exceeded at batch size ${batchSize} (${avgLatency}ms > ${latencyThresholdMs}ms)`
          : `Error rate too high at batch size ${batchSize} (${Math.round(errorRate * 100)}%)`,
        percent: 85,
      });
      break;
    }

    await sleep(500); // Brief cooldown between rounds
  }

  // Kitchen pipeline for all orders
  emit('progress', { phase: 'kitchen', message: 'Processing kitchen pipeline...', percent: 85 });
  const kitchen = await runKitchenPipeline(conn, allOrderIds, emit);

  return {
    allOrderIds,
    orderTimings: allTimings,
    kitchenTimings: kitchen.timings,
    peakKitchenQueue: kitchen.peakQueue,
    totalErrors,
    posCount: allOrderIds.length,
    deliveryCount: 0,
    breakingPointBatches: batches,
  };
}

// ─── Main Entry Point ───────────────────────────────────────

export async function runStressTest(config, tenantId, emit) {
  const conn = getConn();
  const startTime = Date.now();

  emit('progress', { phase: 'setup', message: 'Loading menu data...', percent: 1 });
  const testData = await fetchTestData();
  emit('progress', {
    phase: 'setup',
    message: `Found ${testData.menuItems.length} menu items, ${testData.employees.length} employees, ${testData.modifiers.length} modifiers`,
    percent: 3,
  });

  const template = TEMPLATES.find(t => t.id === config.templateId);
  if (!template) throw new Error(`Unknown template: ${config.templateId}`);

  let result;
  if (config.templateId === 'breaking_point') {
    result = await runBreakingPoint(conn, testData, tenantId, config.params, emit);
  } else {
    result = await runStandardTest(conn, testData, tenantId, config.params, config.templateId, emit);
  }

  // Cleanup
  emit('progress', { phase: 'cleanup', message: `Cleaning up ${result.allOrderIds.length} test orders...`, percent: 92 });
  await cleanupOrders(conn, result.allOrderIds);
  emit('progress', { phase: 'cleanup', message: 'Cleanup complete', percent: 98 });

  const durationMs = Date.now() - startTime;
  const throughputPerMinute = durationMs > 0
    ? Math.round((result.allOrderIds.length / durationMs) * 60000)
    : 0;

  // Generate recommendations
  const recommendations = [];
  const orderLatency = calcLatencyStats(result.orderTimings);
  const kitchenLatency = calcLatencyStats(result.kitchenTimings);

  if (orderLatency.p95 > 1000) {
    recommendations.push('Order creation P95 latency exceeds 1s. Consider optimizing DB queries or increasing connection pool size.');
  }
  if (orderLatency.p95 > 500 && orderLatency.p95 <= 1000) {
    recommendations.push('Order creation P95 is between 500ms-1s. Performance is acceptable but monitor under heavier load.');
  }
  if (orderLatency.p95 <= 500) {
    recommendations.push('Order creation latency is excellent. Your system handles this load level well.');
  }
  if (result.peakKitchenQueue > 15) {
    recommendations.push(`Kitchen queue peaked at ${result.peakKitchenQueue} orders. Consider adding prep staff for this load level.`);
  }
  if (result.totalErrors > 0) {
    const errorRate = result.totalErrors / (result.posCount + result.deliveryCount);
    if (errorRate > 0.05) {
      recommendations.push(`Error rate of ${Math.round(errorRate * 100)}% indicates system strain. This load level may exceed capacity.`);
    } else {
      recommendations.push(`Minor error rate of ${Math.round(errorRate * 100)}%. Occasional errors under load are normal.`);
    }
  }
  if (throughputPerMinute > 100) {
    recommendations.push(`Throughput of ${throughputPerMinute} orders/min is strong. System can handle high-volume service.`);
  }
  if (result.breakingPointBatches?.length > 0) {
    const lastBatch = result.breakingPointBatches[result.breakingPointBatches.length - 1];
    const peakBatch = result.breakingPointBatches.reduce((best, b) =>
      b.avgLatencyMs < 1000 && b.batchSize > best.batchSize ? b : best,
      { batchSize: 0 }
    );
    if (peakBatch.batchSize > 0) {
      recommendations.push(`System comfortably handles ${peakBatch.batchSize} concurrent orders (avg ${peakBatch.avgLatencyMs}ms).`);
    }
    if (lastBatch.avgLatencyMs > 2000 || lastBatch.errorRate > 0.1) {
      recommendations.push(`Breaking point reached at ${lastBatch.batchSize} concurrent orders. Plan staffing and infrastructure accordingly.`);
    }
  }

  return {
    templateId: config.templateId,
    templateName: template.name,
    durationMs,
    totalOrders: result.allOrderIds.length,
    posOrders: result.posCount,
    deliveryOrders: result.deliveryCount,
    ordersCompleted: result.allOrderIds.length - result.totalErrors,
    ordersFailed: result.totalErrors,
    errorRate: result.allOrderIds.length > 0
      ? Math.round((result.totalErrors / result.allOrderIds.length) * 10000) / 100
      : 0,
    orderCreationLatency: orderLatency,
    kitchenTransitionLatency: kitchenLatency,
    throughputPerMinute,
    peakKitchenQueue: result.peakKitchenQueue,
    breakingPointBatches: result.breakingPointBatches || undefined,
    recommendations,
  };
}
