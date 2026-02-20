import { Router } from 'express';
import { all, get, run, exec } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendSMS } from '../helpers/twilio.js';

const router = Router();

// ==================== P&L Analytics ====================

/**
 * GET /api/delivery/analytics — delivery P&L breakdown
 * Query: ?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get('/analytics', requireAuth('view_reports'), (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const endDate = end || new Date().toISOString().slice(0, 10);

    // Revenue and commission per platform
    const platformStats = all(`
      SELECT
        dp.id as platform_id,
        dp.name,
        dp.display_name,
        dp.commission_percent,
        COUNT(do2.id) as order_count,
        COALESCE(SUM(o.total), 0) as gross_revenue,
        COALESCE(SUM(do2.platform_commission), 0) as total_commission,
        COALESCE(SUM(do2.delivery_fee), 0) as total_delivery_fees,
        COALESCE(SUM(o.total) - SUM(do2.platform_commission), 0) as net_revenue,
        COALESCE(AVG(o.total), 0) as avg_order_value
      FROM delivery_platforms dp
      LEFT JOIN delivery_orders do2 ON do2.platform_id = dp.id
      LEFT JOIN orders o ON o.id = do2.order_id
        AND date(o.created_at) >= ? AND date(o.created_at) <= ?
      GROUP BY dp.id
      ORDER BY gross_revenue DESC
    `, [startDate, endDate]);

    // POS vs delivery comparison
    const posStats = get(`
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(AVG(total), 0) as avg_order
      FROM orders
      WHERE source = 'pos'
        AND date(created_at) >= ? AND date(created_at) <= ?
        AND status NOT IN ('cancelled')
    `, [startDate, endDate]);

    const deliveryStats = get(`
      SELECT
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(AVG(total), 0) as avg_order
      FROM orders
      WHERE source != 'pos'
        AND date(created_at) >= ? AND date(created_at) <= ?
        AND status NOT IN ('cancelled')
    `, [startDate, endDate]);

    // Daily trend
    const dailyTrend = all(`
      SELECT
        date(o.created_at) as day,
        o.source,
        COUNT(*) as orders,
        COALESCE(SUM(o.total), 0) as revenue
      FROM orders o
      WHERE date(o.created_at) >= ? AND date(o.created_at) <= ?
        AND o.status NOT IN ('cancelled')
      GROUP BY day, o.source
      ORDER BY day
    `, [startDate, endDate]);

    res.json({
      period: { start: startDate, end: endDate },
      platforms: platformStats,
      pos: posStats,
      delivery: deliveryStats,
      dailyTrend,
    });
  } catch (error) {
    console.error('Delivery analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch delivery analytics' });
  }
});

// ==================== Markup Rules ====================

/**
 * GET /api/delivery/markup-rules — list all markup rules
 */
router.get('/markup-rules', requireAuth('manage_delivery'), (req, res) => {
  try {
    const rules = all(`
      SELECT dmr.*,
        dp.display_name as platform_name,
        mi.name as item_name,
        mc.name as category_name
      FROM delivery_markup_rules dmr
      JOIN delivery_platforms dp ON dp.id = dmr.platform_id
      LEFT JOIN menu_items mi ON mi.id = dmr.menu_item_id
      LEFT JOIN menu_categories mc ON mc.id = dmr.category_id
      ORDER BY dp.display_name, dmr.id
    `);
    res.json(rules);
  } catch (error) {
    console.error('Markup rules fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch markup rules' });
  }
});

/**
 * POST /api/delivery/markup-rules — create a markup rule
 * Body: { platform_id, menu_item_id?, category_id?, markup_type, markup_value }
 */
router.post('/markup-rules', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { platform_id, menu_item_id, category_id, markup_type, markup_value } = req.body;

    if (!platform_id || markup_value === undefined) {
      return res.status(400).json({ error: 'platform_id and markup_value required' });
    }
    if (!menu_item_id && !category_id) {
      return res.status(400).json({ error: 'Either menu_item_id or category_id required' });
    }

    const result = run(
      `INSERT INTO delivery_markup_rules (platform_id, menu_item_id, category_id, markup_type, markup_value)
       VALUES (?, ?, ?, ?, ?)`,
      [platform_id, menu_item_id || null, category_id || null, markup_type || 'percent', markup_value]
    );

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    if (error.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Markup rule already exists for this platform/item combination' });
    }
    console.error('Markup rule create error:', error);
    res.status(500).json({ error: 'Failed to create markup rule' });
  }
});

/**
 * PUT /api/delivery/markup-rules/:id — update a markup rule
 */
