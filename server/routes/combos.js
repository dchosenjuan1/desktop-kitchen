import { Router } from 'express';
import { all, get, run } from '../db.js';

const router = Router();

// GET /api/combos - list all combos with slots
router.get('/', (req, res) => {
  try {
    const combos = all(`
      SELECT id, name, description, combo_price, active
      FROM combo_definitions
      WHERE active = 1
      ORDER BY name ASC
    `);

    const result = combos.map(combo => {
      const slots = all(`
        SELECT cs.id, cs.combo_id, cs.slot_label, cs.category_id, cs.specific_item_id, cs.sort_order,
               mc.name as category_name, mi.name as item_name
        FROM combo_slots cs
        LEFT JOIN menu_categories mc ON cs.category_id = mc.id
        LEFT JOIN menu_items mi ON cs.specific_item_id = mi.id
        WHERE cs.combo_id = ?
        ORDER BY cs.sort_order ASC
      `, [combo.id]);
      return { ...combo, slots };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching combos:', error);
    res.status(500).json({ error: 'Failed to fetch combos' });
  }
});

// GET /api/combos/:id - single combo with slots
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const combo = get('SELECT * FROM combo_definitions WHERE id = ?', [id]);
    if (!combo) return res.status(404).json({ error: 'Combo not found' });

    const slots = all(`
      SELECT cs.*, mc.name as category_name, mi.name as item_name
      FROM combo_slots cs
      LEFT JOIN menu_categories mc ON cs.category_id = mc.id
      LEFT JOIN menu_items mi ON cs.specific_item_id = mi.id
      WHERE cs.combo_id = ?
      ORDER BY cs.sort_order ASC
    `, [id]);

    res.json({ ...combo, slots });
  } catch (error) {
    console.error('Error fetching combo:', error);
    res.status(500).json({ error: 'Failed to fetch combo' });
  }
});

// POST /api/combos - create combo
router.post('/', (req, res) => {
  try {
    const { name, description, combo_price, slots = [] } = req.body;
    if (!name || combo_price === undefined) return res.status(400).json({ error: 'Missing name or combo_price' });

    const result = run(`
      INSERT INTO combo_definitions (name, description, combo_price, active)
      VALUES (?, ?, ?, 1)
    `, [name, description || '', combo_price]);

    const comboId = result.lastInsertRowid;

    for (const slot of slots) {
      run(`
        INSERT INTO combo_slots (combo_id, slot_label, category_id, specific_item_id, sort_order)
        VALUES (?, ?, ?, ?, ?)
      `, [comboId, slot.slot_label, slot.category_id || null, slot.specific_item_id || null, slot.sort_order || 0]);
    }

    res.status(201).json({ id: comboId, name, combo_price });
  } catch (error) {
    console.error('Error creating combo:', error);
    res.status(500).json({ error: 'Failed to create combo' });
  }
});

// PUT /api/combos/:id - update combo
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, combo_price, active } = req.body;

    const existing = get('SELECT id FROM combo_definitions WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'Combo not found' });

    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (combo_price !== undefined) { updates.push('combo_price = ?'); params.push(combo_price); }
    if (active !== undefined) { updates.push('active = ?'); params.push(active ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      run(`UPDATE combo_definitions SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ id, message: 'Updated' });
  } catch (error) {
    console.error('Error updating combo:', error);
    res.status(500).json({ error: 'Failed to update combo' });
  }
});

export default router;
