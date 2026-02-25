import { Router } from 'express';
import { all } from '../db/index.js';
import { computePromotionBadges } from '../ai/menu-board-promotions.js';

const router = Router();

/**
 * GET /api/menu-board/data — public, no auth required
 *
 * Returns all menu-board brands with their categories, items, combos, and AI badges.
 */
router.get('/data', async (req, res) => {
  try {
    // Fetch menu-board brands
    const brands = await all(`
      SELECT id, name, slug, description, logo_url,
             primary_color, secondary_color, font_family, dark_bg, template_slug
      FROM virtual_brands
      WHERE display_type IN ('menu_board', 'both')
        AND active = true
      ORDER BY id
    `);

    if (brands.length === 0) {
      return res.json({ brands: [], combos: [], lastUpdated: new Date().toISOString() });
    }

    // Fetch all items for these brands in one query
    const brandIds = brands.map(b => b.id);
    const placeholders = brandIds.map(() => '?').join(',');

    const rows = await all(`
      SELECT
        vbi.virtual_brand_id,
        mi.id as item_id,
        COALESCE(vbi.custom_name, mi.name) as name,
        COALESCE(vbi.custom_price, mi.price) as price,
        mi.description,
        mi.image_url,
        mi.category_id,
        mc.name as category_name,
        mc.sort_order as category_sort
      FROM virtual_brand_items vbi
      JOIN menu_items mi ON mi.id = vbi.menu_item_id
      JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE vbi.virtual_brand_id IN (${placeholders})
        AND vbi.active = true
        AND mi.active = true
        AND mc.active = true
      ORDER BY mc.sort_order, mi.id
    `, brandIds);

    // Fetch combo definitions with their slots
    const combos = await all(`
      SELECT
        cd.id,
        cd.name,
        cd.description,
        cd.combo_price,
        cs.slot_label,
        cs.category_id as slot_category_id,
        cs.specific_item_id,
        cs.sort_order as slot_sort,
        mi.image_url as slot_item_image
      FROM combo_definitions cd
      JOIN combo_slots cs ON cs.combo_id = cd.id
      LEFT JOIN menu_items mi ON mi.id = cs.specific_item_id
      WHERE cd.active = true
      ORDER BY cd.id, cs.sort_order
    `);

    // Group combo slots by combo
    const comboMap = new Map();
    for (const row of combos) {
      if (!comboMap.has(row.id)) {
        comboMap.set(row.id, {
          id: row.id,
          name: row.name,
          description: row.description,
          comboPrice: row.combo_price,
          slots: [],
        });
      }
      comboMap.get(row.id).slots.push({
        label: row.slot_label,
        categoryId: row.slot_category_id,
        specificItemId: row.specific_item_id,
        itemImage: row.slot_item_image,
      });
    }

    // Calculate savings for each combo by summing cheapest items per slot
    const categoryMinPrices = await all(`
      SELECT category_id, MIN(price) as min_price
      FROM menu_items
      WHERE active = true
      GROUP BY category_id
    `);
    const minPriceMap = new Map(categoryMinPrices.map(r => [r.category_id, r.min_price]));

    const comboList = [];
    for (const combo of comboMap.values()) {
      let alaCarteMin = 0;
      for (const slot of combo.slots) {
        if (slot.specificItemId) {
          const item = await all('SELECT price FROM menu_items WHERE id = $1', [slot.specificItemId]);
          alaCarteMin += item[0]?.price || 0;
        } else if (slot.categoryId) {
          alaCarteMin += minPriceMap.get(slot.categoryId) || 0;
        }
      }
      comboList.push({
        ...combo,
        savings: Math.max(0, alaCarteMin - combo.comboPrice),
      });
    }

    // Collect all item IDs for badge computation
    const allItemIds = [...new Set(rows.map(r => r.item_id))];
    const badgeMap = await computePromotionBadges(allItemIds);

    // Group items by brand -> category
    const brandMap = new Map();
    for (const brand of brands) {
      brandMap.set(brand.id, {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logoUrl: brand.logo_url,
        templateSlug: brand.template_slug || null,
        theme: {
          primaryColor: brand.primary_color,
          secondaryColor: brand.secondary_color,
          fontFamily: brand.font_family,
          darkBg: brand.dark_bg,
        },
        categories: [],
        _categoryMap: new Map(),
      });
    }

    for (const row of rows) {
      const brand = brandMap.get(row.virtual_brand_id);
      if (!brand) continue;

      let category = brand._categoryMap.get(row.category_id);
      if (!category) {
        category = {
          id: row.category_id,
          name: row.category_name,
          sortOrder: row.category_sort,
          items: [],
        };
        brand._categoryMap.set(row.category_id, category);
        brand.categories.push(category);
      }

      const itemBadges = badgeMap.get(row.item_id) || [];
      category.items.push({
        id: row.item_id,
        name: row.name,
        price: row.price,
        description: row.description,
        imageUrl: row.image_url,
        badges: itemBadges,
      });
    }

    // Clean up internal maps and sort categories
    const result = [];
    for (const brand of brandMap.values()) {
      delete brand._categoryMap;
      brand.categories.sort((a, b) => a.sortOrder - b.sortOrder);
      for (const cat of brand.categories) {
        delete cat.sortOrder;
      }
      result.push(brand);
    }

    res.json({
      brands: result,
      combos: comboList,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Menu board data error:', error);
    res.status(500).json({ error: 'Failed to load menu board data' });
  }
});

export default router;
