export default {
  id: 'general',
  name: 'General / Custom',
  description: 'Plantilla minima para cualquier tipo de restaurante',
  icon: 'restaurant',

  categories: [
    { name: 'Main Dishes', sort_order: 1 },
    { name: 'Sides', sort_order: 2 },
    { name: 'Drinks', sort_order: 3 },
  ],

  items: [
    { name: 'Plato Principal', category: 'Main Dishes', price: 85, description: 'Plato fuerte del dia', prep_time_minutes: 12 },
    { name: 'Guarnicion', category: 'Sides', price: 35, description: 'Guarnicion a elegir', prep_time_minutes: 5 },
    { name: 'Agua Natural', category: 'Drinks', price: 25, description: 'Agua embotellada (500ml)', prep_time_minutes: 1 },
    { name: 'Refresco', category: 'Drinks', price: 30, description: 'Refresco de lata (355ml)', prep_time_minutes: 1 },
    { name: 'Jugo Natural', category: 'Drinks', price: 35, description: 'Jugo natural de temporada', prep_time_minutes: 4 },
    { name: 'Postre del Dia', category: 'Main Dishes', price: 45, description: 'Postre preparado del dia', prep_time_minutes: 3 },
  ],

  inventory: [
    { name: 'Aceite Vegetal', unit: 'lt', quantity: 10, low_stock_threshold: 3, category: 'Insumos', cost_price: 35 },
    { name: 'Sal', unit: 'kg', quantity: 5, low_stock_threshold: 1, category: 'Insumos', cost_price: 12 },
    { name: 'Azucar', unit: 'kg', quantity: 5, low_stock_threshold: 1, category: 'Insumos', cost_price: 25 },
    { name: 'Arroz', unit: 'kg', quantity: 10, low_stock_threshold: 3, category: 'Granos', cost_price: 22 },
    { name: 'Frijoles', unit: 'kg', quantity: 5, low_stock_threshold: 1.5, category: 'Granos', cost_price: 28 },
    { name: 'Cebolla', unit: 'kg', quantity: 5, low_stock_threshold: 1.5, category: 'Verduras', cost_price: 18 },
    { name: 'Tomate', unit: 'kg', quantity: 5, low_stock_threshold: 1.5, category: 'Verduras', cost_price: 30 },
    { name: 'Limones', unit: 'kg', quantity: 3, low_stock_threshold: 1, category: 'Verduras', cost_price: 30 },
    { name: 'Servilletas', unit: 'pza', quantity: 500, low_stock_threshold: 100, category: 'Desechables', cost_price: 0.5 },
    { name: 'Vasos Desechables', unit: 'pza', quantity: 200, low_stock_threshold: 50, category: 'Desechables', cost_price: 1.5 },
  ],

  recipes: [
    { item_name: 'Plato Principal', ingredient_name: 'Arroz', quantity_used: 0.10 },
    { item_name: 'Plato Principal', ingredient_name: 'Frijoles', quantity_used: 0.06 },
    { item_name: 'Plato Principal', ingredient_name: 'Aceite Vegetal', quantity_used: 0.03 },
    { item_name: 'Guarnicion', ingredient_name: 'Arroz', quantity_used: 0.08 },
    { item_name: 'Guarnicion', ingredient_name: 'Aceite Vegetal', quantity_used: 0.02 },
    { item_name: 'Jugo Natural', ingredient_name: 'Azucar', quantity_used: 0.03 },
    { item_name: 'Jugo Natural', ingredient_name: 'Limones', quantity_used: 0.08 },
  ],

  modifier_groups: [],

  combos: [],
};
