import { run, get, all, getTenantId } from '../db/index.js';
import { checkLimit, getPlanLimits } from '../planLimits.js';

/**
 * Bulk-insert menu data (categories, items, inventory, recipes, modifiers, combos).
 * Used by both template import and CSV import endpoints.
 *
 * Runs within the tenant RLS context (caller must be inside tenant middleware).
 *
 * @param {object} payload - Template-shaped data
 * @param {object} opts
 * @param {string} opts.plan - Tenant plan ('trial','starter','pro','ghost_kitchen')
 * @param {'append'|'replace'} opts.mode - 'replace' deletes is_example items first
 * @returns {object} stats
 */
export async function bulkInsertMenu(payload, { plan = 'trial', mode = 'append' } = {}) {
  const tid = getTenantId();
  const limits = getPlanLimits(plan);

  const stats = {
    categoriesCreated: 0,
    itemsCreated: 0,
    inventoryCreated: 0,
    recipesCreated: 0,
    modifierGroupsCreated: 0,
    combosCreated: 0,
    skipped: [],
    warnings: [],
  };

  // ─── 1. Replace mode: clean out example data ───
  if (mode === 'replace') {
    await run('DELETE FROM menu_item_ingredients WHERE menu_item_id IN (SELECT id FROM menu_items WHERE is_example = true)');
    await run('DELETE FROM order_item_modifiers WHERE order_item_id IN (SELECT oi.id FROM order_items oi JOIN menu_items mi ON oi.menu_item_id = mi.id WHERE mi.is_example = true)');
    await run('DELETE FROM modifier_group_items WHERE menu_item_id IN (SELECT id FROM menu_items WHERE is_example = true)');
    await run('DELETE FROM menu_items WHERE is_example = true');
    // Delete empty categories (no items left)
    await run(`DELETE FROM menu_categories WHERE id NOT IN (SELECT DISTINCT category_id FROM menu_items)`);
  }

  // ─── 2. Insert categories (skip duplicates by name) ───
  const catIdMap = {};
  const existingCats = await all('SELECT id, name FROM menu_categories');
  for (const ec of existingCats) {
    catIdMap[ec.name.toLowerCase()] = ec.id;
  }

  if (payload.categories) {
    for (const cat of payload.categories) {
      const key = cat.name.toLowerCase();
      if (catIdMap[key]) continue; // already exists

      const maxSort = await get('SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM menu_categories');
      const sortOrder = cat.sort_order ?? ((maxSort?.max_sort || 0) + 1);

      const result = await run(
        'INSERT INTO menu_categories (tenant_id, name, sort_order, active) VALUES ($1, $2, $3, true)',
        [tid, cat.name.trim(), sortOrder]
      );
      catIdMap[key] = result.lastInsertRowid;
      stats.categoriesCreated++;
    }
  }

  // ─── 3. Insert menu items (respect plan limits) ───
  const itemIdMap = {};
  if (payload.items) {
    const { cnt: currentCount } = await get('SELECT COUNT(*) as cnt FROM menu_items WHERE active = true') || { cnt: 0 };
    let itemCount = Number(currentCount);
    const maxItems = typeof limits.menuItems === 'number' ? limits.menuItems : Infinity;

    for (const item of payload.items) {
      // Plan limit check
      if (itemCount >= maxItems) {
        stats.skipped.push(item.name);
        if (stats.warnings.length === 0) {
          stats.warnings.push(`Plan limit reached (${maxItems} items). ${payload.items.length - stats.itemsCreated - stats.skipped.length + stats.skipped.length} items skipped.`);
        }
        continue;
      }

      const catKey = (item.category || '').toLowerCase();
      const categoryId = catIdMap[catKey];
      if (!categoryId) {
        stats.skipped.push(item.name);
        stats.warnings.push(`No category found for "${item.name}" (category: "${item.category}")`);
        continue;
      }

      const result = await run(
        `INSERT INTO menu_items (tenant_id, category_id, name, price, description, active, prep_time_minutes, is_example)
         VALUES ($1, $2, $3, $4, $5, true, $6, false)`,
        [tid, categoryId, item.name.trim(), item.price, item.description || null, item.prep_time_minutes || 5]
      );
      itemIdMap[item.name.toLowerCase()] = result.lastInsertRowid;
      itemCount++;
      stats.itemsCreated++;
    }

    // Update warning with final count
    if (stats.skipped.length > 0 && stats.warnings.length > 0) {
      stats.warnings[0] = `Plan limit reached (${maxItems} items). ${stats.skipped.length} items skipped.`;
    }
  }

  // ─── 4. Insert inventory items (skip duplicates by name) ───
  const invIdMap = {};
  if (payload.inventory) {
    const existingInv = await all('SELECT id, name FROM inventory_items');
    for (const ei of existingInv) {
      invIdMap[ei.name.toLowerCase()] = ei.id;
    }

    for (const inv of payload.inventory) {
      const key = inv.name.toLowerCase();
      if (invIdMap[key]) continue;

      const result = await run(
        `INSERT INTO inventory_items (tenant_id, name, unit, quantity, low_stock_threshold, category, cost_price, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [tid, inv.name.trim(), inv.unit || 'unit', inv.quantity || 0, inv.low_stock_threshold || 5, inv.category || 'General', inv.cost_price || 0]
      );
      invIdMap[key] = result.lastInsertRowid;
      stats.inventoryCreated++;
    }
  }

  // ─── 5. Insert recipe links (menu_item_ingredients) ───
  if (payload.recipes) {
    for (const recipe of payload.recipes) {
      const itemId = itemIdMap[(recipe.item_name || '').toLowerCase()];
      const invId = invIdMap[(recipe.ingredient_name || '').toLowerCase()];
      if (!itemId || !invId) continue;

      await run(
        `INSERT INTO menu_item_ingredients (tenant_id, menu_item_id, inventory_item_id, quantity_used)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [tid, itemId, invId, recipe.quantity_used || 1]
      );
      stats.recipesCreated++;
    }
  }

  // ─── 6. Insert modifier groups + modifiers, assign to items by category ───
  if (payload.modifier_groups) {
    for (const mg of payload.modifier_groups) {
      const mgResult = await run(
        `INSERT INTO modifier_groups (tenant_id, name, selection_type, required, min_selections, max_selections)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tid, mg.name, mg.selection_type || 'single', mg.required ?? false, mg.min_selections ?? 0, mg.max_selections ?? 1]
      );
      const mgId = mgResult.lastInsertRowid;

      // Insert modifiers
      if (mg.modifiers) {
        for (let i = 0; i < mg.modifiers.length; i++) {
          const mod = mg.modifiers[i];
          await run(
            `INSERT INTO modifiers (tenant_id, modifier_group_id, name, price_adjustment, sort_order, active)
             VALUES ($1, $2, $3, $4, $5, true)`,
            [tid, mgId, mod.name, mod.price_adjustment || 0, i + 1]
          );
        }
      }

      // Assign to items by category
      if (mg.assign_to_categories) {
        for (const catName of mg.assign_to_categories) {
          const catId = catIdMap[catName.toLowerCase()];
          if (!catId) continue;

          // Find all items in that category that we just created
          const itemsInCat = await all(
            'SELECT id FROM menu_items WHERE category_id = $1',
            [catId]
          );
          for (const item of itemsInCat) {
            await run(
              `INSERT INTO modifier_group_items (tenant_id, modifier_group_id, menu_item_id)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [tid, mgId, item.id]
            );
          }
        }
      }

      stats.modifierGroupsCreated++;
    }
  }

  // ─── 7. Insert combos ───
  if (payload.combos) {
    for (const combo of payload.combos) {
      const comboResult = await run(
        `INSERT INTO combo_definitions (tenant_id, name, description, combo_price, active)
         VALUES ($1, $2, $3, $4, true)`,
        [tid, combo.name, combo.description || '', combo.combo_price]
      );
      const comboId = comboResult.lastInsertRowid;

      if (combo.slots) {
        for (let i = 0; i < combo.slots.length; i++) {
          const slot = combo.slots[i];
          const catId = catIdMap[(slot.category || '').toLowerCase()] || null;
          await run(
            `INSERT INTO combo_slots (tenant_id, combo_definition_id, slot_label, allowed_category_id, sort_order)
             VALUES ($1, $2, $3, $4, $5)`,
            [tid, comboId, slot.slot_label, catId, i + 1]
          );
        }
      }

      stats.combosCreated++;
    }
  }

  return stats;
}
