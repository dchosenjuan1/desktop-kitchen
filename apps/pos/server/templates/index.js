import taqueria from './taqueria.js';
import burger from './burger.js';
import pizzeria from './pizzeria.js';
import coffee from './coffee.js';
import sushi from './sushi.js';
import general from './general.js';

const TEMPLATES = { taqueria, burger, pizzeria, coffee, sushi, general };

export const TEMPLATE_LIST = Object.values(TEMPLATES).map(t => ({
  id: t.id,
  name: t.name,
  description: t.description,
  icon: t.icon,
  item_count: t.items.length,
  category_count: t.categories.length,
}));

export function getTemplate(id) {
  return TEMPLATES[id] || null;
}

export { TEMPLATES };