router.put('/markup-rules/:id', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { id } = req.params;
    const { markup_type, markup_value, active } = req.body;

    const rule = get('SELECT * FROM delivery_markup_rules WHERE id = ?', [id]);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    run(
      `UPDATE delivery_markup_rules SET markup_type = ?, markup_value = ?, active = ? WHERE id = ?`,
      [markup_type ?? rule.markup_type, markup_value ?? rule.markup_value, active !== undefined ? (active ? 1 : 0) : rule.active, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Markup rule update error:', error);
    res.status(500).json({ error: 'Failed to update markup rule' });
  }
});

/**
 * DELETE /api/delivery/markup-rules/:id
 */
router.delete('/markup-rules/:id', requireAuth('manage_delivery'), (req, res) => {
  try {
    run('DELETE FROM delivery_markup_rules WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Markup rule delete error:', error);
    res.status(500).json({ error: 'Failed to delete markup rule' });
  }
});

/**
 * GET /api/delivery/markup-preview/:platformId — preview menu with markups applied
 */
router.get('/markup-preview/:platformId', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { platformId } = req.params;

    const items = all(`
      SELECT
        mi.id, mi.name, mi.price as base_price,
        mc.name as category_name,
        COALESCE(dmr_item.markup_value, dmr_cat.markup_value, dp.default_markup_percent, 0) as markup_value,
        COALESCE(dmr_item.markup_type, dmr_cat.markup_type, 'percent') as markup_type,
        CASE
          WHEN COALESCE(dmr_item.markup_type, dmr_cat.markup_type, 'percent') = 'percent'
          THEN mi.price * (1 + COALESCE(dmr_item.markup_value, dmr_cat.markup_value, dp.default_markup_percent, 0) / 100.0)
          ELSE mi.price + COALESCE(dmr_item.markup_value, dmr_cat.markup_value, 0)
        END as delivery_price
      FROM menu_items mi
      JOIN menu_categories mc ON mc.id = mi.category_id
      CROSS JOIN delivery_platforms dp ON dp.id = ?
      LEFT JOIN delivery_markup_rules dmr_item ON dmr_item.platform_id = dp.id AND dmr_item.menu_item_id = mi.id AND dmr_item.active = 1
      LEFT JOIN delivery_markup_rules dmr_cat ON dmr_cat.platform_id = dp.id AND dmr_cat.category_id = mi.category_id AND dmr_cat.active = 1
      WHERE mi.active = 1
      ORDER BY mc.sort_order, mi.name
    `, [platformId]);

    res.json(items);
  } catch (error) {
    console.error('Markup preview error:', error);
    res.status(500).json({ error: 'Failed to generate markup preview' });
  }
});

// ==================== Virtual Brands ====================

/**
 * GET /api/delivery/virtual-brands — list virtual brands
 */
router.get('/virtual-brands', requireAuth('manage_delivery'), (req, res) => {
  try {
    const brands = all(`
      SELECT vb.*,
        dp.display_name as platform_name,
        (SELECT COUNT(*) FROM virtual_brand_items WHERE virtual_brand_id = vb.id AND active = 1) as item_count
      FROM virtual_brands vb
      JOIN delivery_platforms dp ON dp.id = vb.platform_id
      ORDER BY vb.name
    `);
    res.json(brands);
  } catch (error) {
    console.error('Virtual brands fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch virtual brands' });
  }
});

/**
 * POST /api/delivery/virtual-brands — create virtual brand
 * Body: { name, platform_id, description?, logo_url? }
 */
router.post('/virtual-brands', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { name, platform_id, description, logo_url } = req.body;
    if (!name || !platform_id) {
      return res.status(400).json({ error: 'name and platform_id required' });
    }

    const result = run(
      `INSERT INTO virtual_brands (name, platform_id, description, logo_url) VALUES (?, ?, ?, ?)`,
      [name, platform_id, description || null, logo_url || null]
    );

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Virtual brand create error:', error);
    res.status(500).json({ error: 'Failed to create virtual brand' });
  }
});

/**
 * PUT /api/delivery/virtual-brands/:id
 */
router.put('/virtual-brands/:id', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, logo_url, active } = req.body;

    const brand = get('SELECT * FROM virtual_brands WHERE id = ?', [id]);
    if (!brand) return res.status(404).json({ error: 'Virtual brand not found' });

    run(
      `UPDATE virtual_brands SET name = ?, description = ?, logo_url = ?, active = ? WHERE id = ?`,
      [name ?? brand.name, description ?? brand.description, logo_url ?? brand.logo_url, active !== undefined ? (active ? 1 : 0) : brand.active, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Virtual brand update error:', error);
    res.status(500).json({ error: 'Failed to update virtual brand' });
  }
});

