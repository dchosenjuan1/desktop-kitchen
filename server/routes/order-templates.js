import { Router } from 'express';
import { all, get, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/order-templates - list active templates
router.get('/', (req, res) => {
  try {
    const templates = all(`
      SELECT id, name, description, items_json, created_by, active, sort_order, created_at
      FROM order_templates
      WHERE active = 1
      ORDER BY sort_order ASC, created_at DESC
    `);
    const parsed = templates.map(t => ({
      ...t,
      items: JSON.parse(t.items_json),
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching order templates:', error);
    res.status(500).json({ error: 'Failed to fetch order templates' });
  }
});

// POST /api/order-templates - create template
router.post('/', requireAuth('manage_menu'), (req, res) => {
  try {
    const { name, description, items } = req.body;
    if (!name || !items || !items.length) {
      return res.status(400).json({ error: 'Name and items are required' });
    }

    const items_json = JSON.stringify(items);
    const employeeId = req.headers['x-employee-id'] || null;

    const result = run(`
      INSERT INTO order_templates (name, description, items_json, created_by, active)
      VALUES (?, ?, ?, ?, 1)
    `, [name.trim(), description || null, items_json, employeeId]);

    res.status(201).json({
      id: result.lastInsertRowid,
      name: name.trim(),
      description,
      items,
      active: 1,
    });
  } catch (error) {
    console.error('Error creating order template:', error);
    res.status(500).json({ error: 'Failed to create order template' });
  }
});

// PUT /api/order-templates/:id/toggle - activate/deactivate
router.put('/:id/toggle', requireAuth('manage_menu'), (req, res) => {
  try {
    const { id } = req.params;
    const template = get('SELECT id, active FROM order_templates WHERE id = ?', [id]);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const newActive = template.active === 1 ? 0 : 1;
    run('UPDATE order_templates SET active = ? WHERE id = ?', [newActive, id]);

    res.json({ id: parseInt(id), active: newActive === 1 });
  } catch (error) {
    console.error('Error toggling order template:', error);
    res.status(500).json({ error: 'Failed to toggle order template' });
  }
});

export default router;
