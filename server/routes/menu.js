import { Router } from 'express';
import { all, get, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/menu/categories - list categories (all by default, ?active_only=1 for active only)
router.get('/categories', (req, res) => {
  try {
    const activeOnly = req.query.active_only === '1';
    const categories = all(`
      SELECT id, name, sort_order, active
      FROM menu_categories
      ${activeOnly ? 'WHERE active = 1' : ''}
      ORDER BY sort_order ASC
    `);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/menu/categories - create category
router.post('/categories', requireAuth('manage_menu'), (req, res) => {
  try {
    const { name, sort_order, printer_target } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const maxSort = get('SELECT MAX(sort_order) as max_sort FROM menu_categories');
    const order = sort_order !== undefined ? sort_order : (maxSort?.max_sort || 0) + 1;

    const result = run(`
      INSERT INTO menu_categories (name, sort_order, active)
      VALUES (?, ?, 1)
    `, [name.trim(), order]);

    res.status(201).json({
      id: result.lastInsertRowid,
      name: name.trim(),
      sort_order: order,
      active: 1,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/menu/categories/:id - update category
router.put('/categories/:id', requireAuth('manage_menu'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;

    const category = get('SELECT id FROM menu_categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Category name cannot be empty' });
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    run(`UPDATE menu_categories SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// PUT /api/menu/categories/:id/toggle - activate/deactivate category
router.put('/categories/:id/toggle', requireAuth('manage_menu'), (req, res) => {
  try {
    const { id } = req.params;

    const category = get('SELECT id, active FROM menu_categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const newActive = category.active === 1 ? 0 : 1;
    run('UPDATE menu_categories SET active = ? WHERE id = ?', [newActive, id]);

    res.json({ id: parseInt(id), active: newActive === 1 });
  } catch (error) {
    console.error('Error toggling category:', error);
    res.status(500).json({ error: 'Failed to toggle category' });
  }
});

// GET /api/menu/items - list active items (optional ?category_id filter)
router.get('/items', (req, res) => {
  try {
    const { category_id } = req.query;
    let query = `
      SELECT id, category_id, name, price, description, image_url
      FROM menu_items
      WHERE active = 1
    `;
    const params = [];

    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY name ASC';

    const items = all(query, params);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/menu/items/:id - single item
router.get('/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = get(`
      SELECT id, category_id, name, price, description, image_url
      FROM menu_items
      WHERE id = ? AND active = 1
    `, [id]);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// POST /api/menu/items - create item (admin)
router.post('/items', requireAuth('manage_menu'), (req, res) => {
  try {
    const { category_id, name, price, description, image_url } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = run(`
      INSERT INTO menu_items (category_id, name, price, description, image_url, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [category_id, name, price, description || null, image_url || null]);

    res.status(201).json({
      id: result.lastInsertRowid,
      category_id,
      name,
      price,
      description,
      image_url,
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// PUT /api/menu/items/:id - update item (admin)
router.put('/items/:id', requireAuth('manage_menu'), (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, price, description, image_url } = req.body;

    // Check if item exists
    const item = get('SELECT id FROM menu_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updates = [];
    const values = [];

    if (category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(category_id);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      values.push(image_url);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    run(`
      UPDATE menu_items
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// PUT /api/menu/items/:id/toggle - toggle active status
router.put('/items/:id/toggle', requireAuth('manage_menu'), (req, res) => {
  try {
    const { id } = req.params;

    const item = get('SELECT id, active FROM menu_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const newActive = item.active === 1 ? 0 : 1;
    run('UPDATE menu_items SET active = ? WHERE id = ?', [newActive, id]);

    res.json({ id, active: newActive === 1 });
  } catch (error) {
    console.error('Error toggling item:', error);
    res.status(500).json({ error: 'Failed to toggle item' });
  }
});

export default router;
