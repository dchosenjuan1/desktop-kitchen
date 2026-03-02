/**
 * Demo Data Generator — creates realistic backdated historical data
 * for a tenant so that admin reports, AI analytics, delivery margins,
 * loyalty, and financial projections all show populated data.
 *
 * Tagged with source='demo_generator' on orders and demo_batch_id on
 * non-order tables for clean deletion.
 */

import { tenantContext } from '../db/index.js';
import { detectShrinkagePatterns } from '../ai/data-pipeline.js';
import { analyzeWastePatterns } from '../ai/suggestions/waste-patterns.js';

const TAX_RATE = 0.16;
const DEMO_SOURCE = 'demo_generator';

// Volume presets — hit $150k-200k MXN/month at ~$300-350 avg ticket
const VOLUME_MAP = { low: 150, medium: 500, high: 1000 };

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

// Financial line items (scaled for ~$175k/month revenue)
const FINANCIAL_LINES = [
  { category: 'food_cost', label: 'Food Cost', min: 45000, max: 60000 },
  { category: 'labor', label: 'Labor', min: 35000, max: 50000 },
  { category: 'rent', label: 'Rent', min: 15000, max: 20000 },
  { category: 'utilities', label: 'Utilities', min: 5000, max: 9000 },
  { category: 'supplies', label: 'Supplies', min: 3000, max: 7000 },
  { category: 'marketing', label: 'Marketing', min: 2000, max: 5000 },
];

// Financial targets (Budget vs Actual percentages)
const FINANCIAL_TARGETS = [
  { category: 'food_cost', target_percent: 30 },
  { category: 'labor', target_percent: 25 },
  { category: 'rent', target_percent: 10 },
  { category: 'utilities', target_percent: 4 },
  { category: 'supplies', target_percent: 3 },
  { category: 'marketing', target_percent: 2 },
];

// Waste reasons with distribution weights
const WASTE_REASONS = [
  { reason: 'spoilage', weight: 0.40 },
  { reason: 'prep_error', weight: 0.25 },
  { reason: 'expired', weight: 0.20 },
  { reason: 'dropped', weight: 0.10 },
  { reason: 'other', weight: 0.05 },
];

// Vendor templates
const VENDOR_TEMPLATES = [
  {
    name: 'Distribuidora Cárnica del Norte',
    contact: 'Roberto Mendoza',
    phone: '+5218112345678',
    keywords: ['carne', 'meat', 'pollo', 'chicken', 'res', 'cerdo', 'pork', 'bacon', 'wing', 'patty', 'beef', 'rib'],
  },
  {
    name: 'Frutas y Verduras La Central',
    contact: 'María Solís',
    phone: '+5218112345679',
    keywords: ['lechuga', 'lettuce', 'tomate', 'tomato', 'jalapeño', 'cebolla', 'onion', 'aguacate', 'avocado', 'pepino', 'pickle', 'coleslaw', 'produce', 'vegetal', 'fruta'],
  },
  {
    name: 'Abarrotes El Mayoreo',
    contact: 'Jorge Castillo',
    phone: '+5218112345680',
    keywords: ['pan', 'bun', 'bread', 'harina', 'flour', 'aceite', 'oil', 'salsa', 'sauce', 'queso', 'cheese', 'mayo', 'mustard', 'ketchup', 'bebida', 'drink', 'soda', 'fries', 'fry'],
  },
];

// Delivery platform markup percentages
const PLATFORM_MARKUPS = {
  uber_eats: 18,
  rappi: 15,
  didi_food: 12,
};

// Refund reasons
const REFUND_REASONS = [
  'Customer complaint',
  'Wrong order',
  'Quality issue',
  'Duplicate charge',
  'Late delivery',
];

