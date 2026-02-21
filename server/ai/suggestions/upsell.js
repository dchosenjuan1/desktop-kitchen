import { all, get } from '../../db/index.js';
import { isRushHour, isSlowHour, getConfigBool } from '../config.js';

/**
 * Generate upsell suggestions based on the current cart contents.
 *
 * Rules:
 * - Cart has main but no drink → suggest cheapest drink (Priority 60)
 * - Cart has main but no side → suggest Chips & Guac or Rice & Beans (Priority 50)
 * - Cart items cost more than a Combo → suggest combo upgrade with savings (Priority 80)
 * - 1-2 tacos in cart → suggest 3-pack (Priority 55)
 * - Cart > $400 MXN, no dessert → suggest Churros (Priority 45)
 * - Rush hours → boost combo suggestions
 * - Slow period → suggest Family Pack
 */
export function generateCartUpsellSuggestions(cartItemIds, currentHour = new Date().getHours()) {
  if (!getConfigBool('upsell_enabled')) return [];

  const suggestions = [];

  if (!cartItemIds || cartItemIds.length === 0) return suggestions;

  // Get cart items with their categories
  const placeholders = cartItemIds.map(() => '?').join(',');
  const cartItems = all(`
    SELECT mi.id, mi.name, mi.price, mi.category_id, mc.name as category_name,
           COALESCE(acr.role, 'unknown') as role
    FROM menu_items mi
    JOIN menu_categories mc ON mi.category_id = mc.id
    LEFT JOIN ai_category_roles acr ON mi.category_id = acr.category_id
    WHERE mi.id IN (${placeholders})
  `, cartItemIds);

  if (cartItems.length === 0) return suggestions;

  const roles = cartItems.map(i => i.role);
  const categoryNames = cartItems.map(i => i.category_name);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);

  const hasMains = roles.includes('main');
  const hasDrink = roles.includes('drink');
  const hasSide = roles.includes('side');
  const hasCombo = roles.includes('combo');

  // Rule: Cart has main but no drink → suggest cheapest drink
  if (hasMains && !hasDrink) {
    const cheapestDrink = get(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      JOIN ai_category_roles acr ON mi.category_id = acr.category_id
      WHERE acr.role = 'drink' AND mi.active = 1
      ORDER BY mi.price ASC
      LIMIT 1
    `);

    if (cheapestDrink) {
      suggestions.push({
        type: 'upsell',
        priority: 60,
        data: {
          rule: 'missing_drink',
          suggested_item_id: cheapestDrink.id,
          suggested_item_name: cheapestDrink.name,
          suggested_item_price: cheapestDrink.price,
          message: `Add a ${cheapestDrink.name} to your order?`,
        },
      });
    }
  }

  // Rule: Cart has main but no side → suggest Chips & Guac or Rice & Beans
  if (hasMains && !hasSide && !hasCombo) {
    const sides = all(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      JOIN ai_category_roles acr ON mi.category_id = acr.category_id
      WHERE acr.role = 'side' AND mi.active = 1
        AND mi.name IN ('Chips & Guac', 'Rice & Beans')
      ORDER BY mi.price ASC
      LIMIT 1
    `);

    if (sides.length > 0) {
      const side = sides[0];
      suggestions.push({
        type: 'upsell',
        priority: 50,
        data: {
          rule: 'missing_side',
          suggested_item_id: side.id,
          suggested_item_name: side.name,
          suggested_item_price: side.price,
          message: `Complete your meal with ${side.name}!`,
        },
      });
    }
  }

  // Rule: Cart items cost more than a Combo → suggest combo upgrade
  if (hasMains && !hasCombo && getConfigBool('combo_upgrade_enabled')) {
    const combos = all(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      JOIN ai_category_roles acr ON mi.category_id = acr.category_id
      WHERE acr.role = 'combo' AND mi.active = 1
      ORDER BY mi.price ASC
    `);

    for (const combo of combos) {
      if (cartTotal > combo.price) {
        const savings = Math.round((cartTotal - combo.price) * 100) / 100;
        let priority = 80;

        // Boost during rush hours
        if (isRushHour(currentHour)) {
          priority = 85;
        }

        suggestions.push({
          type: 'upsell',
          priority,
          data: {
            rule: 'combo_upgrade',
            suggested_item_id: combo.id,
            suggested_item_name: combo.name,
            suggested_item_price: combo.price,
            savings,
            message: `Upgrade to ${combo.name} and save ${savings} MXN!`,
          },
        });
        break; // Only suggest the cheapest combo that saves money
      }
    }
  }

  // Rule: 1-2 tacos in cart → suggest 3-pack
  const tacoItems = cartItems.filter(i =>
    i.category_name === 'Tacos' && !i.name.includes('(3)')
  );
  if (tacoItems.length >= 1 && tacoItems.length <= 2) {
    const tacoPack = get(`
      SELECT mi.id, mi.name, mi.price
      FROM menu_items mi
      WHERE mi.name LIKE '%Street Tacos%' AND mi.active = 1
      LIMIT 1
    `);

    if (tacoPack) {
      const currentTacoTotal = tacoItems.reduce((sum, t) => sum + t.price, 0);
      if (currentTacoTotal > tacoPack.price * 0.8) {
        suggestions.push({
          type: 'upsell',
          priority: 55,
          data: {
            rule: 'taco_3pack',
            suggested_item_id: tacoPack.id,
            suggested_item_name: tacoPack.name,
            suggested_item_price: tacoPack.price,
            message: `Get the ${tacoPack.name} for a better deal!`,
          },
        });
      }
    }
  }

  // Rule: Cart > $400 MXN, no dessert → suggest Churros
  if (cartTotal > 400) {
    const hasDessert = cartItems.some(i => i.name === 'Churros');
    if (!hasDessert) {
      const churros = get(`
        SELECT mi.id, mi.name, mi.price
        FROM menu_items mi
        WHERE mi.name = 'Churros' AND mi.active = 1
        LIMIT 1
      `);

      if (churros) {
        suggestions.push({
          type: 'upsell',
          priority: 45,
          data: {
            rule: 'dessert_upsell',
            suggested_item_id: churros.id,
            suggested_item_name: churros.name,
            suggested_item_price: churros.price,
            message: `Big order! Treat yourself to Churros for just ${churros.price} MXN`,
          },
        });
      }
    }
  }

  // Time-based: Slow period → suggest Family Pack
  if (isSlowHour(currentHour)) {
    const hasLargeOrder = cartItems.length >= 3;
    if (hasLargeOrder && !hasCombo) {
      const familyPack = get(`
        SELECT mi.id, mi.name, mi.price
        FROM menu_items mi
        WHERE mi.name LIKE '%Family Pack%' AND mi.active = 1
        LIMIT 1
      `);

      if (familyPack && cartTotal > familyPack.price * 0.7) {
        suggestions.push({
          type: 'upsell',
          priority: 55,
          data: {
            rule: 'family_pack_slow',
            suggested_item_id: familyPack.id,
            suggested_item_name: familyPack.name,
            suggested_item_price: familyPack.price,
            message: `Family Pack special - great value for a group!`,
          },
        });
      }
    }
  }

  // Sort by priority descending and limit
  suggestions.sort((a, b) => b.priority - a.priority);
  return suggestions.slice(0, 3);
}
