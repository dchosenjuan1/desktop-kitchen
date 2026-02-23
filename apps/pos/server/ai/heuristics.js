import { generateInventoryPushSuggestions } from './suggestions/inventory-push.js';
import { generateCartUpsellSuggestions } from './suggestions/upsell.js';
import { refreshSuggestions, writeSuggestion } from './cache.js';
import { getConfigBool, getConfigNumber } from './config.js';
import { analyzeUpsellPatterns } from './claude-client.js';
import { getTopItemPairs } from './data-pipeline.js';

/**
 * Run all heuristic rules and update the suggestion cache.
 * Called periodically by the scheduler.
 */
export async function refreshAllHeuristics() {
  const ttl = (await getConfigNumber('suggestion_cache_ttl_minutes')) || 5;

  // Refresh inventory push suggestions
  if (await getConfigBool('inventory_push_enabled')) {
    try {
      const { pushItems, avoidItems } = await generateInventoryPushSuggestions();

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

      await refreshSuggestions('inventory-push', inventorySuggestions, ttl);
    } catch (error) {
      console.error('[AI] Error refreshing inventory push:', error.message);
    }
  }

  // Grok-enhanced upsell suggestions (async, fire-and-forget)
  if ((await getConfigBool('grok_api_enabled')) && process.env.XAI_API_KEY) {
    const topPairs = await getTopItemPairs(10);
    if (topPairs.length > 0) {
      analyzeUpsellPatterns(topPairs)
        .then(async (claudeResults) => {
          if (claudeResults && Array.isArray(claudeResults)) {
            for (const result of claudeResults) {
              await writeSuggestion({
                type: 'claude-upsell',
                context: 'claude-enhanced',
                data: {
                  item_name: result.item_name,
                  upsell_message: result.upsell_message,
                  confidence: result.confidence,
                  source: 'claude',
                },
                priority: 95,
                ttlMinutes: ttl,
              });
            }
            console.log(`[AI] Grok enhanced ${claudeResults.length} upsell suggestions`);
          }
        })
        .catch(err => {
          console.error('[AI] Grok upsell analysis failed:', err.message);
        });
    }
  }
}

/**
 * Get real-time cart suggestions (computed on demand, but fast since it's pure SQL).
 */
export async function getCartSuggestions(cartItemIds, currentHour) {
  return await generateCartUpsellSuggestions(cartItemIds, currentHour);
}

/**
 * Get current inventory push data from cache or compute fresh.
 */
export async function getInventoryPush() {
  return await generateInventoryPushSuggestions();
}