// Category role keyword matching
const CATEGORY_ROLE_KEYWORDS = {
  primary: ['burger', 'chicken', 'pollo', 'wing', 'rib', 'sandwich', 'main', 'plato', 'principal', 'hamburguesa'],
  complement: ['side', 'acompañ', 'dessert', 'postre', 'appetizer', 'entrada', 'extra'],
  staple: ['drink', 'bebida', 'beverage', 'soda', 'agua', 'juice', 'jugo', 'refresco'],
};

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
  // Include today (0) so "Hoy" reports have data; weight toward recent days
  const daysBack = randInt(0, dateRangeDays);
  const msBack = daysBack * 24 * 60 * 60 * 1000;
  const date = new Date(now.getTime() - msBack);

  // Weighted hour distribution
  const r = Math.random();
  let hour;
  if (daysBack === 0) {
    // Today: only generate hours up to current hour (no future timestamps)
    const maxHour = Math.max(now.getHours() - 1, 8);
    hour = randInt(8, maxHour);
  } else if (r < 0.05) hour = randInt(8, 10);        // 5% early morning
  else if (r < 0.15) hour = randInt(10, 11);          // 10% late morning
  else if (r < 0.45) hour = randInt(12, 14);          // 30% lunch peak
  else if (r < 0.55) hour = randInt(15, 17);          // 10% afternoon
  else if (r < 0.85) hour = randInt(19, 21);          // 30% dinner peak
  else hour = randInt(17, 18);                        // 15% early evening

  date.setHours(hour, randInt(0, 59), randInt(0, 59));
  return date;
}

function generatePhone() {
  const area = randInt(55, 99);
  const num = String(randInt(10000000, 99999999));
  return `+521${area}${num}`;
}

/** Pick from weighted items array [{ ..., weight }] */
function pickWeighted(items) {
  const r = Math.random();
  let cum = 0;
  for (const item of items) {
    cum += item.weight;
    if (r <= cum) return item;
  }
  return items[items.length - 1];
}

/** Shuffle array in-place (Fisher-Yates) */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Match a vendor template index by inventory item name */
function matchVendor(itemName) {
  const lower = itemName.toLowerCase();
  for (let i = 0; i < VENDOR_TEMPLATES.length; i++) {
    if (VENDOR_TEMPLATES[i].keywords.some(kw => lower.includes(kw))) {
      return i;
    }
  }
  // Default to last vendor (dry goods/misc)
  return VENDOR_TEMPLATES.length - 1;
}