/**
 * POST /api/delivery/virtual-brands/:id/items — assign items to virtual brand
 * Body: { items: [{ menu_item_id, custom_name?, custom_price? }] }
 */
router.post('/virtual-brands/:id/items', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array required' });
    }

    const brand = get('SELECT * FROM virtual_brands WHERE id = ?', [id]);
    if (!brand) return res.status(404).json({ error: 'Virtual brand not found' });

    for (const item of items) {
      run(
        `INSERT OR REPLACE INTO virtual_brand_items (virtual_brand_id, menu_item_id, custom_name, custom_price, active)
         VALUES (?, ?, ?, ?, 1)`,
        [id, item.menu_item_id, item.custom_name || null, item.custom_price || null]
      );
    }

    res.json({ success: true, count: items.length });
  } catch (error) {
    console.error('Virtual brand items error:', error);
    res.status(500).json({ error: 'Failed to assign items' });
  }
});

/**
 * GET /api/delivery/virtual-brands/:id/items — get items for a virtual brand
 */
router.get('/virtual-brands/:id/items', requireAuth('manage_delivery'), (req, res) => {
  try {
    const items = all(`
      SELECT vbi.*, mi.name as original_name, mi.price as original_price, mc.name as category_name
      FROM virtual_brand_items vbi
      JOIN menu_items mi ON mi.id = vbi.menu_item_id
      JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE vbi.virtual_brand_id = ?
      ORDER BY mc.sort_order, mi.name
    `, [req.params.id]);

    res.json(items);
  } catch (error) {
    console.error('Virtual brand items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch virtual brand items' });
  }
});

// ==================== Customer Recapture ====================

/**
 * GET /api/delivery/recapture/candidates — delivery-only customers to win back
 * Returns customers who ordered via delivery but never via POS
 */
router.get('/recapture/candidates', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { days } = req.query;
    const lookbackDays = days || 60;

    const candidates = all(`
      SELECT
        do2.customer_name,
        do2.id as delivery_order_id,
        dp.display_name as platform,
        o.total as last_order_total,
        o.created_at as last_order_date,
        dr.sms_sent_at,
        dr.converted
      FROM delivery_orders do2
      JOIN orders o ON o.id = do2.order_id
      JOIN delivery_platforms dp ON dp.id = do2.platform_id
      LEFT JOIN delivery_recapture dr ON dr.last_delivery_order_id = do2.id
      WHERE do2.customer_name IS NOT NULL
        AND do2.customer_name != ''
        AND date(o.created_at) >= date('now', '-' || ? || ' days')
      GROUP BY do2.customer_name
      HAVING MAX(o.created_at) = o.created_at
      ORDER BY o.created_at DESC
      LIMIT 50
    `, [lookbackDays]);

    res.json(candidates);
  } catch (error) {
    console.error('Recapture candidates error:', error);
    res.status(500).json({ error: 'Failed to fetch recapture candidates' });
  }
});

/**
 * POST /api/delivery/recapture/send — send recapture SMS
 * Body: { phone, customer_name, platform, delivery_order_id, message? }
 */
router.post('/recapture/send', requireAuth('manage_delivery'), async (req, res) => {
  try {
    const { phone, customer_name, platform, delivery_order_id, message } = req.body;

    if (!phone || !customer_name) {
      return res.status(400).json({ error: 'phone and customer_name required' });
    }

    const defaultMsg = `Hey ${customer_name}! We noticed you love ordering from us on ${platform}. Visit us in-store for 10% off your next order! Show this text at checkout. — Juanberto's`;
    const body = message || defaultMsg;

    const sid = await sendSMS(phone, body);

    // Track recapture attempt
    run(
      `INSERT INTO delivery_recapture (customer_phone, customer_name, platform, last_delivery_order_id, sms_sent_at)
       VALUES (?, ?, ?, ?, datetime('now','localtime'))`,
      [phone, customer_name, platform, delivery_order_id || null]
    );

    res.json({ success: !!sid, twilio_sid: sid });
  } catch (error) {
    console.error('Recapture send error:', error);
    res.status(500).json({ error: 'Failed to send recapture SMS' });
  }
});

/**
 * POST /api/delivery/recapture/:id/convert — mark recapture as converted
 */
router.post('/recapture/:id/convert', requireAuth('manage_delivery'), (req, res) => {
  try {
    run('UPDATE delivery_recapture SET converted = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Recapture convert error:', error);
    res.status(500).json({ error: 'Failed to mark conversion' });
  }
});

export default router;
