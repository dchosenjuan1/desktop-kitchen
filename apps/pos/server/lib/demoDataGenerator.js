/**
 * Demo Data Generator — creates realistic backdated historical data
 * for a tenant so that admin reports, AI analytics, delivery margins,
 * loyalty, and financial projections all show populated data.
 *
 * Tagged with source='demo_generator' on orders and demo_batch_id on
 * non-order tables for clean deletion.
 */

const TAX_RATE = 0.16;
const DEMO_SOURCE = 'demo_generator';

// Volume presets
const VOLUME_MAP = { low: 50, medium: 150, high: 300 };

// Mexican first/last names for loyalty customers
const FIRST_NAMES = [
  'María', 'José', 'Juan', 'Ana', 'Carlos', 'Laura', 'Miguel', 'Sofía',
  'Luis', 'Fernanda', 'Diego', 'Gabriela', 'Alejandro', 'Valentina',
  'Ricardo', 'Daniela', 'Fernando', 'Camila', 'Pedro', 'Isabella',
];
const LAST_NAMES = [
  'García', 'Hernández', 'López', 'Martínez', 'González', 'Rodríguez',
  'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera',
  'Gómez', 'Díaz', 'Cruz', 'Morales', 'Reyes', 'Jiménez', 'Ruiz', 'Vargas',
];

// Financial line items
const FINANCIAL_LINES = [
  { category: 'food_cost', label: 'Food Cost', min: 25000, max: 45000 },
  { category: 'labor', label: 'Labor', min: 20000, max: 35000 },
  { category: 'rent', label: 'Rent', min: 12000, max: 18000 },
  { category: 'utilities', label: 'Utilities', min: 3000, max: 6000 },
  { category: 'supplies', label: 'Supplies', min: 2000, max: 4000 },
  { category: 'marketing', label: 'Marketing', min: 1000, max: 3000 },
];

// ─── Helpers ──────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

/**
 * Generate a random timestamp within the date range, weighted
 * toward typical restaurant business hours.
 * Peaks: 12-14 (lunch), 19-21 (dinner)
 */
function randomTimestamp(dateRangeDays) {
  const now = new Date();
  const msBack = randInt(1, dateRangeDays) * 24 * 60 * 60 * 1000;
  const date = new Date(now.getTime() - msBack);

  // Weighted hour distribution
  const r = Math.random();
  let hour;
  if (r < 0.05) hour = randInt(8, 10);        // 5% early morning
  else if (r < 0.15) hour = randInt(10, 11);   // 10% late morning
  else if (r < 0.45) hour = randInt(12, 14);   // 30% lunch peak
  else if (r < 0.55) hour = randInt(15, 17);   // 10% afternoon
  else if (r < 0.85) hour = randInt(19, 21);   // 30% dinner peak
  else hour = randInt(17, 18);                 // 15% early evening

  date.setHours(hour, randInt(0, 59), randInt(0, 59));
  return date;
}

function generatePhone() {
  const area = randInt(55, 99);
  const num = String(randInt(10000000, 99999999));
  return `+521${area}${num}`;
}

// ─── Main Generator ──────────────────────────────────────

