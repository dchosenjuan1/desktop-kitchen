import { Router } from 'express';
import { all, get, run } from '../db.js';
import { recordOrderItemPairs } from '../ai/data-pipeline.js';

const router = Router();

const TAX_RATE = 0.16; // 16% IVA (Mexico)

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
             o.payment_status, o.created_at, e.name as employee_name
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
             o.payment_intent_id, o.payment_status, o.created_at, o.completed_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE o.id = ?
    `, [id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = all(`
      SELECT id, order_id, menu_item_id, item_name, quantity, unit_price, notes
      FROM order_items
      WHERE order_id = ?
    `, [id]);

    res.json({ ...order, items });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - create order
router.post('/', (req, res) => {
  try {
    const { employee_id, items } = req.body;

    if (!employee_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify employee exists
    const employee = get('SELECT id FROM employees WHERE id = ?', [employee_id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = get('SELECT id, name, price FROM menu_items WHERE id = ?', [item.menu_item_id]);
      if (!menuItem) {
        return res.status(404).json({ error: `Menu item ${item.menu_item_id} not found` });
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menu_item_id: item.menu_item_id,
        item_name: menuItem.name,
        quantity: item.quantity,
        unit_price: menuItem.price,
        notes: item.notes || null,
      });
    }

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = subtotal + tax;
    const orderNumber = generateOrderNumber();

    // Create order
    const result = run(`
      INSERT INTO orders (order_number, employee_id, status, subtotal, tax, total, payment_status)
      VALUES (?, ?, 'pending', ?, ?, ?, 'unpaid')
    `, [orderNumber, employee_id, subtotal, tax, total]);

    const orderId = result.lastInsertRowid;

    // Insert order items
    for (const item of orderItems) {
      run(`
        INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orderId, item.menu_item_id, item.item_name, item.quantity, item.unit_price, item.notes]);
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

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = get('SELECT id FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
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
      SELECT o.id, o.order_number, o.status, o.created_at, e.name as employee_name
      FROM orders o
      JOIN employees e ON o.employee_id = e.id
      WHERE o.status IN ('pending', 'preparing')
      ORDER BY o.created_at ASC
    `);

    // Get detailed items for each order
    const ordersWithItems = orders.map(order => {
      const items = all(`
        SELECT item_name, quantity, notes
        FROM order_items
        WHERE order_id = ?
      `, [order.id]);
      return { ...order, items };
    });

    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen orders' });
  }
});

export default router;
