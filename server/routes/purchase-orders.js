import { Router } from 'express';
import { all, get, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ==================== Vendor CRUD ====================

// GET /api/purchase-orders/vendors
router.get('/vendors', (req, res) => {
  try {
    const vendors = all('SELECT * FROM vendors ORDER BY name ASC');
    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// POST /api/purchase-orders/vendors
router.post('/vendors', requireAuth('manage_purchase_orders'), (req, res) => {
  try {
    const { name, contact_name, phone, email, address, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Vendor name is required' });

    const result = run(`
      INSERT INTO vendors (name, contact_name, phone, email, address, notes, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [name, contact_name || null, phone || null, email || null, address || null, notes || null]);

    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// PUT /api/purchase-orders/vendors/:id
router.put('/vendors/:id', requireAuth('manage_purchase_orders'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_name, phone, email, address, notes, active } = req.body;

    const vendor = get('SELECT * FROM vendors WHERE id = ?', [id]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    run(`
      UPDATE vendors SET name = ?, contact_name = ?, phone = ?, email = ?, address = ?, notes = ?, active = ?
      WHERE id = ?
    `, [
      name ?? vendor.name,
      contact_name ?? vendor.contact_name,
      phone ?? vendor.phone,
      email ?? vendor.email,
      address ?? vendor.address,
      notes ?? vendor.notes,
      active !== undefined ? (active ? 1 : 0) : vendor.active,
      id,
    ]);

    res.json({ id, success: true });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// ==================== Purchase Order Lifecycle ====================

function generatePONumber() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const existing = get(`
    SELECT COUNT(*) as count FROM purchase_orders
    WHERE po_number LIKE ?
  `, [`PO-${dateStr}-%`]);
  const seq = (existing?.count || 0) + 1;
  return `PO-${dateStr}-${String(seq).padStart(3, '0')}`;
}

// POST /api/purchase-orders - create PO
router.post('/', requireAuth('manage_purchase_orders'), (req, res) => {
  try {
    const { vendor_id, items, notes } = req.body;
    if (!vendor_id) return res.status(400).json({ error: 'vendor_id is required' });

    const vendor = get('SELECT id FROM vendors WHERE id = ?', [vendor_id]);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const poNumber = generatePONumber();
    const employeeId = req.employee?.id || null;

    const result = run(`
      INSERT INTO purchase_orders (po_number, vendor_id, status, total_amount, notes, created_by)
      VALUES (?, ?, 'draft', 0, ?, ?)
    `, [poNumber, vendor_id, notes || null, employeeId]);

    const poId = result.lastInsertRowid;
    let totalAmount = 0;

    // Add items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        const lineTotal = (item.quantity_ordered || 0) * (item.unit_cost || 0);
        totalAmount += lineTotal;
        run(`
          INSERT INTO purchase_order_items (po_id, inventory_item_id, quantity_ordered, unit_cost, line_total)
          VALUES (?, ?, ?, ?, ?)
        `, [poId, item.inventory_item_id, item.quantity_ordered, item.unit_cost || 0, lineTotal]);
      }
      run('UPDATE purchase_orders SET total_amount = ? WHERE id = ?', [totalAmount, poId]);
    }

    res.status(201).json({ id: poId, po_number: poNumber, status: 'draft', total_amount: totalAmount });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

// GET /api/purchase-orders - list POs
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT po.*, v.name as vendor_name, e.name as created_by_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN employees e ON po.created_by = e.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE po.status = ?';
      params.push(status);
    }

    query += ' ORDER BY po.created_at DESC';
    const orders = all(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

// GET /api/purchase-orders/:id - PO detail with items
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const po = get(`
      SELECT po.*, v.name as vendor_name, e.name as created_by_name
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN employees e ON po.created_by = e.id
      WHERE po.id = ?
    `, [id]);

    if (!po) return res.status(404).json({ error: 'Purchase order not found' });

    const items = all(`
      SELECT poi.*, ii.name as item_name, ii.unit
      FROM purchase_order_items poi
      JOIN inventory_items ii ON poi.inventory_item_id = ii.id
      WHERE poi.po_id = ?
    `, [id]);

    res.json({ ...po, items });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
});

// PUT /api/purchase-orders/:id - update draft PO
router.put('/:id', requireAuth('manage_purchase_orders'), (req, res) => {
  try {
    const { id } = req.params;
    const { vendor_id, items, notes } = req.body;

    const po = get('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (po.status !== 'draft') return res.status(400).json({ error: 'Can only edit draft POs' });

    if (notes !== undefined) {
      run('UPDATE purchase_orders SET notes = ? WHERE id = ?', [notes, id]);
    }

    if (items && items.length > 0) {
      // Remove existing items and re-add
      run('DELETE FROM purchase_order_items WHERE po_id = ?', [id]);

      let totalAmount = 0;
      for (const item of items) {
        const lineTotal = (item.quantity_ordered || 0) * (item.unit_cost || 0);
        totalAmount += lineTotal;
        run(`
          INSERT INTO purchase_order_items (po_id, inventory_item_id, quantity_ordered, unit_cost, line_total)
          VALUES (?, ?, ?, ?, ?)
        `, [id, item.inventory_item_id, item.quantity_ordered, item.unit_cost || 0, lineTotal]);
      }
      run('UPDATE purchase_orders SET total_amount = ? WHERE id = ?', [totalAmount, id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({ error: 'Failed to update purchase order' });
  }
});

// POST /api/purchase-orders/:id/submit
router.post('/:id/submit', requireAuth('manage_purchase_orders'), (req, res) => {
  try {
    const { id } = req.params;
    const po = get('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (po.status !== 'draft') return res.status(400).json({ error: 'Can only submit draft POs' });

    run(`UPDATE purchase_orders SET status = 'submitted', submitted_at = datetime('now','localtime') WHERE id = ?`, [id]);
    res.json({ success: true, status: 'submitted' });
  } catch (error) {
    console.error('Error submitting purchase order:', error);
    res.status(500).json({ error: 'Failed to submit purchase order' });
  }
});

// POST /api/purchase-orders/:id/receive - partial/full receive
router.post('/:id/receive', requireAuth('manage_purchase_orders'), (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const po = get('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (!['submitted', 'partial'].includes(po.status)) {
      return res.status(400).json({ error: 'PO must be submitted or partial to receive' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Items to receive are required' });
    }

    let allFullyReceived = true;

    for (const receiveItem of items) {
      const poItem = get(
        'SELECT * FROM purchase_order_items WHERE id = ? AND po_id = ?',
        [receiveItem.po_item_id, id]
      );
      if (!poItem) continue;

      const newReceived = (poItem.quantity_received || 0) + receiveItem.quantity_received;
      run('UPDATE purchase_order_items SET quantity_received = ? WHERE id = ?',
        [newReceived, receiveItem.po_item_id]);

      // Restock inventory
      if (receiveItem.quantity_received > 0) {
        run('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?',
          [receiveItem.quantity_received, poItem.inventory_item_id]);
      }

      if (newReceived < poItem.quantity_ordered) {
        allFullyReceived = false;
      }
    }

    // Check if all items are fully received
    if (!allFullyReceived) {
      const remaining = all(`
        SELECT * FROM purchase_order_items
        WHERE po_id = ? AND quantity_received < quantity_ordered
      `, [id]);
      allFullyReceived = remaining.length === 0;
    }

    const newStatus = allFullyReceived ? 'received' : 'partial';
    const receivedAt = allFullyReceived ? "datetime('now','localtime')" : null;
    run(`UPDATE purchase_orders SET status = ?${allFullyReceived ? ", received_at = datetime('now','localtime')" : ''} WHERE id = ?`,
      [newStatus, id]);

    res.json({ success: true, status: newStatus, fully_received: allFullyReceived });
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    res.status(500).json({ error: 'Failed to receive purchase order' });
  }
});

// POST /api/purchase-orders/:id/cancel
router.post('/:id/cancel', requireAuth('manage_purchase_orders'), (req, res) => {
  try {
    const { id } = req.params;
    const po = get('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (po.status === 'received' || po.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel a received or already cancelled PO' });
    }

    run("UPDATE purchase_orders SET status = 'cancelled' WHERE id = ?", [id]);
    res.json({ success: true, status: 'cancelled' });
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    res.status(500).json({ error: 'Failed to cancel purchase order' });
  }
});

export default router;