export async function generateDemoData(adminSql, {
  tenantId,
  batchId,
  volume = 'medium',
  dateRangeDays = 30,
  includeDelivery = true,
  includeLoyalty = true,
  includeAi = true,
  includeFinancials = true,
}) {
  const orderCount = VOLUME_MAP[volume] || VOLUME_MAP.medium;

  // Fetch tenant's existing menu, employees, modifiers, delivery platforms
  const menuItems = await adminSql`
    SELECT id, name, price, category_id FROM menu_items
    WHERE tenant_id = ${tenantId} AND active = true
  `;
  const employees = await adminSql`
    SELECT id, name FROM employees
    WHERE tenant_id = ${tenantId} AND active = true
  `;
  const modifiers = await adminSql`
    SELECT m.id, m.name, m.price_adjustment, m.group_id
    FROM modifiers m
    JOIN modifier_groups mg ON mg.id = m.group_id
    WHERE mg.tenant_id = ${tenantId} AND mg.active = true AND m.active = true
  `;
  const deliveryPlatforms = includeDelivery
    ? await adminSql`
        SELECT id, name, commission_percent FROM delivery_platforms
        WHERE tenant_id = ${tenantId} AND active = true
      `
    : [];

  if (menuItems.length === 0) {
    throw new Error('No active menu items. Seed the tenant menu first.');
  }
  if (employees.length === 0) {
    throw new Error('No active employees. Seed the tenant first.');
  }

  const summary = {
    orders: 0,
    order_items: 0,
    order_item_modifiers: 0,
    order_payments: 0,
    delivery_orders: 0,
    loyalty_customers: 0,
    stamp_cards: 0,
    stamp_events: 0,
    referral_events: 0,
    ai_hourly_snapshots: 0,
    ai_item_pairs: 0,
    ai_inventory_velocity: 0,
    financial_actuals: 0,
  };

  // ─── Generate Orders ──────────────────────────────────

  const generatedOrders = []; // { id, total, created_at, items[] }

  for (let i = 0; i < orderCount; i++) {
    const created_at = randomTimestamp(dateRangeDays);
    const employee = pick(employees);
    const numItems = randInt(2, 4);
    const isDelivery = includeDelivery && deliveryPlatforms.length > 0 && Math.random() < 0.3;
    const platform = isDelivery ? pick(deliveryPlatforms) : null;

    let itemsTotal = 0;
    const orderItems = [];

    for (let j = 0; j < numItems; j++) {
      const item = pick(menuItems);
      const qty = randInt(1, 3);
      let modAdj = 0;
      const itemMods = [];

      // 30% chance of modifier
      if (modifiers.length > 0 && Math.random() < 0.3) {
        const mod = pick(modifiers);
        modAdj = Number(mod.price_adjustment) || 0;
        itemMods.push(mod);
      }

      const unitPrice = Number(item.price) + modAdj;
      itemsTotal += unitPrice * qty;
      orderItems.push({
        menu_item_id: item.id,
        item_name: item.name,
        category_id: item.category_id,
        quantity: qty,
        unit_price: unitPrice,
        modifiers: itemMods,
      });
    }

    const total = Math.round(itemsTotal * 100) / 100;
    const tax = Math.round((total - total / (1 + TAX_RATE)) * 100) / 100;
    const subtotal = Math.round((total - tax) * 100) / 100;

    // Payment method and tip
    const paymentMethod = Math.random() < 0.55 ? 'cash' : 'card';
    let tip = 0;
    if (paymentMethod === 'card') {
      const tipRoll = Math.random();
      if (tipRoll < 0.5) tip = 0;
      else if (tipRoll < 0.8) tip = Math.round(total * randFloat(0.10, 0.15) * 100) / 100;
      else tip = Math.round(total * randFloat(0.16, 0.20) * 100) / 100;
    }

    // Generate order number using same atomic pattern
    const dateStr = created_at.toISOString().split('T')[0];
    const datePrefix = parseInt(dateStr.replace(/-/g, '')) * 1000;

    const [counter] = await adminSql.unsafe(`
      INSERT INTO daily_order_counter (tenant_id, date_key, last_seq)
      VALUES ($1, $2::date, 1)
      ON CONFLICT (tenant_id, date_key) DO UPDATE SET last_seq = daily_order_counter.last_seq + 1
      RETURNING last_seq
    `, [tenantId, dateStr]);

    const orderNumber = datePrefix + counter.last_seq;

    // Insert order
    const [order] = await adminSql.unsafe(`
      INSERT INTO orders (tenant_id, order_number, employee_id, status, subtotal, tax, tip, total,
                          payment_status, payment_method, source, created_at, paid_at)
      VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, 'paid', $8, $9, $10, $10)
      RETURNING id
    `, [tenantId, orderNumber, employee.id, subtotal, tax, tip, total + tip, paymentMethod, DEMO_SOURCE, created_at.toISOString()]);

    const orderId = order.id;
    summary.orders++;

    // Insert order items
    for (const item of orderItems) {
      const [itemRow] = await adminSql.unsafe(`
        INSERT INTO order_items (tenant_id, order_id, menu_item_id, item_name, quantity, unit_price)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [tenantId, orderId, item.menu_item_id, item.item_name, item.quantity, item.unit_price]);

      summary.order_items++;

      for (const mod of item.modifiers) {
        await adminSql.unsafe(`
          INSERT INTO order_item_modifiers (tenant_id, order_item_id, modifier_id, modifier_name, price_adjustment)
          VALUES ($1, $2, $3, $4, $5)
        `, [tenantId, itemRow.id, mod.id, mod.name, mod.price_adjustment]);
        summary.order_item_modifiers++;
      }
    }

    // Insert order payment
    await adminSql.unsafe(`
      INSERT INTO order_payments (tenant_id, order_id, method, amount, status)
      VALUES ($1, $2, $3, $4, 'completed')
    `, [tenantId, orderId, paymentMethod, total + tip]);
    summary.order_payments++;

    // Insert delivery order if applicable
    if (isDelivery && platform) {
      const commission = Math.round(total * (Number(platform.commission_percent) / 100) * 100) / 100;
      await adminSql.unsafe(`
        INSERT INTO delivery_orders (tenant_id, order_id, platform_id, platform_order_id,
                                     customer_name, status, commission_amount, platform_total, created_at)
        VALUES ($1, $2, $3, $4, $5, 'delivered', $6, $7, $8)
      `, [
        tenantId, orderId, platform.id,
        `DEL-${platform.name.toUpperCase()}-${randInt(10000, 99999)}`,
        `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        commission, total, created_at.toISOString(),
      ]);
      summary.delivery_orders++;
    }

    generatedOrders.push({
      id: orderId,
      total: total + tip,
      created_at,
      items: orderItems,
    });
  }

  // ─── Generate Loyalty Data ────────────────────────────

  if (includeLoyalty) {
    const customerCount = randInt(50, 100);
    const customers = [];

    for (let i = 0; i < customerCount; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const [cust] = await adminSql.unsafe(`
        INSERT INTO loyalty_customers (tenant_id, name, phone, sms_opt_in, total_visits, total_spent, demo_batch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        tenantId,
        `${firstName} ${lastName}`,
        generatePhone(),
        Math.random() < 0.7,
        randInt(1, 20),
        randFloat(200, 5000),
        batchId,
      ]);
      customers.push(cust.id);
      summary.loyalty_customers++;
    }

    // Stamp cards: 1-2 per customer (subset of customers)
    const stampCustomers = customers.slice(0, Math.ceil(customers.length * 0.6));
    for (const custId of stampCustomers) {
      const cardsCount = randInt(1, 2);
      for (let c = 0; c < cardsCount; c++) {
        const stamps = randInt(1, 10);
        const isComplete = stamps >= 10;
        const isRedeemed = isComplete && Math.random() < 0.5;
        const [card] = await adminSql.unsafe(`
          INSERT INTO stamp_cards (tenant_id, customer_id, stamps_collected, completed, redeemed, demo_batch_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [tenantId, custId, Math.min(stamps, 10), isComplete, isRedeemed, batchId]);
        summary.stamp_cards++;

        // Stamp events for some orders
        const eventCount = Math.min(stamps, 5);
        for (let e = 0; e < eventCount; e++) {
          const order = pick(generatedOrders);
          await adminSql.unsafe(`
            INSERT INTO stamp_events (tenant_id, customer_id, card_id, order_id, event_type, stamps, demo_batch_id, created_at)
            VALUES ($1, $2, $3, $4, 'purchase', 1, $5, $6)
          `, [tenantId, custId, card.id, order.id, batchId, order.created_at.toISOString()]);
          summary.stamp_events++;
        }
      }
    }

    // Referral events
    const refCount = randInt(5, 10);
    for (let i = 0; i < refCount; i++) {
      const referrer = pick(customers);
      const referred = pick(customers);
      if (referrer !== referred) {
        await adminSql.unsafe(`
          INSERT INTO referral_events (tenant_id, referrer_id, referred_id, status, demo_batch_id)
          VALUES ($1, $2, $3, 'completed', $4)
        `, [tenantId, referrer, referred, batchId]);
        summary.referral_events++;
      }
    }
  }

  // ─── Generate AI Analytics ────────────────────────────

  if (includeAi) {
    // Aggregate orders by hour for ai_hourly_snapshots
    const hourlyMap = new Map();
    for (const order of generatedOrders) {
      const hourKey = order.created_at.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, { count: 0, revenue: 0, date: order.created_at });
      }
      const entry = hourlyMap.get(hourKey);
      entry.count++;
      entry.revenue += order.total;
    }

    for (const [hourKey, data] of hourlyMap) {
      const avgTicket = data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0;
      await adminSql.unsafe(`
        INSERT INTO ai_hourly_snapshots (tenant_id, hour, order_count, revenue, avg_ticket, demo_batch_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [tenantId, data.date.toISOString(), data.count, Math.round(data.revenue * 100) / 100, avgTicket, batchId]);
      summary.ai_hourly_snapshots++;
    }

    // Item pair co-occurrence
    const pairMap = new Map();
    for (const order of generatedOrders) {
      const items = order.items.map(i => i.menu_item_id);
      for (let a = 0; a < items.length; a++) {
        for (let b = a + 1; b < items.length; b++) {
          const key = [items[a], items[b]].sort().join('-');
          pairMap.set(key, (pairMap.get(key) || 0) + 1);
        }
      }
    }

    for (const [key, count] of pairMap) {
      const [itemA, itemB] = key.split('-').map(Number);
      await adminSql.unsafe(`
        INSERT INTO ai_item_pairs (tenant_id, item_a_id, item_b_id, pair_count, demo_batch_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [tenantId, itemA, itemB, count, batchId]);
      summary.ai_item_pairs++;
    }

    // Inventory velocity — daily consumption per menu item
    const dailyMap = new Map();
    for (const order of generatedOrders) {
      const dayKey = order.created_at.toISOString().slice(0, 10);
      for (const item of order.items) {
        const key = `${dayKey}:${item.menu_item_id}`;
        if (!dailyMap.has(key)) {
          dailyMap.set(key, { date: dayKey, itemId: item.menu_item_id, qty: 0 });
        }
        dailyMap.get(key).qty += item.quantity;
      }
    }

    for (const entry of dailyMap.values()) {
      await adminSql.unsafe(`
        INSERT INTO ai_inventory_velocity (tenant_id, menu_item_id, date, daily_quantity, demo_batch_id)
        VALUES ($1, $2, $3::date, $4, $5)
        ON CONFLICT DO NOTHING
      `, [tenantId, entry.itemId, entry.date, entry.qty, batchId]);
      summary.ai_inventory_velocity++;
    }
  }

  // ─── Generate Financial Data ──────────────────────────

  if (includeFinancials) {
    // Generate monthly financial_actuals for past 3-6 months
    const months = randInt(3, 6);
    const now = new Date();
    for (let m = 0; m < months; m++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const yearMonth = monthDate.toISOString().slice(0, 7); // YYYY-MM

      for (const line of FINANCIAL_LINES) {
        const amount = randFloat(line.min, line.max);
        await adminSql.unsafe(`
          INSERT INTO financial_actuals (tenant_id, month, category, amount, demo_batch_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [tenantId, yearMonth, line.category, amount, batchId]);
        summary.financial_actuals++;
      }
    }
  }

  return summary;
}
