import { Router } from 'express';
import { all, get, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  normalizePhone,
  findOrCreateCustomer,
  addStampsForOrder,
  addBonusStamps,
  redeemReward,
  getCustomerWithCard,
  getActiveStampCard,
  getLoyaltyConfig,
  updateLoyaltyConfig,
} from '../helpers/loyalty.js';

const router = Router();

/* ==================== Customer Endpoints ==================== */

// GET /customers — List/search (paginated)
router.get('/customers', requireAuth('manage_loyalty'), (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [];

    if (search) {
      where = `WHERE name LIKE ? OR phone LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const countResult = get(`SELECT COUNT(*) as total FROM loyalty_customers ${where}`, params);
    const customers = all(
      `SELECT * FROM loyalty_customers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Attach active stamp card to each customer
    const enriched = customers.map((c) => {
      const card = getActiveStampCard(c.id);
      return { ...c, activeCard: card };
    });

    res.json({ data: enriched, total: countResult.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /customers/:id — Detail + stamp cards + events
router.get('/customers/:id', requireAuth('manage_loyalty'), (req, res) => {
  try {
    const data = getCustomerWithCard(parseInt(req.params.id));
    if (!data) return res.status(404).json({ error: 'Customer not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /customers/phone/:phone — Lookup by phone (POS checkout)
router.get('/customers/phone/:phone', requireAuth('pos_access'), (req, res) => {
  try {
    const normalized = normalizePhone(req.params.phone);
    const customer = get('SELECT * FROM loyalty_customers WHERE phone = ?', [normalized]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const activeCard = getActiveStampCard(customer.id);
    res.json({ ...customer, activeCard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /customers — Register new customer
router.post('/customers', requireAuth('pos_access'), async (req, res) => {
  try {
    const { phone, name, referral_code_used, sms_opt_in } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'Phone and name are required' });

    const normalized = normalizePhone(phone);
    if (normalized.length < 10) return res.status(400).json({ error: 'Invalid phone number' });

    const { customer, created } = await findOrCreateCustomer(normalized, name, referral_code_used, sms_opt_in);

    if (!created && sms_opt_in !== undefined) {
      run('UPDATE loyalty_customers SET sms_opt_in = ? WHERE id = ?', [sms_opt_in ? 1 : 0, customer.id]);
    }

    const activeCard = getActiveStampCard(customer.id);
    res.status(created ? 201 : 200).json({ ...customer, activeCard, created });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A customer with this phone number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /customers/:id — Update customer info
router.put('/customers/:id', requireAuth('manage_loyalty'), (req, res) => {
  try {
    const { name, sms_opt_in } = req.body;
    const id = parseInt(req.params.id);
    const customer = get('SELECT * FROM loyalty_customers WHERE id = ?', [id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (name !== undefined) run('UPDATE loyalty_customers SET name = ? WHERE id = ?', [name, id]);
    if (sms_opt_in !== undefined) run('UPDATE loyalty_customers SET sms_opt_in = ? WHERE id = ?', [sms_opt_in ? 1 : 0, id]);

    res.json(get('SELECT * FROM loyalty_customers WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Stamp Operations ==================== */

// POST /customers/:id/stamps — Add stamp after payment
router.post('/customers/:id/stamps', requireAuth('pos_access'), async (req, res) => {
  try {
    const { order_id } = req.body;
    const customerId = parseInt(req.params.id);

    const customer = get('SELECT * FROM loyalty_customers WHERE id = ?', [customerId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const result = await addStampsForOrder(customerId, order_id);

    // Update total_spent from order
    if (order_id) {
      const order = get('SELECT total FROM orders WHERE id = ?', [order_id]);
      if (order) {
        run('UPDATE loyalty_customers SET total_spent = total_spent + ? WHERE id = ?', [order.total, customerId]);
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /customers/:id/stamps/manual — Manager manual stamp add
router.post('/customers/:id/stamps/manual', requireAuth('manage_loyalty'), (req, res) => {
  try {
    const { count = 1 } = req.body;
    const customerId = parseInt(req.params.id);

    const customer = get('SELECT * FROM loyalty_customers WHERE id = ?', [customerId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const card = addBonusStamps(customerId, parseInt(count), 'manual');
    const updatedCustomer = get('SELECT * FROM loyalty_customers WHERE id = ?', [customerId]);

    res.json({ stampCard: card, customer: updatedCustomer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /customers/:id/redeem — Redeem completed card
router.post('/customers/:id/redeem', requireAuth('pos_access'), (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const customer = get('SELECT * FROM loyalty_customers WHERE id = ?', [customerId]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Find the oldest completed but unredeemed card
    const card = get(
      'SELECT * FROM stamp_cards WHERE customer_id = ? AND completed = 1 AND redeemed = 0 ORDER BY completed_at ASC LIMIT 1',
      [customerId]
    );
    if (!card) return res.status(400).json({ error: 'No completed cards available to redeem' });

    const redeemed = redeemReward(card.id);
    res.json(redeemed);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ==================== Analytics ==================== */

// GET /analytics — Metrics
router.get('/analytics', requireAuth('manage_loyalty'), (req, res) => {
  try {
    const totalMembers = get('SELECT COUNT(*) as count FROM loyalty_customers')?.count || 0;

    const newThisMonth = get(
      `SELECT COUNT(*) as count FROM loyalty_customers
       WHERE created_at >= date('now', 'start of month', 'localtime')`
    )?.count || 0;

    const activeCards = get(
      'SELECT COUNT(*) as count FROM stamp_cards WHERE completed = 0'
    )?.count || 0;

    const completedCards = get(
      'SELECT COUNT(*) as count FROM stamp_cards WHERE completed = 1'
    )?.count || 0;

    const redeemedCards = get(
      'SELECT COUNT(*) as count FROM stamp_cards WHERE redeemed = 1'
    )?.count || 0;

    const redemptionRate = completedCards > 0
      ? Math.round((redeemedCards / completedCards) * 100)
      : 0;

    const topCustomers = all(
      `SELECT id, name, phone, stamps_earned, orders_count, total_spent, last_visit
       FROM loyalty_customers ORDER BY total_spent DESC LIMIT 10`
    );

    const signupsByMonth = all(
      `SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
       FROM loyalty_customers
       GROUP BY month ORDER BY month DESC LIMIT 12`
    );

    res.json({
      totalMembers,
      newThisMonth,
      activeCards,
      completedCards,
      redeemedCards,
      redemptionRate,
      topCustomers,
      signupsByMonth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Referrals ==================== */

// GET /referrals — Referral leaderboard
router.get('/referrals', requireAuth('manage_loyalty'), (req, res) => {
  try {
    const leaderboard = all(
      `SELECT lc.id, lc.name, lc.phone, lc.referral_code,
              COUNT(re.id) as referral_count,
              SUM(re.referrer_stamps_added) as total_bonus_stamps
       FROM loyalty_customers lc
       LEFT JOIN referral_events re ON re.referrer_id = lc.id
       GROUP BY lc.id
       HAVING referral_count > 0
       ORDER BY referral_count DESC
       LIMIT 20`
    );

    const recentReferrals = all(
      `SELECT re.*,
              r.name as referrer_name, r.phone as referrer_phone,
              e.name as referee_name, e.phone as referee_phone
       FROM referral_events re
       JOIN loyalty_customers r ON r.id = re.referrer_id
       JOIN loyalty_customers e ON e.id = re.referee_id
       ORDER BY re.created_at DESC LIMIT 20`
    );

    const totalReferrals = get('SELECT COUNT(*) as count FROM referral_events')?.count || 0;

    res.json({ leaderboard, recentReferrals, totalReferrals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==================== Config ==================== */

// GET /config — Get loyalty settings
router.get('/config', requireAuth('manage_loyalty'), (req, res) => {
  try {
    res.json(getLoyaltyConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /config — Update loyalty settings
router.put('/config', requireAuth('manage_loyalty'), (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) return res.status(400).json({ error: 'Key and value are required' });

    updateLoyaltyConfig(key, String(value));
    res.json(getLoyaltyConfig());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
