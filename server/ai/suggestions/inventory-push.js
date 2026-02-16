import { all } from '../../db.js';
import { getConfigNumber } from '../config.js';

/**
 * Inventory Push Logic:
 * When an ingredient is running low (< 1.5x threshold), find menu items that use it,
 * then find alternatives in the same category that DON'T use it.
 */
export function generateInventoryPushSuggestions() {
  const multiplier = getConfigNumber('inventory_push_threshold_multiplier') || 1.5;

  // Find low-stock ingredients (below multiplier * threshold)
  const lowIngredients = all(`
    SELECT id, name, quantity, unit, low_stock_threshold, category
    FROM inventory_items
    WHERE quantity < (low_stock_threshold * ?)
  `, [multiplier]);

  if (lowIngredients.length === 0) {
    return { pushItems: [], avoidItems: [] };
  }

  const lowIngredientIds = lowIngredients.map(i => i.id);

  // Find menu items that use these low ingredients
  const avoidItems = [];
  const avoidItemIds = new Set();

  for (const ingredientId of lowIngredientIds) {
    const itemsUsingIngredient = all(`
      SELECT DISTINCT mi.id, mi.name, mi.price, mi.category_id, mc.name as category_name
      FROM menu_items mi
      JOIN menu_item_ingredients mii ON mi.id = mii.menu_item_id
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mii.inventory_item_id = ?
        AND mi.active = 1
    `, [ingredientId]);

    for (const item of itemsUsingIngredient) {
      if (!avoidItemIds.has(item.id)) {
        avoidItemIds.add(item.id);
        const ingredient = lowIngredients.find(i => i.id === ingredientId);
        avoidItems.push({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          category_id: item.category_id,
          category_name: item.category_name,
          reason: `Low on ${ingredient.name} (${ingredient.quantity} ${ingredient.unit} left)`,
          ingredient_name: ingredient.name,
        });
      }
    }
  }

  // Find alternative items in the same categories that DON'T use low ingredients
  const pushItems = [];
  const pushItemIds = new Set();
  const categoryIds = [...new Set(avoidItems.map(i => i.category_id))];

  for (const categoryId of categoryIds) {
    const alternatives = all(`
      SELECT mi.id, mi.name, mi.price, mi.category_id, mc.name as category_name
      FROM menu_items mi
      JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.category_id = ?
        AND mi.active = 1
        AND mi.id NOT IN (
          SELECT DISTINCT mii.menu_item_id
          FROM menu_item_ingredients mii
          WHERE mii.inventory_item_id IN (${lowIngredientIds.map(() => '?').join(',')})
        )
    `, [categoryId, ...lowIngredientIds]);

    for (const alt of alternatives) {
      if (!pushItemIds.has(alt.id) && !avoidItemIds.has(alt.id)) {
        pushItemIds.add(alt.id);
        pushItems.push({
          menu_item_id: alt.id,
          name: alt.name,
          price: alt.price,
          category_id: alt.category_id,
          category_name: alt.category_name,
          reason: 'Good stock levels - push this item',
        });
      }
    }
  }

  return { pushItems, avoidItems, lowIngredients };
}
