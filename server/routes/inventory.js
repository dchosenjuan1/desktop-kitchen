import { Router } from 'express';
import { all, get, run } from '../db.js';
import { logRestockEvent } from '../ai/data-pipeline.js';

const router = Router();

// GET /api/inventory - list all inventory items
router.get('/', (req, res) => {
  try {
    const items = all(`
      SELECT id, name, quantity, unit, low_stock_threshold, category
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

// PUT /api/inventory/:id - update quantity
router.put('/:id', (req, res) => {
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
router.post('/:id/restock', (req, res) => {
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