/** Determine category role from name */
function getCategoryRole(categoryName) {
  const lower = categoryName.toLowerCase();
  for (const [role, keywords] of Object.entries(CATEGORY_ROLE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return role;
  }
  return 'complement';
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

  // ─── Idempotent schema additions ──────────────────────────
  const schemaAdditions = [
    'ALTER TABLE inventory_counts ADD COLUMN IF NOT EXISTS demo_batch_id UUID',
    'ALTER TABLE shrinkage_alerts ADD COLUMN IF NOT EXISTS demo_batch_id UUID',
    'ALTER TABLE delivery_markup_rules ADD COLUMN IF NOT EXISTS demo_batch_id UUID',
    'ALTER TABLE vendors ADD COLUMN IF NOT EXISTS demo_batch_id UUID',
    'ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS demo_batch_id UUID',
    'ALTER TABLE menu_item_ingredients ADD COLUMN IF NOT EXISTS demo_batch_id UUID',
  ];
  for (const ddl of schemaAdditions) {
    await adminSql.unsafe(ddl);
  }

  // ─── Fetch tenant data ──────────────────────────────────────
  const [menuItems, employees, modifiers, deliveryPlatforms, inventoryItems, menuItemIngredients, menuCategories] =
    await Promise.all([
      adminSql`SELECT id, name, price, category_id FROM menu_items WHERE tenant_id = ${tenantId} AND active = true`,
      adminSql`SELECT id, name FROM employees WHERE tenant_id = ${tenantId} AND active = true`,
      adminSql`
        SELECT m.id, m.name, m.price_adjustment, m.group_id
        FROM modifiers m JOIN modifier_groups mg ON mg.id = m.group_id
        WHERE mg.tenant_id = ${tenantId} AND mg.active = true AND m.active = true
      `,
      includeDelivery
        ? adminSql`SELECT id, name, commission_percent FROM delivery_platforms WHERE tenant_id = ${tenantId} AND active = true`
        : Promise.resolve([]),
      adminSql`SELECT id, name, quantity, unit, cost_price, category FROM inventory_items WHERE tenant_id = ${tenantId}`,
      adminSql`SELECT menu_item_id, inventory_item_id, quantity_used FROM menu_item_ingredients WHERE tenant_id = ${tenantId}`,
      adminSql`SELECT id, name FROM menu_categories WHERE tenant_id = ${tenantId}`,
    ]);

  if (menuItems.length === 0) throw new Error('No active menu items. Seed the tenant menu first.');
  if (employees.length === 0) throw new Error('No active employees. Seed the tenant first.');

  // Build ingredient lookup: menu_item_id → [{ inventory_item_id, quantity_used }]
  const ingredientMap = new Map();
  for (const ing of menuItemIngredients) {
    if (!ingredientMap.has(ing.menu_item_id)) ingredientMap.set(ing.menu_item_id, []);
    ingredientMap.get(ing.menu_item_id).push({
      inventory_item_id: ing.inventory_item_id,
      quantity_used: Number(ing.quantity_used),
    });
  }

  const summary = {
    menu_item_ingredients: 0,
    orders: 0, order_items: 0, order_item_modifiers: 0, order_payments: 0,
    delivery_orders: 0, delivery_markup_rules: 0,
    loyalty_customers: 0, stamp_cards: 0, stamp_events: 0, referral_events: 0,
    ai_hourly_snapshots: 0, ai_item_pairs: 0, ai_inventory_velocity: 0,
    ai_suggestion_cache: 0, ai_category_roles: 0,
    financial_actuals: 0, financial_targets: 0,
    waste_log: 0, inventory_counts: 0, shrinkage_alerts: 0,
    vendors: 0, purchase_orders: 0, purchase_order_items: 0,
    refunds: 0,
  };

  // ─── 0. Seed Recipes (menu_item_ingredients) ──────────────
  // For items without ingredients, assign 3-6 inventory items targeting 28-35% food cost
  if (inventoryItems.length > 0) {
    // Group inventory items by rough type for smarter assignment
    const invByCategory = new Map();
    for (const inv of inventoryItems) {
      const cat = (inv.category || 'other').toLowerCase();
      if (!invByCategory.has(cat)) invByCategory.set(cat, []);
      invByCategory.get(cat).push(inv);
    }
    const allInvCategories = [...invByCategory.keys()];

    // Find menu items without recipes
    const itemsWithRecipes = new Set(menuItemIngredients.map(i => i.menu_item_id));

    for (const menuItem of menuItems) {
      if (itemsWithRecipes.has(menuItem.id)) continue; // skip items that already have recipes

      const price = Number(menuItem.price);
      if (price <= 0) continue;

      // Target COGS = 28-35% of price
      const targetCogs = price * randFloat(0.28, 0.35);
      const numIngredients = randInt(3, Math.min(6, inventoryItems.length));
      const costPerIngredient = targetCogs / numIngredients;

      // Pick diverse ingredients from different categories
      const usedIngredients = new Set();
      const shuffledInv = shuffle(inventoryItems);

      for (let n = 0; n < numIngredients && n < shuffledInv.length; n++) {
        const inv = shuffledInv[n];
        if (usedIngredients.has(inv.id)) continue;
        usedIngredients.add(inv.id);

        const costPrice = Number(inv.cost_price) || 10;
        // quantity_used = target cost per ingredient / cost_price
        const qtyUsed = Math.max(0.05, Math.round((costPerIngredient / costPrice) * 100) / 100);

        await adminSql.unsafe(`
          INSERT INTO menu_item_ingredients (tenant_id, menu_item_id, inventory_item_id, quantity_used, demo_batch_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (menu_item_id, inventory_item_id) DO NOTHING
        `, [tenantId, menuItem.id, inv.id, qtyUsed, batchId]);
        summary.menu_item_ingredients++;

        // Also add to ingredientMap for AI velocity computation later
        if (!ingredientMap.has(menuItem.id)) ingredientMap.set(menuItem.id, []);
        ingredientMap.get(menuItem.id).push({
          inventory_item_id: inv.id,
          quantity_used: qtyUsed,
        });
      }
    }
  }

  // ─── 1. Generate Orders ──────────────────────────────────

  const generatedOrders = []; // { id, total, created_at, items[], employee_id }

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
      INSERT INTO order_payments (tenant_id, order_id, payment_method, amount, status)
      VALUES ($1, $2, $3, $4, 'completed')
    `, [tenantId, orderId, paymentMethod, total + tip]);
    summary.order_payments++;

    // Insert delivery order if applicable
    if (isDelivery && platform) {
      const commission = Math.round(total * (Number(platform.commission_percent) / 100) * 100) / 100;
      await adminSql.unsafe(`
        INSERT INTO delivery_orders (tenant_id, order_id, platform_id, external_order_id,
                                     customer_name, platform_status, platform_commission, created_at)
        VALUES ($1, $2, $3, $4, $5, 'delivered', $6, $7)
      `, [
        tenantId, orderId, platform.id,
        `DEL-${platform.name.toUpperCase()}-${randInt(10000, 99999)}`,
        `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
        commission, created_at.toISOString(),
      ]);
      summary.delivery_orders++;
    }

    generatedOrders.push({
      id: orderId,
      total: total + tip,
      created_at,
      items: orderItems,
      employee_id: employee.id,
    });
  }

  // ─── 2. Delivery Markup Rules ───────────────────────────

  if (includeDelivery && deliveryPlatforms.length > 0 && menuCategories.length > 0) {
    for (const platform of deliveryPlatforms) {
      const pKey = platform.name.toLowerCase().replace(/[\s-]/g, '_');
      const markup = PLATFORM_MARKUPS[pKey];
      if (!markup) continue;

      for (const cat of menuCategories) {
        await adminSql.unsafe(`
          INSERT INTO delivery_markup_rules (tenant_id, platform_id, category_id, markup_type, markup_value, active, demo_batch_id)
          VALUES ($1, $2, $3, 'percent', $4, true, $5)
          ON CONFLICT (tenant_id, platform_id, category_id) DO NOTHING
        `, [tenantId, platform.id, cat.id, markup, batchId]);
        summary.delivery_markup_rules++;
      }
    }
  }

  // ─── 3. Generate Loyalty Data ────────────────────────────

  if (includeLoyalty) {
    const customerCount = randInt(50, 100);
    const customers = [];

    for (let i = 0; i < customerCount; i++) {
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const [cust] = await adminSql.unsafe(`
        INSERT INTO loyalty_customers (tenant_id, name, phone, sms_opt_in, orders_count, total_spent, demo_batch_id)
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
          INSERT INTO stamp_cards (tenant_id, customer_id, stamps_earned, completed, redeemed, demo_batch_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [tenantId, custId, Math.min(stamps, 10), isComplete, isRedeemed, batchId]);
        summary.stamp_cards++;

        // Stamp events for some orders
        const eventCount = Math.min(stamps, 5);
        for (let e = 0; e < eventCount; e++) {
          const order = pick(generatedOrders);
          await adminSql.unsafe(`
            INSERT INTO stamp_events (tenant_id, stamp_card_id, order_id, stamps_added, event_type, demo_batch_id, created_at)
            VALUES ($1, $2, $3, 1, 'purchase', $4, $5)
          `, [tenantId, card.id, order.id, batchId, order.created_at.toISOString()]);
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
          INSERT INTO referral_events (tenant_id, referrer_id, referee_id, demo_batch_id)
          VALUES ($1, $2, $3, $4)
        `, [tenantId, referrer, referred, batchId]);
        summary.referral_events++;
      }
    }
  }

  // ─── 4. Generate AI Analytics ────────────────────────────

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

    for (const [, data] of hourlyMap) {
      const avgTicket = data.count > 0 ? Math.round((data.revenue / data.count) * 100) / 100 : 0;
      await adminSql.unsafe(`
        INSERT INTO ai_hourly_snapshots (tenant_id, snapshot_hour, order_count, revenue, avg_ticket, demo_batch_id)
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

    // AI Inventory Velocity — compute from orders + menu_item_ingredients
    if (ingredientMap.size > 0) {
      // Aggregate: date → Map<inventory_item_id, { qty, orders }>
      const velocityMap = new Map();
      for (const order of generatedOrders) {
        const dateKey = order.created_at.toISOString().split('T')[0];
        if (!velocityMap.has(dateKey)) velocityMap.set(dateKey, new Map());
        const dayMap = velocityMap.get(dateKey);

        for (const item of order.items) {
          const ingredients = ingredientMap.get(item.menu_item_id);
          if (!ingredients) continue;
          for (const ing of ingredients) {
            const existing = dayMap.get(ing.inventory_item_id) || { qty: 0, orders: 0 };
            existing.qty += ing.quantity_used * item.quantity;
            existing.orders++;
            dayMap.set(ing.inventory_item_id, existing);
          }
        }
      }

      for (const [dateKey, dayMap] of velocityMap) {
        for (const [invItemId, data] of dayMap) {
          await adminSql.unsafe(`
            INSERT INTO ai_inventory_velocity (tenant_id, inventory_item_id, date, quantity_used, orders_count, demo_batch_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (tenant_id, inventory_item_id, date) DO UPDATE
              SET quantity_used = EXCLUDED.quantity_used, orders_count = EXCLUDED.orders_count
          `, [tenantId, invItemId, dateKey, Math.round(data.qty * 100) / 100, data.orders, batchId]);
          summary.ai_inventory_velocity++;
        }
      }
    }

    // AI Suggestion Cache — generate 10-15 realistic entries
    const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

    // Upsell suggestions from top item pairs
    const topPairs = [...pairMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [key, count] of topPairs) {
      const [itemAId, itemBId] = key.split('-').map(Number);
      const itemA = menuItemMap.get(itemAId);
      const itemB = menuItemMap.get(itemBId);
      if (!itemA || !itemB) continue;

      await adminSql.unsafe(`
        INSERT INTO ai_suggestion_cache (tenant_id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, demo_batch_id)
        VALUES ($1, 'upsell', $2, $3, $4, NOW() + INTERVAL '24 hours', $5)
      `, [
        tenantId,
        `upsell-${itemAId}-${itemBId}`,
        JSON.stringify({
          item_a_id: itemAId, item_a_name: itemA.name,
          item_b_id: itemBId, item_b_name: itemB.name,
          pair_count: count,
          confidence: Math.round((0.6 + Math.random() * 0.3) * 100) / 100,
          message: `Customers who order ${itemA.name} often add ${itemB.name}`,
        }),
        randInt(70, 90),
        batchId,
      ]);
      summary.ai_suggestion_cache++;
    }

    // Inventory push suggestions
    const pushItems = shuffle(menuItems).slice(0, randInt(3, 4));
    for (const item of pushItems) {
      await adminSql.unsafe(`
        INSERT INTO ai_suggestion_cache (tenant_id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, demo_batch_id)
        VALUES ($1, 'inventory_push', $2, $3, $4, NOW() + INTERVAL '24 hours', $5)
      `, [
        tenantId,
        `push-${item.id}`,
        JSON.stringify({
          menu_item_id: item.id,
          name: item.name,
          price: Number(item.price),
          reason: 'Stock above optimal — promote as daily special',
        }),
        randInt(70, 85),
        batchId,
      ]);
      summary.ai_suggestion_cache++;
    }

    // Combo upgrade suggestions
    const comboItems = shuffle(menuItems).slice(0, randInt(2, 3));
    for (const item of comboItems) {
      await adminSql.unsafe(`
        INSERT INTO ai_suggestion_cache (tenant_id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, demo_batch_id)
        VALUES ($1, 'combo_upgrade', $2, $3, $4, NOW() + INTERVAL '24 hours', $5)
      `, [
        tenantId,
        `combo-${item.id}`,
        JSON.stringify({
          trigger_item_id: item.id,
          trigger_item_name: item.name,
          savings_percent: randInt(10, 20),
          message: `Suggest combo upgrade when customer orders ${item.name} separately`,
        }),
        randInt(60, 80),
        batchId,
      ]);
      summary.ai_suggestion_cache++;
    }

    // Dynamic pricing suggestions
    const pricingCount = randInt(1, 2);
    for (let p = 0; p < pricingCount; p++) {
      const window = p === 0 ? '19:00-21:00' : '12:00-14:00';
      const label = p === 0 ? 'dinner' : 'lunch';
      await adminSql.unsafe(`
        INSERT INTO ai_suggestion_cache (tenant_id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, demo_batch_id)
        VALUES ($1, 'dynamic_pricing', $2, $3, $4, NOW() + INTERVAL '24 hours', $5)
      `, [
        tenantId,
        `pricing-${label}`,
        JSON.stringify({
          time_window: window,
          demand_increase_percent: randInt(30, 50),
          suggested_action: `${label.charAt(0).toUpperCase() + label.slice(1)} peak shows ${randInt(30, 50)}% higher demand — consider surge pricing`,
        }),
        randInt(60, 75),
        batchId,
      ]);
      summary.ai_suggestion_cache++;
    }

    // AI Category Roles
    if (menuCategories.length > 0) {
      for (const cat of menuCategories) {
        const role = getCategoryRole(cat.name);
        await adminSql.unsafe(`
          INSERT INTO ai_category_roles (tenant_id, category_id, role)
          VALUES ($1, $2, $3)
          ON CONFLICT (tenant_id, category_id) DO UPDATE SET role = $3
        `, [tenantId, cat.id, role]);
        summary.ai_category_roles++;
      }
    }
  }

  // ─── 5. Generate Financial Data ──────────────────────────

  if (includeFinancials) {
    // Financial actuals — monthly for past 3-6 months
    const months = randInt(3, 6);
    const now = new Date();
    for (let m = 0; m < months; m++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const yearMonth = monthDate.toISOString().slice(0, 7);

      for (const line of FINANCIAL_LINES) {
        const amount = randFloat(line.min, line.max);
        await adminSql.unsafe(`
          INSERT INTO financial_actuals (tenant_id, period, category, amount, demo_batch_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [tenantId, yearMonth, line.category, amount, batchId]);
        summary.financial_actuals++;
      }
    }

    // Financial targets — budget percentages
    for (const target of FINANCIAL_TARGETS) {
      await adminSql.unsafe(`
        INSERT INTO financial_targets (tenant_id, category, target_percent)
        VALUES ($1, $2, $3)
        ON CONFLICT (tenant_id, category) DO UPDATE SET target_percent = $3
      `, [tenantId, target.category, target.target_percent]);
      summary.financial_targets++;
    }
  }

  // ─── 6. Generate Waste Log ────────────────────────────────

  if (inventoryItems.length > 0) {
    const wasteCount = randInt(40, 60);
    for (let i = 0; i < wasteCount; i++) {
      const item = pick(inventoryItems);
      const { reason } = pickWeighted(WASTE_REASONS);
      const quantity = randFloat(0.5, 5);
      const costPrice = Number(item.cost_price) || 10;
      const costAtTime = Math.round(quantity * costPrice * 100) / 100;
      const timestamp = randomTimestamp(dateRangeDays);
      const employee = pick(employees);

      await adminSql.unsafe(`
        INSERT INTO waste_log (tenant_id, inventory_item_id, quantity, unit, reason, cost_at_time, logged_by, created_at, demo_batch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [tenantId, item.id, quantity, item.unit || 'unit', reason, costAtTime, employee.id, timestamp.toISOString(), batchId]);
      summary.waste_log++;
    }
  }

  // ─── 7. Generate Inventory Counts & Shrinkage Alerts ──────

  if (inventoryItems.length > 0) {
    const sessionCount = randInt(2, 3);
    for (let s = 0; s < sessionCount; s++) {
      // Spread sessions across the month
      const sessionDaysBack = Math.round(((s + 1) / (sessionCount + 1)) * dateRangeDays);
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - sessionDaysBack);
      sessionDate.setHours(randInt(9, 16), randInt(0, 59), 0);

      // Count 60-80% of inventory items
      const countPct = randFloat(0.6, 0.8);
      const itemsToCount = shuffle(inventoryItems).slice(0, Math.ceil(inventoryItems.length * countPct));

      // Pre-select items for significant variance
      const shrinkageIndices = new Set();
      const shrinkageCount = Math.min(randInt(2, 3), itemsToCount.length);
      while (shrinkageIndices.size < shrinkageCount) {
        shrinkageIndices.add(randInt(0, itemsToCount.length - 1));
      }
      const overCountIndex = randInt(0, itemsToCount.length - 1);

      for (let idx = 0; idx < itemsToCount.length; idx++) {
        const item = itemsToCount[idx];
        const sysQty = Number(item.quantity) || 10;

        let variancePct;
        if (shrinkageIndices.has(idx) && idx !== overCountIndex) {
          variancePct = randFloat(-15, -8); // significant shrinkage
        } else if (idx === overCountIndex && !shrinkageIndices.has(idx)) {
          variancePct = randFloat(3, 7); // over-count
        } else {
          variancePct = randFloat(-3, 3); // normal
        }

        const countedQty = Math.max(0, Math.round(sysQty * (1 + variancePct / 100) * 100) / 100);
        const variance = Math.round((countedQty - sysQty) * 100) / 100;
        const variancePercent = sysQty > 0 ? Math.round((variance / sysQty) * 10000) / 100 : 0;
        const employee = pick(employees);

        await adminSql.unsafe(`
          INSERT INTO inventory_counts (tenant_id, inventory_item_id, counted_quantity, system_quantity, variance, variance_percent, counted_by, created_at, demo_batch_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [tenantId, item.id, countedQty, sysQty, variance, variancePercent, employee.id, sessionDate.toISOString(), batchId]);
        summary.inventory_counts++;

        // Generate shrinkage alert for high-variance items
        if (Math.abs(variancePercent) > 7) {
          const severity = Math.abs(variancePercent) > 12 ? 'high' : 'medium';
          const direction = variance < 0 ? 'shrinkage' : 'surplus';
          await adminSql.unsafe(`
            INSERT INTO shrinkage_alerts (tenant_id, inventory_item_id, alert_type, severity, message, variance_amount, created_at, demo_batch_id)
            VALUES ($1, $2, 'variance', $3, $4, $5, $6, $7)
          `, [
            tenantId, item.id, severity,
            `Significant ${direction} detected: ${item.name} (${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%)`,
            variance, sessionDate.toISOString(), batchId,
          ]);
          summary.shrinkage_alerts++;
        }
      }
    }
  }

  // ─── 8. Generate Vendors & Purchase Orders ────────────────

  if (inventoryItems.length > 0) {
    // Create vendors and assign inventory items
    const vendorIds = [];
    const vendorItemsMap = new Map(); // vendorIndex → [inventory_items]

    // Assign each inventory item to a vendor
    for (const item of inventoryItems) {
      const vIdx = matchVendor(item.name);
      if (!vendorItemsMap.has(vIdx)) vendorItemsMap.set(vIdx, []);
      vendorItemsMap.get(vIdx).push(item);
    }

    // Create vendors
    for (let v = 0; v < VENDOR_TEMPLATES.length; v++) {
      const tpl = VENDOR_TEMPLATES[v];
      const items = vendorItemsMap.get(v) || [];
      if (items.length === 0) continue;

      const [vendor] = await adminSql.unsafe(`
        INSERT INTO vendors (tenant_id, name, contact_name, phone, active, demo_batch_id)
        VALUES ($1, $2, $3, $4, true, $5)
        RETURNING id
      `, [tenantId, tpl.name, tpl.contact, tpl.phone, batchId]);
      vendorIds.push({ id: vendor.id, items, templateIndex: v });
      summary.vendors++;

      // Link vendor_items
      for (const item of items) {
        const unitCost = Number(item.cost_price) || randFloat(10, 80);
        await adminSql.unsafe(`
          INSERT INTO vendor_items (tenant_id, vendor_id, inventory_item_id, unit_cost, lead_time_days, min_order_qty)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (vendor_id, inventory_item_id) DO NOTHING
        `, [tenantId, vendor.id, item.id, unitCost, randInt(1, 5), randInt(1, 10)]);
      }
    }

    // Create purchase orders
    if (vendorIds.length > 0) {
      const poConfigs = [
        { weeksAgo: 4, status: 'received', receivedPct: 1.0 },
        { weeksAgo: 3, status: 'received', receivedPct: 1.0 },
        { weeksAgo: 2, status: 'received', receivedPct: 1.0 },
        { weeksAgo: 2, status: 'received', receivedPct: 1.0 },
        { weeksAgo: 1, status: 'partial', receivedPct: 0.7 },
        { weeksAgo: 0, status: 'submitted', receivedPct: 0 },
        { weeksAgo: 0, status: 'draft', receivedPct: 0 },
      ];

      let poSeq = 1;
      for (const cfg of poConfigs) {
        const vendor = pick(vendorIds);
        if (vendor.items.length === 0) continue;

        const poDate = new Date();
        poDate.setDate(poDate.getDate() - cfg.weeksAgo * 7);
        poDate.setHours(randInt(9, 17), randInt(0, 59), 0);

        const dateStr = poDate.toISOString().split('T')[0].replace(/-/g, '');
        const poNumber = `PO-${dateStr}-${String(poSeq++).padStart(3, '0')}`;

        const submittedAt = cfg.status !== 'draft' ? poDate.toISOString() : null;
        const receivedAt = (cfg.status === 'received' || cfg.status === 'partial')
          ? new Date(poDate.getTime() + randInt(1, 3) * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const [po] = await adminSql.unsafe(`
          INSERT INTO purchase_orders (tenant_id, po_number, vendor_id, status, total_amount, created_by, submitted_at, received_at, created_at, demo_batch_id)
          VALUES ($1, $2, $3, $4, 0, $5, $6, $7, $8, $9)
          RETURNING id
        `, [tenantId, poNumber, vendor.id, cfg.status, pick(employees).id, submittedAt, receivedAt, poDate.toISOString(), batchId]);
        summary.purchase_orders++;

        // Add 3-5 line items
        const lineCount = randInt(3, Math.min(5, vendor.items.length));
        const lineItems = shuffle(vendor.items).slice(0, lineCount);
        let poTotal = 0;

        for (const item of lineItems) {
          const qtyOrdered = randInt(5, 50);
          const unitCost = Number(item.cost_price) || randFloat(10, 80);
          const qtyReceived = cfg.receivedPct > 0
            ? Math.round(qtyOrdered * cfg.receivedPct * (cfg.status === 'partial' ? randFloat(0.5, 0.9) : 1))
            : 0;
          const lineTotal = Math.round(qtyOrdered * unitCost * 100) / 100;
          poTotal += lineTotal;

          await adminSql.unsafe(`
            INSERT INTO purchase_order_items (tenant_id, po_id, inventory_item_id, quantity_ordered, unit_cost, quantity_received, line_total)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [tenantId, po.id, item.id, qtyOrdered, unitCost, qtyReceived, lineTotal]);
          summary.purchase_order_items++;
        }

        // Update PO total
        await adminSql.unsafe(`UPDATE purchase_orders SET total_amount = $1 WHERE id = $2`, [poTotal, po.id]);
      }
    }
  }

  // ─── 9. Generate Refunds ──────────────────────────────────

  if (generatedOrders.length > 0) {
    const refundCount = randInt(3, 5);
    const refundOrders = shuffle(generatedOrders).slice(0, refundCount);

    for (let i = 0; i < refundOrders.length; i++) {
      const order = refundOrders[i];
      const isFull = i < 2; // first 1-2 are full refunds
      const refundType = isFull ? 'full' : 'partial';
      const amount = isFull
        ? order.total
        : Math.round(order.total * randFloat(0.30, 0.50) * 100) / 100;

      await adminSql.unsafe(`
        INSERT INTO refunds (tenant_id, order_id, amount, reason, refund_type, refunded_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        tenantId, order.id, amount,
        pick(REFUND_REASONS), refundType,
        pick(employees).id,
        order.created_at.toISOString(),
      ]);
      summary.refunds++;
    }
  }

  // ─── 10. Auto-Trigger AI Pipeline ─────────────────────────
  // Run shrinkage detection and waste analysis with proper tenant RLS context

  try {
    const { tenantSql } = await import('../db/index.js');
    await tenantSql.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      await new Promise((resolve, reject) => {
        tenantContext.run({ conn: tx, tenantId }, async () => {
          try {
            await detectShrinkagePatterns();
            await analyzeWastePatterns();
            resolve();
          } catch (e) { reject(e); }
        });
      });
    });
    console.log('[DemoData] AI pipeline triggered successfully');
  } catch (err) {
    console.warn('[DemoData] AI pipeline trigger failed (non-fatal):', err.message);
  }

  return summary;
}
