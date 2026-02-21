import { Router } from 'express';
import Stripe from 'stripe';
import { requireOwner } from '../middleware/ownerAuth.js';
import { getTenant, updateTenant, getMasterDb } from '../tenants.js';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || null,
  pro: process.env.STRIPE_PRICE_PRO || null,
};

const BASE_URL = process.env.APP_URL || 'https://pos.desktop.kitchen';

/**
 * GET /api/billing — current subscription status
 */
router.get('/', requireOwner, (req, res) => {
  try {
    const tenant = getTenant(req.owner.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    res.json({
      plan: tenant.plan,
      subscription_status: tenant.subscription_status,
      stripe_customer_id: tenant.stripe_customer_id || null,
      stripe_subscription_id: tenant.stripe_subscription_id || null,
    });
  } catch (error) {
    console.error('Billing fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

/**
 * POST /api/billing/checkout — create Stripe Checkout session for plan upgrade
 * Body: { plan: 'starter' | 'pro' }
 */
router.post('/checkout', requireOwner, async (req, res) => {
  try {
    const { plan } = req.body;
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return res.status(400).json({ error: `Invalid plan or price not configured: ${plan}` });
    }

    const tenant = getTenant(req.owner.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    // Create or reuse Stripe customer
    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.owner_email,
        name: tenant.name,
        metadata: { tenant_id: tenant.id },
      });
      customerId = customer.id;
      updateTenant(tenant.id, { stripe_customer_id: customerId });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/#/admin?billing=success`,
      cancel_url: `${BASE_URL}/#/admin?billing=cancelled`,
      metadata: { tenant_id: tenant.id, plan },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/billing/portal — create Stripe Customer Portal session
 */
router.post('/portal', requireOwner, async (req, res) => {
  try {
    const tenant = getTenant(req.owner.tenantId);
    if (!tenant?.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account. Subscribe to a plan first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${BASE_URL}/#/admin`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(500).json({ error: 'Failed to create billing portal' });
  }
});

export default router;

/**
 * Stripe webhook handler — must be mounted BEFORE express.json() body parser
 * to receive raw body for signature verification.
 *
 * Usage in server/index.js:
 *   import { stripeWebhook } from './routes/billing.js';
 *   app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
 */
export function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[Billing] No STRIPE_WEBHOOK_SECRET configured — skipping webhook verification');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[Billing] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  function findTenantByCustomer(customerId) {
    const db = getMasterDb();
    return db.prepare('SELECT * FROM tenants WHERE stripe_customer_id = ?').get(customerId);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;
        const plan = session.metadata?.plan;
        if (tenantId && plan) {
          updateTenant(tenantId, {
            plan,
            stripe_subscription_id: session.subscription,
            subscription_status: 'active',
          });
          console.log(`[Billing] Tenant ${tenantId} upgraded to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const tenant = findTenantByCustomer(sub.customer);
        if (tenant) {
          updateTenant(tenant.id, {
            subscription_status: sub.status === 'active' ? 'active' : sub.status,
            stripe_subscription_id: sub.id,
          });
          console.log(`[Billing] Tenant ${tenant.id} subscription status: ${sub.status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const tenant = findTenantByCustomer(sub.customer);
        if (tenant) {
          updateTenant(tenant.id, {
            plan: 'trial',
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          });
          console.log(`[Billing] Tenant ${tenant.id} subscription cancelled`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const tenant = findTenantByCustomer(invoice.customer);
        if (tenant) {
          updateTenant(tenant.id, { subscription_status: 'past_due' });
          console.log(`[Billing] Tenant ${tenant.id} payment failed — marked past_due`);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Billing] Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
