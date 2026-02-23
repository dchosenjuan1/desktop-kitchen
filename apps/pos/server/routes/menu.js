import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { checkLimit } from '../planLimits.js';

const router = Router();

// GET /api/menu/categories - list categories (all by default, ?active_only=1 for active only)
router.get('/categories', async (req, res) => {
  try {
    const activeOnly = req.query.active_only === '1';
    const categories = await all(`
      SELECT id, name, sort_order, active
      FROM menu_categories
      ${activeOnly ? 'WHERE active = true' : ''}
      ORDER BY sort_order ASC
    `);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/menu/categories - create category
router.post('/categories', requireAuth('manage_menu'), async (req, res) => {
  try {
    const { name, sort_order, printer_target } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const maxSort = await get('SELECT MAX(sort_order) as max_sort FROM menu_categories');
    const order = sort_order !== undefined ? sort_order : (maxSort?.max_sort || 0) + 1;

    const result = await run(`
      INSERT INTO menu_categories (name, sort_order, active)
      VALUES (?, ?, true)
    `, [name.trim(), order]);

    res.status(201).json({
      id: result.lastInsertRowid,
      name: name.trim(),
      sort_order: order,
      active: true,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/menu/categories/:id - update category
router.put('/categories/:id', requireAuth('manage_menu'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;

    const category = await get('SELECT id FROM menu_categories WHERE id = ?', [id]);
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
    await run(`UPDATE menu_categories SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// PUT /api/menu/categories/:id/toggle - activate/deactivate category
router.put('/categories/:id/toggle', requireAuth('manage_menu'), async (req, res) => {
  try {
    const { id } = req.params;

    const category = await get('SELECT id, active FROM menu_categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const newActive = !category.active;
    await run('UPDATE menu_categories SET active = ? WHERE id = ?', [newActive, id]);

    res.json({ id: parseInt(id), active: newActive });
  } catch (error) {
    console.error('Error toggling category:', error);
    res.status(500).json({ error: 'Failed to toggle category' });
  }
});

// GET /api/menu/items/popular - top selling items by order quantity
router.get('/items/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const items = await all(`
      SELECT mi.id, mi.category_id, mi.name, mi.price, mi.description, mi.image_url, mi.active,
             SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE mi.active = true
      GROUP BY mi.id, mi.category_id, mi.name, mi.price, mi.description, mi.image_url, mi.active
      ORDER BY total_sold DESC
      LIMIT ?
    `, [limit]);
    res.json(items);
  } catch (error) {
    console.error('Error fetching popular items:', error);
    res.status(500).json({ error: 'Failed to fetch popular items' });
  }
});

// GET /api/menu/categories/suggested-order - rank categories by order volume at given hour
router.get('/categories/suggested-order', async (req, res) => {
  try {
    const hour = parseInt(req.query.hour) ?? new Date().getHours();
    const rows = await all(`
      SELECT mi.category_id, COUNT(*) as order_count
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE EXTRACT(HOUR FROM o.created_at)::int = ?
      GROUP BY mi.category_id
      ORDER BY order_count DESC
    `, [hour]);
    res.json(rows.map(r => r.category_id));
  } catch (error) {
    console.error('Error fetching category suggested order:', error);
    res.status(500).json({ error: 'Failed to fetch category suggested order' });
  }
});

// GET /api/menu/items - list items (optional ?category_id, ?include_inactive=1)
router.get('/items', async (req, res) => {
  try {
    const { category_id, include_inactive } = req.query;
    const conditions = [];
    const params = [];

    if (!include_inactive) {
      conditions.push('active = true');
    }

    if (category_id) {
      conditions.push('category_id = ?');
      params.push(category_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let query = `
      SELECT id, category_id, name, price, description, image_url, active
      FROM menu_items
      ${whereClause}
    `;

    query += ' ORDER BY name ASC';

    const items = await all(query, params);
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// GET /api/menu/items/:id - single item
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await get(`
      SELECT id, category_id, name, price, description, image_url
      FROM menu_items
      WHERE id = ? AND active = true
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
router.post('/items', requireAuth('manage_menu'), async (req, res) => {
  try {
    const { category_id, name, price, description, image_url } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Plan limit check
    const plan = req.tenant?.plan || 'trial';
    const { cnt } = await get('SELECT COUNT(*) as cnt FROM menu_items WHERE active = true') || { cnt: 0 };
    const check = checkLimit(plan, 'menuItems', cnt);
    if (!check.allowed) {
      return res.status(403).json({ error: `Menu item limit reached (${check.limit})`, upgrade: true, limit: check.limit, current: check.current });
    }

    const result = await run(`
      INSERT INTO menu_items (category_id, name, price, description, image_url, active)
      VALUES (?, ?, ?, ?, ?, true)
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
router.put('/items/:id', requireAuth('manage_menu'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, price, description, image_url } = req.body;

    // Check if item exists
    const item = await get('SELECT id FROM menu_items WHERE id = ?', [id]);
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

    await run(`
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
router.put('/items/:id/toggle', requireAuth('manage_menu'), async (req, res) => {
  try {
    const { id } = req.params;

    const item = await get('SELECT id, active FROM menu_items WHERE id = ?', [id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const newActive = !item.active;
    await run('UPDATE menu_items SET active = ? WHERE id = ?', [newActive, id]);

    res.json({ id, active: newActive });
  } catch (error) {
    console.error('Error toggling item:', error);
    res.status(500).json({ error: 'Failed to toggle item' });
  }
});

// GET /api/menu/pos-brands - POS-visible brands with their item mappings
router.get('/pos-brands', async (req, res) => {
  try {
    const brands = await all(`
      SELECT id, name, slug, primary_color, secondary_color
      FROM virtual_brands
      WHERE active = true AND show_in_pos = true
      ORDER BY name ASC
    `);

    const result = [];
    for (const brand of brands) {
      const items = await all(`
        SELECT vbi.menu_item_id, vbi.custom_name, vbi.custom_price, mi.category_id
        FROM virtual_brand_items vbi
        JOIN menu_items mi ON vbi.menu_item_id = mi.id
        WHERE vbi.virtual_brand_id = ? AND vbi.active = true AND mi.active = true
      `, [brand.id]);

      result.push({ ...brand, items });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching POS brands:', error);
    res.status(500).json({ error: 'Failed to fetch POS brands' });
  }
});

export default router;
