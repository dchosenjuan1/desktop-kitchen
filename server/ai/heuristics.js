import { generateInventoryPushSuggestions } from './suggestions/inventory-push.js';
import { generateCartUpsellSuggestions } from './suggestions/upsell.js';
import { refreshSuggestions } from './cache.js';
import { getConfigBool, getConfigNumber } from './config.js';

/**
 * Run all heuristic rules and update the suggestion cache.
 * Called periodically by the scheduler.
 */
export function refreshAllHeuristics() {
  const ttl = getConfigNumber('suggestion_cache_ttl_minutes') || 5;

  // Refresh inventory push suggestions
  if (getConfigBool('inventory_push_enabled')) {
    try {
      const { pushItems, avoidItems } = generateInventoryPushSuggestions();

      const inventorySuggestions = [];

      for (const item of pushItems) {
        inventorySuggestions.push({
          context: 'inventory-push',
          priority: 90,
          data: {
            action: 'push',
            menu_item_id: item.menu_item_id,
            name: item.name,
            price: item.price,
            category_id: item.category_id,
            category_name: item.category_name,
            reason: item.reason,
          },
        });
      }

      for (const item of avoidItems) {
        inventorySuggestions.push({
          context: 'inventory-push',
          priority: 90,
          data: {
            action: 'avoid',
            menu_item_id: item.menu_item_id,
            name: item.name,
            price: item.price,
            category_id: item.category_id,
            category_name: item.category_name,
            reason: item.reason,
            ingredient_name: item.ingredient_name,
          },
        });
      }

      refreshSuggestions('inventory-push', inventorySuggestions, ttl);
    } catch (error) {
      console.error('[AI] Error refreshing inventory push:', error.message);
    }
  }
}

/**
 * Get real-time cart suggestions (computed on demand, but fast since it's pure SQL).
 */
export function getCartSuggestions(cartItemIds, currentHour) {
  return generateCartUpsellSuggestions(cartItemIds, currentHour);
}

/**
 * Get current inventory push data from cache or compute fresh.
 */
export function getInventoryPush() {
  return generateInventoryPushSuggestions();
}
