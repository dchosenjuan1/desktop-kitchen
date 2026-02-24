import { Router } from 'express';
import { all, get, run, getConn } from '../db/index.js';
import { recordOrderItemPairs } from '../ai/data-pipeline.js';
import { requireAuth } from '../middleware/auth.js';
import { audit } from '../lib/auditLog.js';

const router = Router();

const TAX_RATE = 0.16; // 16% IVA (Mexico) — prices already include tax

async function generateOrderNumber() {
  const conn = getConn();
  const dateStr = new Date().toISOString().split('T')[0];
  const dateNum = parseInt(dateStr.replace(/-/g, '')) * 1000;

  const [row] = await conn.unsafe(`
    SELECT pg_advisory_xact_lock(hashtext($1::text)),
           COALESCE(MAX(order_number), $2::int) + 1 AS order_number
    FROM orders
    WHERE created_at::date = $1::date
  `, [dateStr, dateNum]);

  return row.order_number;
}

// GET /api/orders - list orders (optional ?status, ?date filters)
router.get('/', async (req, res) => {
  try {
    const { status, date, payment_status } = req.query;
    let query = `
      SELECT o.id, o.order_number, o.employee_id, o.status, o.subtotal, o.tax, o.tip, o.total,
             o.payment_status, o.payment_method, o.paid_at, o.source, o.created_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (status) {
      query += ` AND o.status = $${paramIdx++}`;
      params.push(status);
    }

    if (payment_status) {
      query += ` AND o.payment_status = $${paramIdx++}`;
      params.push(payment_status);
    }

    if (date) {
      query += ` AND o.created_at::date = $${paramIdx++}`;
      params.push(date);
    }

    query += ' ORDER BY o.created_at DESC LIMIT 100';

    const orders = await all(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - single order with items
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const order = await get(`
      SELECT o.id, o.order_number, o.employee_id, o.status, o.subtotal, o.tax, o.tip, o.total,
             o.payment_intent_id, o.payment_status, o.payment_method, o.source, o.created_at, o.completed_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE o.id = $1
    `, [id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await all(`
      SELECT id, order_id, menu_item_id, item_name, quantity, unit_price, notes, combo_instance_id
      FROM order_items
      WHERE order_id = $1
    `, [id]);

    // Attach modifiers to each item
    const itemsWithModifiers = [];
    for (const item of items) {
      const modifiers = await all(`
        SELECT id, modifier_id, modifier_name, price_adjustment
        FROM order_item_modifiers
        WHERE order_item_id = $1
      `, [item.id]);
      itemsWithModifiers.push({ ...item, modifiers });
    }

    res.json({ ...order, items: itemsWithModifiers });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - create order
router.post('/', requireAuth('pos_access'), async (req, res) => {
  try {
    const { employee_id, items, offline_temp_id } = req.body;

    if (!employee_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Idempotent dedup: if offline_temp_id already exists, return existing order
    if (offline_temp_id) {
      const existing = await get(`
        SELECT o.id, o.order_number, o.employee_id, o.status, o.subtotal, o.tax, o.tip, o.total,
               o.payment_status, o.payment_method, o.source, o.created_at
        FROM orders o WHERE o.offline_temp_id = $1
      `, [offline_temp_id]);
      if (existing) {
        const existingItems = await all(`
          SELECT id, order_id, menu_item_id, item_name, quantity, unit_price, notes, combo_instance_id
          FROM order_items WHERE order_id = $1
        `, [existing.id]);
        return res.status(200).json({ ...existing, items: existingItems });
      }
    }

    // Validate item quantities
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for item ${item.menu_item_id}. Quantity must be greater than 0.` });
      }
    }

    // Verify employee exists
    const employee = await get('SELECT id FROM employees WHERE id = $1', [employee_id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Calculate totals (prices include IVA)
    let itemsTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await get('SELECT id, name, price FROM menu_items WHERE id = $1', [item.menu_item_id]);
      if (!menuItem) {
        return res.status(404).json({ error: `Menu item ${item.menu_item_id} not found` });
      }

      // Calculate modifier price adjustments
      let modifierTotal = 0;
      const resolvedModifiers = [];
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modId of item.modifiers) {
          const mod = await get('SELECT id, name, price_adjustment FROM modifiers WHERE id = $1', [modId]);
          if (mod) {
            modifierTotal += mod.price_adjustment;
            resolvedModifiers.push(mod);
          }
        }
      }

      // Resolve brand-specific name/price if virtual_brand_id present
      let itemName = menuItem.name;
      let basePrice = menuItem.price;
      const virtualBrandId = item.virtual_brand_id || null;

      if (virtualBrandId) {
        const brandItem = await get(
          'SELECT custom_name, custom_price FROM virtual_brand_items WHERE virtual_brand_id = $1 AND menu_item_id = $2',
          [virtualBrandId, item.menu_item_id]
        );
        if (brandItem) {
          if (brandItem.custom_name) itemName = brandItem.custom_name;
          if (brandItem.custom_price != null) basePrice = brandItem.custom_price;
        }
      }

      const unitPrice = basePrice + modifierTotal;
      const itemTotal = unitPrice * item.quantity;
      itemsTotal += itemTotal;

      orderItems.push({
        menu_item_id: item.menu_item_id,
        item_name: itemName,
        quantity: item.quantity,
        unit_price: unitPrice,
        notes: item.notes || null,
        combo_instance_id: item.combo_instance_id || null,
        modifiers: resolvedModifiers,
        virtual_brand_id: virtualBrandId,
      });
    }

    // Prices already include IVA — extract tax from the total
    const total = itemsTotal; // what the customer pays (IVA included)
    const tax = Math.round((total - total / (1 + TAX_RATE)) * 100) / 100;
    const subtotal = Math.round((total - tax) * 100) / 100;
    const orderNumber = await generateOrderNumber();

    // Create order
    const result = await run(`
      INSERT INTO orders (order_number, employee_id, status, subtotal, tax, total, payment_status, offline_temp_id)
      VALUES ($1, $2, 'pending', $3, $4, $5, 'unpaid', $6)
    `, [orderNumber, employee_id, subtotal, tax, total, offline_temp_id || null]);

    const orderId = result.lastInsertRowid;

    // Insert order items and their modifiers
    for (const item of orderItems) {
      const itemResult = await run(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, notes, combo_instance_id, virtual_brand_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [orderId, item.menu_item_id, item.item_name, item.quantity, item.unit_price, item.notes, item.combo_instance_id, item.virtual_brand_id || null]);

      const orderItemId = itemResult.lastInsertRowid;

      // Insert selected modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          await run(`
            INSERT INTO order_item_modifiers (order_item_id, modifier_id, modifier_name, price_adjustment)
            VALUES ($1, $2, $3, $4)
          `, [orderItemId, mod.id, mod.name, mod.price_adjustment]);
        }
      }
    }

    // Fire-and-forget: record item pairs for AI analysis
    setImmediate(() => recordOrderItemPairs(orderId));

    audit({
      tenantId: req.tenant?.id || 'default',
      actorType: 'employee',
      actorId: String(employee_id),
      action: 'create',
      resource: 'order',
      resourceId: String(orderId),
      ip: req.ip,
    });

    res.status(201).json({
      id: orderId,
      order_number: orderNumber,
      employee_id,
      status: 'pending',
      subtotal,
      tax,
      tip: 0,
      total,
      payment_status: 'unpaid',
      items: orderItems,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id/status - update status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await get('SELECT id, status FROM orders WHERE id = $1', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Enforce valid status transitions
    const validTransitions = {
      pending:    ['confirmed', 'preparing', 'cancelled'],
      confirmed:  ['preparing', 'cancelled'],
      preparing:  ['ready', 'cancelled'],
      ready:      ['completed', 'cancelled'],
      completed:  [],
      cancelled:  [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot transition from '${order.status}' to '${status}'`,
      });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await run(`
      UPDATE orders
      SET status = $1, completed_at = $2
      WHERE id = $3
    `, [status, completedAt, id]);

    res.json({ id, status });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /api/orders/kitchen/active - get pending+preparing orders for kitchen display
