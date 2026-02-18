import { Router } from 'express';
import { all, get, run } from '../db.js';
import { recordOrderItemPairs } from '../ai/data-pipeline.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const TAX_RATE = 0.16; // 16% IVA (Mexico) — prices already include tax

function generateOrderNumber() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Get today's order count
  const lastOrder = get(`
    SELECT MAX(order_number) as max_order
    FROM orders
    WHERE created_at LIKE ?
  `, [dateStr + '%']);

  const lastNum = lastOrder?.max_order || 0;
  const dayNum = lastNum % 1000;

  return parseInt(dateStr.replace(/-/g, '')) * 1000 + dayNum + 1;
}

// GET /api/orders - list orders (optional ?status, ?date filters)
router.get('/', (req, res) => {
  try {
    const { status, date } = req.query;
    let query = `
      SELECT o.id, o.order_number, o.employee_id, o.status, o.subtotal, o.tax, o.tip, o.total,
             o.payment_status, o.payment_method, o.source, o.created_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND DATE(o.created_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY o.created_at DESC LIMIT 100';

    const orders = all(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id - single order with items
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const order = get(`
      SELECT o.id, o.order_number, o.employee_id, o.status, o.subtotal, o.tax, o.tip, o.total,
             o.payment_intent_id, o.payment_status, o.payment_method, o.source, o.created_at, o.completed_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE o.id = ?
    `, [id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = all(`
      SELECT id, order_id, menu_item_id, item_name, quantity, unit_price, notes, combo_instance_id
      FROM order_items
      WHERE order_id = ?
    `, [id]);

    // Attach modifiers to each item
    const itemsWithModifiers = items.map(item => {
      const modifiers = all(`
        SELECT id, modifier_id, modifier_name, price_adjustment
        FROM order_item_modifiers
        WHERE order_item_id = ?
      `, [item.id]);
      return { ...item, modifiers };
    });

    res.json({ ...order, items: itemsWithModifiers });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - create order
router.post('/', requireAuth('pos_access'), (req, res) => {
  try {
    const { employee_id, items } = req.body;

    if (!employee_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate item quantities
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for item ${item.menu_item_id}. Quantity must be greater than 0.` });
      }
    }

    // Verify employee exists
    const employee = get('SELECT id FROM employees WHERE id = ?', [employee_id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Calculate totals (prices include IVA)
    let itemsTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = get('SELECT id, name, price FROM menu_items WHERE id = ?', [item.menu_item_id]);
      if (!menuItem) {
        return res.status(404).json({ error: `Menu item ${item.menu_item_id} not found` });
      }

      // Calculate modifier price adjustments
      let modifierTotal = 0;
      const resolvedModifiers = [];
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modId of item.modifiers) {
          const mod = get('SELECT id, name, price_adjustment FROM modifiers WHERE id = ?', [modId]);
          if (mod) {
            modifierTotal += mod.price_adjustment;
            resolvedModifiers.push(mod);
          }
        }
      }

      const unitPrice = menuItem.price + modifierTotal;
      const itemTotal = unitPrice * item.quantity;
      itemsTotal += itemTotal;

      orderItems.push({
        menu_item_id: item.menu_item_id,
        item_name: menuItem.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        notes: item.notes || null,
        combo_instance_id: item.combo_instance_id || null,
        modifiers: resolvedModifiers,
      });
    }

    // Prices already include IVA — extract tax from the total
    const total = itemsTotal; // what the customer pays (IVA included)
    const tax = Math.round((total - total / (1 + TAX_RATE)) * 100) / 100;
    const subtotal = Math.round((total - tax) * 100) / 100;
    const orderNumber = generateOrderNumber();

    // Create order
    const result = run(`
      INSERT INTO orders (order_number, employee_id, status, subtotal, tax, total, payment_status)
      VALUES (?, ?, 'pending', ?, ?, ?, 'unpaid')
    `, [orderNumber, employee_id, subtotal, tax, total]);

    const orderId = result.lastInsertRowid;

    // Insert order items and their modifiers
    for (const item of orderItems) {
      const itemResult = run(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, notes, combo_instance_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [orderId, item.menu_item_id, item.item_name, item.quantity, item.unit_price, item.notes, item.combo_instance_id]);

      const orderItemId = itemResult.lastInsertRowid;

      // Insert selected modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          run(`
            INSERT INTO order_item_modifiers (order_item_id, modifier_id, modifier_name, price_adjustment)
            VALUES (?, ?, ?, ?)
          `, [orderItemId, mod.id, mod.name, mod.price_adjustment]);
        }
      }
    }

    // Fire-and-forget: record item pairs for AI analysis
    setImmediate(() => recordOrderItemPairs(orderId));

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
router.put('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = get('SELECT id, status FROM orders WHERE id = ?', [id]);
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

    run(`
      UPDATE orders
      SET status = ?, completed_at = ?
      WHERE id = ?
    `, [status, completedAt, id]);

    res.json({ id, status });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /api/orders/kitchen/active - get pending+preparing orders for kitchen display
router.get('/kitchen/active', (req, res) => {
  try {
    const orders = all(`
      SELECT o.id, o.order_number, o.status, o.payment_method, o.source, o.created_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE o.status IN ('pending', 'confirmed', 'preparing')
      ORDER BY o.created_at ASC
    `);

    // Get detailed items for each order (with modifiers and combo info)
    const ordersWithItems = orders.map(order => {
      const items = all(`
        SELECT id, item_name, quantity, notes, combo_instance_id
        FROM order_items
        WHERE order_id = ?
      `, [order.id]);

      const itemsWithModifiers = items.map(item => {
        const modifiers = all(`
          SELECT modifier_name, price_adjustment
          FROM order_item_modifiers
          WHERE order_item_id = ?
        `, [item.id]);
        return { ...item, modifiers };
      });

      return { ...order, items: itemsWithModifiers };
    });

    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen orders' });
  }
});

export default router;
