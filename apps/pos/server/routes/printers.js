import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/printers - list all printers
router.get('/', (req, res) => {
  try {
    const printers = all('SELECT * FROM printers ORDER BY name');
    res.json(printers);
  } catch (error) {
    console.error('Error fetching printers:', error);
    res.status(500).json({ error: 'Failed to fetch printers' });
  }
});

// POST /api/printers - create printer
router.post('/', requireAuth('manage_printers'), (req, res) => {
  try {
    const { name, printer_type, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const result = run(
      'INSERT INTO printers (name, printer_type, address, active) VALUES (?, ?, ?, 1)',
      [name, printer_type || 'receipt', address || '']
    );

    res.status(201).json({ id: result.lastInsertRowid, name, printer_type, address, active: true });
  } catch (error) {
    console.error('Error creating printer:', error);
    res.status(500).json({ error: 'Failed to create printer' });
  }
});

// PUT /api/printers/:id - update printer
router.put('/:id', requireAuth('manage_printers'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, printer_type, address, active } = req.body;

    const printer = get('SELECT * FROM printers WHERE id = ?', [id]);
    if (!printer) return res.status(404).json({ error: 'Printer not found' });

    run(
      'UPDATE printers SET name = ?, printer_type = ?, address = ?, active = ? WHERE id = ?',
      [
        name ?? printer.name,
        printer_type ?? printer.printer_type,
        address ?? printer.address,
        active !== undefined ? (active ? 1 : 0) : printer.active,
        id,
      ]
    );

    res.json({ id, success: true });
  } catch (error) {
    console.error('Error updating printer:', error);
    res.status(500).json({ error: 'Failed to update printer' });
  }
});

// GET /api/printers/routes - get category → printer routing
router.get('/routes', (req, res) => {
  try {
    const routes = all(`
      SELECT cpr.category_id, cpr.printer_id, mc.name as category_name, p.name as printer_name
      FROM category_printer_routes cpr
      JOIN menu_categories mc ON cpr.category_id = mc.id
      LEFT JOIN printers p ON cpr.printer_id = p.id
    `);
    res.json(routes);
  } catch (error) {
    console.error('Error fetching printer routes:', error);
    res.status(500).json({ error: 'Failed to fetch printer routes' });
  }
});

// PUT /api/printers/routes - set category → printer route
router.put('/routes', requireAuth('manage_printers'), (req, res) => {
  try {
    const { category_id, printer_id } = req.body;
    if (!category_id) return res.status(400).json({ error: 'category_id is required' });

    const existing = get('SELECT * FROM category_printer_routes WHERE category_id = ?', [category_id]);
    if (existing) {
      run('UPDATE category_printer_routes SET printer_id = ? WHERE category_id = ?', [printer_id, category_id]);
    } else {
      run('INSERT INTO category_printer_routes (category_id, printer_id) VALUES (?, ?)', [category_id, printer_id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating printer route:', error);
    res.status(500).json({ error: 'Failed to update printer route' });
  }
});

// POST /api/printers/print-ticket - generate ticket data grouped by printer
router.post('/print-ticket', (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });

    const order = get('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = all(`
      SELECT oi.*, mi.category_id
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `, [order_id]);

    // Group items by printer
    const printerGroups = {};
    for (const item of items) {
      const route = get(
        'SELECT printer_id FROM category_printer_routes WHERE category_id = ?',
        [item.category_id]
      );
      const printerId = route?.printer_id || 'default';
      if (!printerGroups[printerId]) printerGroups[printerId] = [];
      printerGroups[printerId].push(item);
    }

    res.json({ order, printerGroups });
  } catch (error) {
    console.error('Error generating ticket:', error);
    res.status(500).json({ error: 'Failed to generate ticket' });
  }
});

export default router;
