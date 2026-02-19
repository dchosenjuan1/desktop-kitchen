import { Router } from 'express';
import { all, get, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/modifiers/items-with-modifiers - batch check which items have modifier groups
router.get('/items-with-modifiers', (req, res) => {
  try {
    const rows = all(`
      SELECT DISTINCT menu_item_id
      FROM menu_item_modifier_groups
    `);
    res.json({ itemIds: rows.map(r => r.menu_item_id) });
  } catch (error) {
    console.error('Error fetching items with modifiers:', error);
    res.status(500).json({ error: 'Failed to fetch items with modifiers' });
  }
});

// GET /api/modifiers/groups - list all modifier groups with their modifiers
router.get('/groups', (req, res) => {
  try {
    const groups = all(`
      SELECT id, name, selection_type, required, min_selections, max_selections, sort_order, active
      FROM modifier_groups
      ORDER BY sort_order ASC
    `);

    const result = groups.map(group => {
      const modifiers = all(`
        SELECT id, group_id, name, price_adjustment, sort_order, active
        FROM modifiers
        WHERE group_id = ?
        ORDER BY sort_order ASC
      `, [group.id]);
      return { ...group, modifiers };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching modifier groups:', error);
    res.status(500).json({ error: 'Failed to fetch modifier groups' });
  }
});

// GET /api/modifiers/groups/item/:menuItemId - groups assigned to a menu item
router.get('/groups/item/:menuItemId', (req, res) => {
  try {
    const { menuItemId } = req.params;

    const groups = all(`
      SELECT mg.id, mg.name, mg.selection_type, mg.required, mg.min_selections, mg.max_selections, mg.sort_order, mg.active
      FROM modifier_groups mg
      JOIN menu_item_modifier_groups mimg ON mg.id = mimg.modifier_group_id
      WHERE mimg.menu_item_id = ? AND mg.active = 1
      ORDER BY mimg.sort_order ASC
    `, [menuItemId]);

    const result = groups.map(group => {
      const modifiers = all(`
        SELECT id, group_id, name, price_adjustment, sort_order, active
        FROM modifiers
        WHERE group_id = ? AND active = 1
        ORDER BY sort_order ASC
      `, [group.id]);
      return { ...group, modifiers };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching item modifier groups:', error);
    res.status(500).json({ error: 'Failed to fetch item modifier groups' });
  }
});

// POST /api/modifiers/groups - create modifier group
router.post('/groups', requireAuth('manage_modifiers'), (req, res) => {
  try {
    const { name, selection_type = 'single', required = false, min_selections = 0, max_selections = 1, sort_order = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });

    const result = run(`
      INSERT INTO modifier_groups (name, selection_type, required, min_selections, max_selections, sort_order, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [name, selection_type, required ? 1 : 0, min_selections, max_selections, sort_order]);

    res.status(201).json({ id: result.lastInsertRowid, name, selection_type });
  } catch (error) {
    console.error('Error creating modifier group:', error);
    res.status(500).json({ error: 'Failed to create modifier group' });
  }
});

// PUT /api/modifiers/groups/:id - update modifier group
router.put('/groups/:id', requireAuth('manage_modifiers'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, selection_type, required, min_selections, max_selections, sort_order, active } = req.body;

    const existing = get('SELECT id FROM modifier_groups WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Modifier group not found' });

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (selection_type !== undefined) { updates.push('selection_type = ?'); params.push(selection_type); }
    if (required !== undefined) { updates.push('required = ?'); params.push(required ? 1 : 0); }
    if (min_selections !== undefined) { updates.push('min_selections = ?'); params.push(min_selections); }
    if (max_selections !== undefined) { updates.push('max_selections = ?'); params.push(max_selections); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      run(`UPDATE modifier_groups SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ id, message: 'Updated' });
  } catch (error) {
    console.error('Error updating modifier group:', error);
    res.status(500).json({ error: 'Failed to update modifier group' });
  }
});

// POST /api/modifiers - create modifier
router.post('/', requireAuth('manage_modifiers'), (req, res) => {
  try {
    const { group_id, name, price_adjustment = 0, sort_order = 0 } = req.body;
    if (!group_id || !name) return res.status(400).json({ error: 'Missing group_id or name' });

    const result = run(`
      INSERT INTO modifiers (group_id, name, price_adjustment, sort_order, active)
      VALUES (?, ?, ?, ?, 1)
    `, [group_id, name, price_adjustment, sort_order]);

    res.status(201).json({ id: result.lastInsertRowid, group_id, name, price_adjustment });
  } catch (error) {
    console.error('Error creating modifier:', error);
    res.status(500).json({ error: 'Failed to create modifier' });
  }
});

// PUT /api/modifiers/:id - update modifier
router.put('/:id', requireAuth('manage_modifiers'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, price_adjustment, sort_order, active } = req.body;

    const existing = get('SELECT id FROM modifiers WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Modifier not found' });

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (price_adjustment !== undefined) { updates.push('price_adjustment = ?'); params.push(price_adjustment); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      run(`UPDATE modifiers SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ id, message: 'Updated' });
  } catch (error) {
    console.error('Error updating modifier:', error);
    res.status(500).json({ error: 'Failed to update modifier' });
  }
});

// POST /api/modifiers/assign - assign modifier group to menu item
router.post('/assign', requireAuth('manage_modifiers'), (req, res) => {
  try {
    const { menu_item_id, modifier_group_id, sort_order = 0 } = req.body;
    if (!menu_item_id || !modifier_group_id) return res.status(400).json({ error: 'Missing required fields' });

    run(`
      INSERT OR REPLACE INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
      VALUES (?, ?, ?)
    `, [menu_item_id, modifier_group_id, sort_order]);

    res.json({ message: 'Assigned' });
  } catch (error) {
    console.error('Error assigning modifier group:', error);
    res.status(500).json({ error: 'Failed to assign modifier group' });
  }
});

// POST /api/modifiers/unassign - remove modifier group from menu item
router.post('/unassign', requireAuth('manage_modifiers'), (req, res) => {
  try {
    const { menu_item_id, modifier_group_id } = req.body;
    if (!menu_item_id || !modifier_group_id) return res.status(400).json({ error: 'Missing required fields' });

    run(`
      DELETE FROM menu_item_modifier_groups
      WHERE menu_item_id = ? AND modifier_group_id = ?
    `, [menu_item_id, modifier_group_id]);

    res.json({ message: 'Unassigned' });
  } catch (error) {
    console.error('Error unassigning modifier group:', error);
    res.status(500).json({ error: 'Failed to unassign modifier group' });
  }
});

export default router;
