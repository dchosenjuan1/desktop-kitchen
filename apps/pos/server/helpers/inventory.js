import { all, get, run } from '../db/index.js';

/**
 * Deduct inventory for all items in an order.
 * Queries order_items -> menu_item_ingredients -> updates inventory_items.
 */
export async function deductInventoryForOrder(orderId) {
  const orderItems = await all(`
    SELECT menu_item_id, quantity
    FROM order_items
    WHERE order_id = $1
  `, [orderId]);

  for (const orderItem of orderItems) {
    const ingredients = await all(`
      SELECT inventory_item_id, quantity_used
      FROM menu_item_ingredients
      WHERE menu_item_id = $1
    `, [orderItem.menu_item_id]);

    for (const ingredient of ingredients) {
      const totalNeeded = ingredient.quantity_used * orderItem.quantity;
      const inventoryItem = await get(`
        SELECT id, quantity
        FROM inventory_items
        WHERE id = $1
      `, [ingredient.inventory_item_id]);

      if (inventoryItem) {
        const newQuantity = Math.max(0, inventoryItem.quantity - totalNeeded);
        await run(`
          UPDATE inventory_items
          SET quantity = $1
          WHERE id = $2
        `, [newQuantity, ingredient.inventory_item_id]);
      }
    }
  }
}

/**
 * Restore inventory for specific refunded items.
 * @param {Array<{order_item_id: number, quantity: number}>} items
 */
export async function restoreInventoryForItems(items) {
  for (const refundItem of items) {
    const orderItem = await get(`
      SELECT menu_item_id, quantity
      FROM order_items
      WHERE id = $1
    `, [refundItem.order_item_id]);

    if (!orderItem) continue;

    const ingredients = await all(`
      SELECT inventory_item_id, quantity_used
      FROM menu_item_ingredients
      WHERE menu_item_id = $1
    `, [orderItem.menu_item_id]);

    for (const ingredient of ingredients) {
      const totalToRestore = ingredient.quantity_used * refundItem.quantity;
      await run(`
        UPDATE inventory_items
        SET quantity = quantity + $1
        WHERE id = $2
      `, [totalToRestore, ingredient.inventory_item_id]);
    }
  }
}
