import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { logRestockEvent } from '../ai/data-pipeline.js';

const router = Router();

// GET /api/inventory - list all inventory items
router.get('/', (req, res) => {
  try {
    const items = all(`
      SELECT id, name, quantity, unit, low_stock_threshold, category, last_counted_at
      FROM inventory_items
      ORDER BY category ASC, name ASC
    `);

    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// GET /api/inventory/low-stock - items below threshold
router.get('/low-stock', (req, res) => {
  try {
    const items = all(`
      SELECT id, name, quantity, unit, low_stock_threshold, category
      FROM inventory_items
      WHERE quantity < low_stock_threshold
      ORDER BY category ASC, name ASC
    `);

    res.json(items);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// GET /api/inventory/counts - count history
router.get('/counts', (req, res) => {
  try {
    const { item_id, start_date, end_date } = req.query;
    let query = `
      SELECT ic.*, ii.name as item_name, ii.unit, e.name as counted_by_name
      FROM inventory_counts ic
      JOIN inventory_items ii ON ic.inventory_item_id = ii.id
      LEFT JOIN employees e ON ic.counted_by = e.id
      WHERE 1=1
    `;
    const params = [];

    if (item_id) {
      query += ' AND ic.inventory_item_id = ?';
      params.push(item_id);
    }
    if (start_date) {
      query += ' AND DATE(ic.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(ic.created_at) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY ic.created_at DESC LIMIT 200';

    const counts = all(query, params);
    res.json(counts);
  } catch (error) {
    console.error('Error fetching inventory counts:', error);
    res.status(500).json({ error: 'Failed to fetch inventory counts' });
  }
});

// GET /api/inventory/variance-report - aggregated variance
router.get('/variance-report', (req, res) => {
  try {
    const report = all(`
      SELECT
        ii.id as inventory_item_id,
        ii.name,
        ii.unit,
        ii.category,
        COUNT(ic.id) as count_sessions,
        ROUND(AVG(ic.variance), 2) as avg_variance,
        ROUND(AVG(ic.variance_percent), 2) as avg_variance_percent,
        ROUND(SUM(ic.variance), 2) as total_variance,
        MAX(ic.created_at) as last_counted
      FROM inventory_items ii
      LEFT JOIN inventory_counts ic ON ii.id = ic.inventory_item_id
      GROUP BY ii.id
      HAVING count_sessions > 0
      ORDER BY ABS(avg_variance_percent) DESC
    `);

    res.json(report);
  } catch (error) {
    console.error('Error fetching variance report:', error);
    res.status(500).json({ error: 'Failed to fetch variance report' });
  }
});

// GET /api/inventory/shrinkage-alerts - active alerts
router.get('/shrinkage-alerts', (req, res) => {
  try {
    const { acknowledged } = req.query;
    let query = `
      SELECT sa.*, ii.name as item_name, ii.unit
      FROM shrinkage_alerts sa
      JOIN inventory_items ii ON sa.inventory_item_id = ii.id
    `;
    const params = [];

    if (acknowledged === '0' || acknowledged === 'false') {
      query += ' WHERE sa.acknowledged = 0';
    } else if (acknowledged === '1' || acknowledged === 'true') {
      query += ' WHERE sa.acknowledged = 1';
    }

    query += ' ORDER BY sa.created_at DESC LIMIT 100';

    const alerts = all(query, params);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching shrinkage alerts:', error);
    res.status(500).json({ error: 'Failed to fetch shrinkage alerts' });
  }
});

// PUT /api/inventory/shrinkage-alerts/:id/acknowledge
router.put('/shrinkage-alerts/:id/acknowledge', requireAuth('manage_inventory'), (req, res) => {
  try {
    const { id } = req.params;
    const alert = get('SELECT id FROM shrinkage_alerts WHERE id = ?', [id]);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    const employeeId = req.employee?.id || null;
    run('UPDATE shrinkage_alerts SET acknowledged = 1, acknowledged_by = ? WHERE id = ?', [employeeId, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// POST /api/inventory/:id/count - record physical count
router.post('/:id/count', requireAuth('manage_inventory'), (req, res) => {
  try {
    const { id } = req.params;
    const { counted_quantity, notes } = req.body;

    if (counted_quantity === undefined || counted_quantity < 0) {
      return res.status(400).json({ error: 'Invalid counted quantity' });
    }

    const item = get('SELECT id, name, quantity FROM inventory_items WHERE id = ?', [id]);
    if (!item) return res.status(404).json({ error: 'Inventory item not found' });

    const systemQty = item.quantity;
    const variance = counted_quantity - systemQty;
    const variancePercent = systemQty > 0 ? Math.round((variance / systemQty) * 10000) / 100 : 0;
    const employeeId = req.employee?.id || null;

    // Record the count
    const result = run(`
      INSERT INTO inventory_counts (inventory_item_id, counted_quantity, system_quantity, variance, variance_percent, counted_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, counted_quantity, systemQty, variance, variancePercent, employeeId, notes || null]);

    // Update the system quantity to match the count
    run('UPDATE inventory_items SET quantity = ?, last_counted_at = datetime("now","localtime") WHERE id = ?',
      [counted_quantity, id]);

    // Create shrinkage alert if variance > 10%
    if (Math.abs(variancePercent) > 10) {
      const severity = Math.abs(variancePercent) > 25 ? 'high' : 'medium';
      const alertType = variance < 0 ? 'shrinkage' : 'surplus';
      run(`
        INSERT INTO shrinkage_alerts (inventory_item_id, alert_type, severity, message, variance_amount)
        VALUES (?, ?, ?, ?, ?)
      `, [
        id, alertType, severity,
        `${item.name}: ${alertType} of ${Math.abs(variance).toFixed(2)} units (${Math.abs(variancePercent)}% variance)`,
        variance,
      ]);
    }

    res.json({
      id: result.lastInsertRowid,
      inventory_item_id: parseInt(id),
      counted_quantity,
      system_quantity: systemQty,
      variance,
      variance_percent: variancePercent,
    });
  } catch (error) {
    console.error('Error recording inventory count:', error);
    res.status(500).json({ error: 'Failed to record inventory count' });
  }
});

// PUT /api/inventory/:id - update quantity
router.put('/:id', requireAuth('manage_inventory'), (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Missing quantity' });
    }

    const item = get('SELECT id FROM inventory_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    run(`
      UPDATE inventory_items
      SET quantity = ?
      WHERE id = ?
    `, [quantity, id]);

    res.json({ id, quantity });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// POST /api/inventory/:id/restock - add to quantity
router.post('/:id/restock', requireAuth('manage_inventory'), (req, res) => {
  try {
    const { id } = req.params;
    const amount = req.body.quantity ?? req.body.amount;

    if (amount === undefined || amount <= 0) {
      return res.status(400).json({ error: 'Invalid restock amount' });
    }

    const item = get('SELECT id, quantity FROM inventory_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const newQuantity = item.quantity + amount;

    run(`
      UPDATE inventory_items
      SET quantity = ?
      WHERE id = ?
    `, [newQuantity, id]);

    // Fire-and-forget: log restock for AI pattern analysis
    setImmediate(() => logRestockEvent(parseInt(id), item.quantity, amount));

    res.json({ id, quantity: newQuantity, restockAmount: amount });
  } catch (error) {
    console.error('Error restocking inventory:', error);
    res.status(500).json({ error: 'Failed to restock inventory' });
  }
});

// POST /api/inventory/deduct - deduct ingredients for an order
router.post('/deduct', (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    // Get all order items
    const orderItems = all(`
      SELECT menu_item_id, quantity
      FROM order_items
      WHERE order_id = ?
    `, [order_id]);

    if (orderItems.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // For each order item, deduct ingredients
    for (const orderItem of orderItems) {
      const ingredients = all(`
        SELECT inventory_item_id, quantity_used
        FROM menu_item_ingredients
        WHERE menu_item_id = ?
      `, [orderItem.menu_item_id]);

      for (const ingredient of ingredients) {
        const totalNeeded = ingredient.quantity_used * orderItem.quantity;

        const inventoryItem = get(`
          SELECT id, quantity
          FROM inventory_items
          WHERE id = ?
        `, [ingredient.inventory_item_id]);

        if (inventoryItem) {
          const newQuantity = Math.max(0, inventoryItem.quantity - totalNeeded);
          run(`
            UPDATE inventory_items
            SET quantity = ?
            WHERE id = ?
          `, [newQuantity, ingredient.inventory_item_id]);
        }
      }
    }

    res.json({ message: 'Inventory deducted successfully' });
  } catch (error) {
    console.error('Error deducting inventory:', error);
    res.status(500).json({ error: 'Failed to deduct inventory' });
  }
});

export default router;