router.get('/kitchen/active', async (req, res) => {
  try {
    const orders = await all(`
      SELECT o.id, o.order_number, o.status, o.payment_method, o.source, o.created_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE o.status IN ('pending', 'confirmed', 'preparing')
      ORDER BY o.created_at ASC
    `);

    // Get detailed items for each order (with modifiers and combo info)
    const ordersWithItems = [];
    for (const order of orders) {
      const items = await all(`
        SELECT oi.id, oi.item_name, oi.quantity, oi.notes, oi.combo_instance_id,
               oi.virtual_brand_id, vb.name as brand_name, vb.primary_color as brand_color
        FROM order_items oi
        LEFT JOIN virtual_brands vb ON oi.virtual_brand_id = vb.id
        WHERE oi.order_id = $1
      `, [order.id]);

      const itemsWithModifiers = [];
      for (const item of items) {
        const modifiers = await all(`
          SELECT modifier_name, price_adjustment
          FROM order_item_modifiers
          WHERE order_item_id = $1
        `, [item.id]);
        itemsWithModifiers.push({ ...item, modifiers });
      }

      ordersWithItems.push({ ...order, items: itemsWithModifiers });
    }

    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen orders' });
  }
});

// PATCH /api/orders/:id/payment - confirm payment on an existing order
router.patch('/:id/payment', requireAuth('pos_access'), async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, reference } = req.body;

    const validMethods = ['cash', 'card', 'transfer'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment_method. Must be cash, card, or transfer.' });
    }

    const order = await get(
      'SELECT id, status, payment_status, total FROM orders WHERE id = $1',
      [id]
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'paid' || order.payment_status === 'completed') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    const now = new Date().toISOString();

    await run(`
      UPDATE orders
      SET payment_status = 'paid', payment_method = $1, paid_at = $2
      WHERE id = $3
    `, [payment_method, now, id]);

    const updated = await get(`
      SELECT o.id, o.order_number, o.employee_id, o.status, o.subtotal, o.tax, o.tip, o.total,
             o.payment_status, o.payment_method, o.paid_at, o.source, o.created_at, o.completed_at,
             e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE o.id = $1
    `, [id]);

    res.json({ success: true, order: updated });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

export default router;
