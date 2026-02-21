import { all, get, run } from '../db/index.js';

/**
 * Deduct inventory for all items in an order.
 * Queries order_items -> menu_item_ingredients -> updates inventory_items.
 */
export function deductInventoryForOrder(orderId) {
  const orderItems = all(`
    SELECT menu_item_id, quantity
    FROM order_items
    WHERE order_id = ?
  `, [orderId]);

  for (const orderItem of orderItems) {
    const ingredients = all(`
      SELECT inventory_item_id, quantity_used
      FROM menu_item_ingredients
      WHERE menu_item_id = ?
    `, [orderItem.menu_item_id]);

    for (const ingredient of ingredients) {
      const totalNeeded = ingredient.quantity_used * orderItem.quantity;
      const inventoryItem = get(`
        SELECT id, quantity
        FROM inventory_items
        WHERE id = ?
      `, [ingredient.inventory_item_id]);

      if (inventoryItem) {
        const newQuantity = Math.max(0, inventoryItem.quantity - totalNeeded);
        run(`
          UPDATE inventory_items
          SET quantity = ?
          WHERE id = ?
        `, [newQuantity, ingredient.inventory_item_id]);
      }
    }
  }
}

/**
 * Restore inventory for specific refunded items.
 * @param {Array<{order_item_id: number, quantity: number}>} items
 */
export function restoreInventoryForItems(items) {
  for (const refundItem of items) {
    const orderItem = get(`
      SELECT menu_item_id, quantity
      FROM order_items
      WHERE id = ?
    `, [refundItem.order_item_id]);

    if (!orderItem) continue;

    const ingredients = all(`
      SELECT inventory_item_id, quantity_used
      FROM menu_item_ingredients
      WHERE menu_item_id = ?
    `, [orderItem.menu_item_id]);

    for (const ingredient of ingredients) {
      const totalToRestore = ingredient.quantity_used * refundItem.quantity;
      run(`
        UPDATE inventory_items
        SET quantity = quantity + ?
        WHERE id = ?
      `, [totalToRestore, ingredient.inventory_item_id]);
    }
  }
}
