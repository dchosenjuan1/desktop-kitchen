import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { getPlanLimits } from '../planLimits.js';

const router = Router();

// GET /api/delivery/platforms - list delivery platforms
router.get('/platforms', async (req, res) => {
  try {
    const platforms = await all('SELECT * FROM delivery_platforms ORDER BY display_name');
    res.json(platforms);
  } catch (error) {
    console.error('Error fetching delivery platforms:', error);
    res.status(500).json({ error: 'Failed to fetch delivery platforms' });
  }
});

// PUT /api/delivery/platforms/:id - update delivery platform
router.put('/platforms/:id', requireAuth('manage_delivery'), async (req, res) => {
  try {
    const plan = req.tenant?.plan || 'trial';
    if (!getPlanLimits(plan).delivery.functional) {
      return res.status(403).json({ error: 'Delivery management requires a paid plan', upgrade: true });
    }

    const { id } = req.params;
    const { display_name, commission_percent, active, webhook_secret } = req.body;

    const platform = await get('SELECT * FROM delivery_platforms WHERE id = $1', [id]);
    if (!platform) return res.status(404).json({ error: 'Platform not found' });

    await run(
      'UPDATE delivery_platforms SET display_name = $1, commission_percent = $2, active = $3, webhook_secret = $4 WHERE id = $5',
      [
        display_name ?? platform.display_name,
        commission_percent ?? platform.commission_percent,
        active !== undefined ? active : platform.active,
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
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT do2.*, dp.display_name as platform_name, o.order_number, o.status as order_status, o.total
      FROM delivery_orders do2
      JOIN delivery_platforms dp ON do2.platform_id = dp.id
      JOIN orders o ON do2.order_id = o.id
    `;
    const params = [];
    let paramIdx = 1;

    if (status) {
      query += ` WHERE do2.platform_status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY do2.id DESC LIMIT 50';

    const orders = await all(query, params);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({ error: 'Failed to fetch delivery orders' });
  }
});

// PUT /api/delivery/orders/:id/status - update delivery order status
router.put('/orders/:id/status', requireAuth('manage_delivery'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await get('SELECT * FROM delivery_orders WHERE id = $1', [id]);
    if (!order) return res.status(404).json({ error: 'Delivery order not found' });

    await run('UPDATE delivery_orders SET platform_status = $1 WHERE id = $2', [status, id]);
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
