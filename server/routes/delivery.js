import { Router } from 'express';
import { all, get, run } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/delivery/platforms - list delivery platforms
router.get('/platforms', (req, res) => {
  try {
    const platforms = all('SELECT * FROM delivery_platforms ORDER BY display_name');
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching delivery platforms:', error);
    res.status(500).json({ error: 'Failed to fetch delivery platforms' });
  }
});

// PUT /api/delivery/platforms/:id - update delivery platform
router.put('/platforms/:id', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, commission_percent, active, webhook_secret } = req.body;

    const platform = get('SELECT * FROM delivery_platforms WHERE id = ?', [id]);
    if (!platform) return res.status(404).json({ error: 'Platform not found' });

    run(
      'UPDATE delivery_platforms SET display_name = ?, commission_percent = ?, active = ?, webhook_secret = ? WHERE id = ?',
      [
        display_name ?? platform.display_name,
        commission_percent ?? platform.commission_percent,
        active !== undefined ? (active ? 1 : 0) : platform.active,
        webhook_secret ?? platform.webhook_secret,
        id,
      ]
    );

    res.json({ id, success: true });
  } catch (error) {
    console.error('Error updating delivery platform:', error);
    res.status(500).json({ error: 'Failed to update delivery platform' });
  }
});

// GET /api/delivery/orders - list delivery orders
router.get('/orders', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT do.*, dp.display_name as platform_name, o.order_number, o.status as order_status, o.total
      FROM delivery_orders do
      JOIN delivery_platforms dp ON do.platform_id = dp.id
      JOIN orders o ON do.order_id = o.id
    `;
    const params = [];

    if (status) {
      query += ' WHERE do.platform_status = ?';
      params.push(status);
    }

    query += ' ORDER BY do.id DESC LIMIT 50';

    const orders = all(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({ error: 'Failed to fetch delivery orders' });
  }
});

// PUT /api/delivery/orders/:id/status - update delivery order status
router.put('/orders/:id/status', requireAuth('manage_delivery'), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = get('SELECT * FROM delivery_orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ error: 'Delivery order not found' });

    run('UPDATE delivery_orders SET platform_status = ? WHERE id = ?', [status, id]);
    res.json({ id, status, success: true });
  } catch (error) {
    console.error('Error updating delivery order status:', error);
    res.status(500).json({ error: 'Failed to update delivery order status' });
  }
});

// POST /api/delivery/webhook/uber-eats - Uber Eats webhook
router.post('/webhook/uber-eats', (req, res) => {
  try {
    const payload = req.body;
    // TODO: Validate webhook signature with webhook_secret
    // TODO: Parse Uber Eats order format and create internal order
    console.log('Uber Eats webhook received:', JSON.stringify(payload).slice(0, 200));
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Uber Eats webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/delivery/webhook/rappi - Rappi webhook
router.post('/webhook/rappi', (req, res) => {
  try {
    const payload = req.body;
    console.log('Rappi webhook received:', JSON.stringify(payload).slice(0, 200));
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Rappi webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /api/delivery/webhook/didi - DiDi Food webhook
router.post('/webhook/didi', (req, res) => {
  try {
    const payload = req.body;
    console.log('DiDi Food webhook received:', JSON.stringify(payload).slice(0, 200));
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('DiDi Food webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
