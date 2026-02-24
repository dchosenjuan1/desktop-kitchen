import { Router } from 'express';
import crypto from 'crypto';
import { all, get, run, adminSql } from '../db/index.js';
import { createPaymentIntent, createRefund, getPaymentIntent } from '../stripe.js';
import {
  createCryptoPayment as npCreatePayment,
  getCryptoPaymentStatus as npGetStatus,
  getEstimate as npGetEstimate,
  getMinAmount as npGetMinAmount,
  verifyIPNSignature,
} from '../nowpayments.js';
import { requireAuth } from '../middleware/auth.js';
import { deductInventoryForOrder, restoreInventoryForItems } from '../helpers/inventory.js';
import { generateInvoiceToken } from '../helpers/facturapi.js';
import { getTenant } from '../tenants.js';
import {
  ensureFreshToken,
  getTerminals as mpGetTerminals,
  createPointOrder,
  cancelPointOrder,
} from '../services/mercadopago.js';
import { getServiceCredentials } from '../helpers/tenantCredentials.js';

const router = Router();

// POST /api/payments/create-intent - create Stripe PaymentIntent for an order
router.post('/create-intent', requireAuth('pos_access'), async (req, res) => {
  try {
    const { order_id, tip = 0 } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const order = await get(`
      SELECT id, order_number, subtotal, tax, total, payment_status
      FROM orders
      WHERE id = $1
    `, [order_id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    const tipAmount = typeof tip === 'number' ? tip : 0;
    const totalAmount = order.total + tipAmount;

    const paymentIntent = await createPaymentIntent(totalAmount, {
      order_id: order_id.toString(),
      order_number: order.order_number.toString(),
    });

    // Update order with payment intent ID
    await run(`
      UPDATE orders
      SET payment_intent_id = $1, tip = $2
      WHERE id = $3
    `, [paymentIntent.id, tipAmount, order_id]);

    res.json({
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount: totalAmount,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// POST /api/payments/confirm - confirm card payment
router.post('/confirm', requireAuth('pos_access'), async (req, res) => {
  try {
    const { order_id, payment_intent_id } = req.body;

    if (!order_id || !payment_intent_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = await get('SELECT id, payment_status FROM orders WHERE id = $1', [order_id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify payment intent status
    const paymentIntent = await getPaymentIntent(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      await run(`
        UPDATE orders
        SET payment_status = 'paid', status = 'preparing', payment_method = 'card'
        WHERE id = $1
      `, [order_id]);

      // Deduct inventory after successful payment
      await deductInventoryForOrder(order_id);

      // Auto-generate invoice token for self-service CFDI
      let invoice_token = null;
      try {
        const tenantId = req.tenant?.id || 'default';
        invoice_token = await generateInvoiceToken(tenantId, order_id, 72);
        await run('UPDATE orders SET invoice_token = $1 WHERE id = $2', [invoice_token, order_id]);
      } catch (tokenErr) {
        console.error('Non-fatal: failed to generate invoice token:', tokenErr.message);
      }

      return res.json({
        success: true,
        message: 'Payment confirmed',
        payment_status: 'paid',
        invoice_token,
      });
    } else if (paymentIntent.status === 'processing') {
      return res.json({
        success: true,
        message: 'Payment is processing',
        payment_status: 'processing',
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment failed',
        payment_status: 'failed',
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// POST /api/payments/cash - process cash payment
router.post('/cash', requireAuth('pos_access'), async (req, res) => {
  try {
    const { order_id, tip = 0, amount_received = 0 } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const order = await get(`
      SELECT id, order_number, subtotal, tax, tip, total, payment_status
      FROM orders
      WHERE id = $1
    `, [order_id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    const tipAmount = typeof tip === 'number' ? tip : 0;
    const finalTotal = order.total + tipAmount;
    const changeDue = amount_received > 0 ? Math.max(0, amount_received - finalTotal) : 0;

    // Mark order as paid with cash
    await run(`
      UPDATE orders
      SET payment_status = 'paid', status = 'preparing', payment_method = 'cash', tip = $1
      WHERE id = $2
    `, [tipAmount, order_id]);

    // Deduct inventory
    await deductInventoryForOrder(order_id);

    // Auto-generate invoice token for self-service CFDI
    let invoice_token = null;
    try {
      const tenantId = req.tenant?.id || 'default';
      invoice_token = await generateInvoiceToken(tenantId, order_id, 72);
      await run('UPDATE orders SET invoice_token = $1 WHERE id = $2', [invoice_token, order_id]);
    } catch (tokenErr) {
      console.error('Non-fatal: failed to generate invoice token:', tokenErr.message);
    }

    res.json({
      success: true,
      message: 'Cash payment processed',
      order_id,
      order_number: order.order_number,
      total: finalTotal,
      amount_received,
      change_due: Math.round(changeDue * 100) / 100,
      payment_method: 'cash',
      invoice_token,
    });
  } catch (error) {
    console.error('Error processing cash payment:', error);
    res.status(500).json({ error: 'Failed to process cash payment' });
  }
});

// POST /api/payments/split - split payment across multiple methods
router.post('/split', requireAuth('pos_access'), async (req, res) => {
  try {
    const { order_id, split_type, splits } = req.body;

    if (!order_id || !splits || splits.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = await get('SELECT id, total, tip, payment_status FROM orders WHERE id = $1', [order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') return res.status(400).json({ error: 'Order is already paid' });

    // Process each split
    for (const split of splits) {
      const tipAmount = split.tip || 0;
      await run(`
        INSERT INTO order_payments (order_id, payment_method, amount, tip, status)
        VALUES ($1, $2, $3, $4, 'paid')
      `, [order_id, split.payment_method, split.amount, tipAmount]);
    }

    // Calculate total tip from all splits
    const totalTip = splits.reduce((sum, s) => sum + (s.tip || 0), 0);

    // Mark the order as paid
    await run(`
      UPDATE orders
      SET payment_status = 'paid', status = 'preparing', payment_method = 'split', tip = $1
      WHERE id = $2
    `, [totalTip, order_id]);

    // Deduct inventory
    await deductInventoryForOrder(order_id);

    res.json({ success: true, message: 'Split payment processed', splits_count: splits.length });
  } catch (error) {
    console.error('Error processing split payment:', error);
    res.status(500).json({ error: 'Failed to process split payment' });
  }
});

// GET /api/payments/split/:order_id - get split details
router.get('/split/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;
    const payments = await all('SELECT * FROM order_payments WHERE order_id = $1', [order_id]);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching split payments:', error);
    res.status(500).json({ error: 'Failed to fetch split payments' });
  }
});

// POST /api/payments/refund - refund payment (full, partial by items, or partial by amount)
router.post('/refund', requireAuth('process_refunds'), async (req, res) => {
  try {
    const { order_id, amount, items, reason } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const order = await get(`
      SELECT id, payment_intent_id, payment_status, payment_method, total, tip, refund_total
      FROM orders
      WHERE id = $1
    `, [order_id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.payment_status !== 'paid' && order.payment_status !== 'completed') {
      return res.status(400).json({ error: 'Order must be paid before refunding' });
    }

    const existingRefundTotal = order.refund_total || 0;
    const maxRefundable = order.total + order.tip - existingRefundTotal;

    // Determine refund type and amount
    let refundAmount;
    let refundType;
    let itemsJson = null;
    let refundItems = [];

    if (items && items.length > 0) {
      // Partial refund by items
      refundType = 'partial_items';
      refundAmount = 0;

      for (const refundItem of items) {
        const orderItem = await get(
          'SELECT id, unit_price, quantity FROM order_items WHERE id = $1 AND order_id = $2',
          [refundItem.order_item_id, order_id]
        );
        if (!orderItem) {
          return res.status(400).json({ error: `Order item ${refundItem.order_item_id} not found` });
        }
        const qty = refundItem.quantity || orderItem.quantity;
        const itemAmount = orderItem.unit_price * qty;
        refundAmount += itemAmount;
        refundItems.push({
          order_item_id: refundItem.order_item_id,
          quantity: qty,
          amount: Math.round(itemAmount * 100) / 100,
        });
      }

      refundAmount = Math.round(refundAmount * 100) / 100;
      itemsJson = JSON.stringify(refundItems);
    } else if (amount) {
      // Partial refund by amount
      refundType = 'partial_amount';
      refundAmount = Math.round(amount * 100) / 100;
    } else {
      // Full refund of remaining refundable amount
      refundType = 'full';
      refundAmount = Math.round(maxRefundable * 100) / 100;
    }

    if (refundAmount > maxRefundable) {
      return res.status(400).json({
        error: `Refund amount ($${refundAmount}) exceeds maximum refundable ($${maxRefundable.toFixed(2)})`,
      });
    }

    if (refundAmount <= 0) {
      return res.status(400).json({ error: 'Invalid refund amount' });
    }

    // Process Stripe refund for card payments, manual for crypto
    let stripeRefundId = null;
    if (order.payment_method === 'crypto') {
      stripeRefundId = 'MANUAL_CRYPTO_REFUND';
    } else if (order.payment_intent_id && order.payment_method === 'card') {
      try {
        const refund = await createRefund(order.payment_intent_id, refundAmount);
        stripeRefundId = refund.id;
      } catch (stripeError) {
        console.error('Stripe refund error:', stripeError);
        return res.status(500).json({ error: 'Stripe refund failed: ' + stripeError.message });
      }
    }

    // Insert refund record
    const employeeId = req.employee?.id || null;
    const result = await run(`
      INSERT INTO refunds (order_id, stripe_refund_id, amount, reason, refund_type, refunded_by, items_json, inventory_restored)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [order_id, stripeRefundId, refundAmount, reason || null, refundType, employeeId, itemsJson, refundItems.length > 0]);

    // Update order refund_total
    const newRefundTotal = existingRefundTotal + refundAmount;
    const fullyRefunded = newRefundTotal >= (order.total + order.tip);

    await run(`
      UPDATE orders
      SET refund_total = $1, payment_status = $2
      WHERE id = $3
    `, [newRefundTotal, fullyRefunded ? 'refunded' : order.payment_status, order_id]);

    // Restore inventory for refunded items
    if (refundItems.length > 0) {
      await restoreInventoryForItems(refundItems);
    }

    res.json({
      success: true,
      refund_id: result.lastInsertRowid,
      stripe_refund_id: stripeRefundId,
      amount: refundAmount,
      refund_type: refundType,
      new_refund_total: newRefundTotal,
      fully_refunded: fullyRefunded,
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
});

// GET /api/payments/refunds/:order_id - get refunds for an order
router.get('/refunds/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;
    const refunds = await all(`
      SELECT r.*, e.name as refunded_by_name
      FROM refunds r
      LEFT JOIN employees e ON r.refunded_by = e.id
      WHERE r.order_id = $1
      ORDER BY r.created_at DESC
    `, [order_id]);
    res.json(refunds);
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// GET /api/payments/refunds - all refunds with date filtering
router.get('/refunds', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `
      SELECT r.*, e.name as refunded_by_name, o.order_number
      FROM refunds r
      LEFT JOIN employees e ON r.refunded_by = e.id
      LEFT JOIN orders o ON r.order_id = o.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (start_date) {
      query += ` AND r.created_at::date >= $${paramIdx++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND r.created_at::date <= $${paramIdx++}`;
      params.push(end_date);
    }

    query += ' ORDER BY r.created_at DESC LIMIT 200';

    const refunds = await all(query, params);
    res.json(refunds);
  } catch (error) {
    console.error('Error fetching all refunds:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// ==================== Crypto Payment Endpoints (NOWPayments) ====================

// GET /api/payments/crypto/estimate - get estimated crypto amount for MXN price
router.get('/crypto/estimate', async (req, res) => {
  try {
    const { amount, currency } = req.query;
    if (!amount || !currency) {
      return res.status(400).json({ error: 'Missing amount or currency' });
    }
    const estimate = await npGetEstimate(parseFloat(amount), currency);
    res.json(estimate);
  } catch (error) {
    console.error('Error getting crypto estimate:', error);
    res.status(500).json({ error: 'Failed to get crypto estimate' });
  }
});

// GET /api/payments/crypto/min-amount - get minimum payment amount for a currency
router.get('/crypto/min-amount', async (req, res) => {
  try {
    const { currency } = req.query;
    if (!currency) {
      return res.status(400).json({ error: 'Missing currency' });
    }
    const minAmount = await npGetMinAmount(currency);
    res.json(minAmount);
  } catch (error) {
    console.error('Error getting crypto min amount:', error);
    res.status(500).json({ error: 'Failed to get minimum amount' });
  }
});

// POST /api/payments/crypto/create - create a crypto payment for an order
router.post('/crypto/create', requireAuth('pos_access'), async (req, res) => {
  try {
    const { order_id, pay_currency, tip = 0 } = req.body;

    if (!order_id || !pay_currency) {
      return res.status(400).json({ error: 'Missing order_id or pay_currency' });
    }

    const order = await get('SELECT id, total, payment_status FROM orders WHERE id = $1', [order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') return res.status(400).json({ error: 'Order is already paid' });

    const tipAmount = typeof tip === 'number' ? tip : 0;
    const totalAmount = order.total + tipAmount;

    // Create payment via NOWPayments
    const npPayment = await npCreatePayment({
      price_amount: totalAmount,
      pay_currency,
      order_id,
    });

    // Insert into crypto_payments table
    const result = await run(`
      INSERT INTO crypto_payments (order_id, nowpayments_payment_id, pay_address, pay_amount, pay_currency, price_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      order_id,
      String(npPayment.payment_id),
      npPayment.pay_address,
      npPayment.pay_amount,
      npPayment.pay_currency,
      totalAmount,
      npPayment.payment_status || 'waiting',
    ]);

    // Update order with crypto payment reference and tip
    await run(`
      UPDATE orders SET crypto_payment_id = $1, payment_status = 'processing', tip = $2
      WHERE id = $3
    `, [result.lastInsertRowid, tipAmount, order_id]);

    res.json({
      crypto_payment_id: result.lastInsertRowid,
      nowpayments_payment_id: npPayment.payment_id,
      pay_address: npPayment.pay_address,
      pay_amount: npPayment.pay_amount,
      pay_currency: npPayment.pay_currency,
      status: npPayment.payment_status || 'waiting',
    });
  } catch (error) {
    console.error('Error creating crypto payment:', error);
    res.status(500).json({ error: 'Failed to create crypto payment' });
  }
});

// GET /api/payments/crypto/status/:payment_id - poll crypto payment status
router.get('/crypto/status/:payment_id', async (req, res) => {
  try {
    const { payment_id } = req.params;

    const cryptoPayment = await get(
      'SELECT * FROM crypto_payments WHERE nowpayments_payment_id = $1',
      [payment_id]
    );
    if (!cryptoPayment) {
      return res.status(404).json({ error: 'Crypto payment not found' });
    }

    // Poll NOWPayments for latest status
    const npStatus = await npGetStatus(payment_id);
    const newStatus = npStatus.payment_status || cryptoPayment.status;

    // Update local DB if status changed
    if (newStatus !== cryptoPayment.status) {
      await run(`
        UPDATE crypto_payments
        SET status = $1, actually_paid = $2, outcome_amount = $3, outcome_currency = $4, updated_at = NOW()
        WHERE nowpayments_payment_id = $5
      `, [
        newStatus,
        npStatus.actually_paid || 0,
        npStatus.outcome_amount || null,
        npStatus.outcome_currency || null,
        payment_id,
      ]);

      // If confirmed/finished, mark order as paid
      if (newStatus === 'confirmed' || newStatus === 'finished') {
        const order = await get('SELECT id, payment_status FROM orders WHERE id = $1', [cryptoPayment.order_id]);
        if (order && order.payment_status !== 'paid') {
          await run(`
            UPDATE orders SET payment_status = 'paid', payment_method = 'crypto', status = 'preparing'
            WHERE id = $1
          `, [cryptoPayment.order_id]);

          await deductInventoryForOrder(cryptoPayment.order_id);
        }
      }
    }

    res.json({
      nowpayments_payment_id: payment_id,
      status: newStatus,
      pay_address: cryptoPayment.pay_address,
      pay_amount: cryptoPayment.pay_amount,
      pay_currency: cryptoPayment.pay_currency,
      price_amount: cryptoPayment.price_amount,
      actually_paid: npStatus.actually_paid || cryptoPayment.actually_paid || 0,
      order_id: cryptoPayment.order_id,
    });
  } catch (error) {
    console.error('Error polling crypto payment status:', error);
    res.status(500).json({ error: 'Failed to get crypto payment status' });
  }
});

// POST /api/payments/crypto/ipn - NOWPayments IPN webhook callback
router.post('/crypto/ipn', async (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    if (!signature || !verifyIPNSignature(req.body, signature)) {
      return res.status(403).json({ error: 'Invalid IPN signature' });
    }

    const { payment_id, payment_status, actually_paid, outcome_amount, outcome_currency } = req.body;
    if (!payment_id) return res.status(400).json({ error: 'Missing payment_id' });

    const cryptoPayment = await get(
      'SELECT * FROM crypto_payments WHERE nowpayments_payment_id = $1',
      [String(payment_id)]
    );
    if (!cryptoPayment) return res.status(404).json({ error: 'Crypto payment not found' });

    // Update crypto payment record
    await run(`
      UPDATE crypto_payments
      SET status = $1, actually_paid = $2, outcome_amount = $3, outcome_currency = $4, updated_at = NOW()
      WHERE nowpayments_payment_id = $5
    `, [payment_status, actually_paid || 0, outcome_amount || null, outcome_currency || null, String(payment_id)]);

    // Mark order as paid on confirmation
    if (payment_status === 'confirmed' || payment_status === 'finished') {
      const order = await get('SELECT id, payment_status FROM orders WHERE id = $1', [cryptoPayment.order_id]);
      if (order && order.payment_status !== 'paid') {
        await run(`
          UPDATE orders SET payment_status = 'paid', payment_method = 'crypto', status = 'preparing'
          WHERE id = $1
        `, [cryptoPayment.order_id]);

        await deductInventoryForOrder(cryptoPayment.order_id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing crypto IPN:', error);
    res.status(500).json({ error: 'IPN processing failed' });
  }
});

// ==================== Mercado Pago Point Endpoints (Pro+) ====================

/** Middleware: require Pro or ghost_kitchen plan */
function requirePro(req, res, next) {
  const plan = req.tenant?.plan;
  if (plan !== 'pro' && plan !== 'ghost_kitchen') {
    return res.status(403).json({ error: 'Mercado Pago Point requires a Pro plan' });
  }
  next();
}

// GET /api/payments/mp/connect — initiate MP OAuth flow
router.get('/mp/connect', requireAuth('pos_access'), requirePro, async (req, res) => {
  const mpCreds = await getServiceCredentials(req.tenant.id, 'mercadopago', {
    client_id: 'MP_CLIENT_ID',
  });
  const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const params = new URLSearchParams({
    client_id: mpCreds.client_id || '',
    response_type: 'code',
    platform_id: 'mp',
    redirect_uri: `${BASE_URL}/api/payments/mp/callback`,
    state: req.tenant.id,
  });
  res.redirect(`https://auth.mercadopago.com/authorization?${params}`);
});

// GET /api/payments/mp/terminals — list Point terminals in PDV mode
router.get('/mp/terminals', requireAuth('pos_access'), requirePro, async (req, res) => {
  try {
    const tenant = await getTenant(req.tenant.id);
    if (!tenant?.mp_access_token) {
      return res.status(400).json({ error: 'Mercado Pago not connected' });
    }
    const accessToken = await ensureFreshToken(tenant, adminSql);
    const terminals = await mpGetTerminals(accessToken);
    res.json({ terminals });
  } catch (error) {
    console.error('MP getTerminals error:', error);
    res.status(500).json({ error: 'Failed to fetch terminals' });
  }
});

// POST /api/payments/mp/terminals/default — set default terminal
router.post('/mp/terminals/default', requireAuth('pos_access'), requirePro, async (req, res) => {
  try {
    const { terminal_id } = req.body;
    if (!terminal_id) return res.status(400).json({ error: 'Missing terminal_id' });
    await adminSql`UPDATE tenants SET mp_default_terminal_id = ${terminal_id} WHERE id = ${req.tenant.id}`;
    res.json({ success: true });
  } catch (error) {
    console.error('MP setDefaultTerminal error:', error);
    res.status(500).json({ error: 'Failed to set default terminal' });
  }
});

// POST /api/payments/mp/charge — create MP payment intent and push to terminal
router.post('/mp/charge', requireAuth('pos_access'), requirePro, async (req, res) => {
  try {
    const { order_id, terminal_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Missing order_id' });

    const order = await get('SELECT id, total, order_number, payment_status FROM orders WHERE id = $1', [order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') return res.status(400).json({ error: 'Order is already paid' });

    const tenant = await getTenant(req.tenant.id);
    if (!tenant?.mp_access_token) {
      return res.status(400).json({ error: 'Mercado Pago not connected' });
    }

    const accessToken = await ensureFreshToken(tenant, adminSql);
    const termId = terminal_id || tenant.mp_default_terminal_id;
    if (!termId) return res.status(400).json({ error: 'No terminal selected' });

    const externalRef = `${req.tenant.id}-${order.id}`;
    const mpOrder = await createPointOrder(accessToken, {
      amount: order.total,
      description: `Orden #${order.order_number} - ${req.tenant.name}`,
      externalRef,
      terminalId: termId,
    });

    await run(
      `UPDATE orders SET mp_order_id = $1, payment_status = 'pending_terminal' WHERE id = $2`,
      [mpOrder.id, order.id]
    );

    res.json({ success: true, mp_order_id: mpOrder.id, payment_intent_id: mpOrder.id });
  } catch (error) {
    console.error('MP charge error:', error);
    res.status(500).json({ error: error.message || 'Failed to create terminal payment' });
  }
});

// POST /api/payments/mp/cancel — cancel a pending terminal payment
router.post('/mp/cancel', requireAuth('pos_access'), requirePro, async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'Missing order_id' });

    const order = await get('SELECT id, mp_order_id, payment_status FROM orders WHERE id = $1', [order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status !== 'pending_terminal') {
      return res.status(400).json({ error: 'Order is not pending terminal payment' });
    }

    const tenant = await getTenant(req.tenant.id);
    if (!tenant?.mp_access_token) {
      return res.status(400).json({ error: 'Mercado Pago not connected' });
    }

    const accessToken = await ensureFreshToken(tenant, adminSql);
    const termId = tenant.mp_default_terminal_id;
    if (termId && order.mp_order_id) {
      try {
        await cancelPointOrder(accessToken, termId, order.mp_order_id);
      } catch (cancelErr) {
        console.error('MP cancel warning:', cancelErr.message);
      }
    }

    await run(
      `UPDATE orders SET payment_status = 'unpaid', mp_order_id = NULL WHERE id = $1`,
      [order.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('MP cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel terminal payment' });
  }
});

// GET /api/payments/mp/status — tenant MP connection status
router.get('/mp/status', requireAuth('pos_access'), async (req, res) => {
  try {
    const tenant = await getTenant(req.tenant.id);
    res.json({
      connected: !!tenant?.mp_user_id,
      mp_user_id: tenant?.mp_user_id || null,
      mp_default_terminal_id: tenant?.mp_default_terminal_id || null,
    });
  } catch (error) {
    console.error('MP status error:', error);
    res.status(500).json({ error: 'Failed to get MP status' });
  }
});

// GET /api/payments/:order_id - get payment status
router.get('/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = await get(`
      SELECT id, order_number, payment_intent_id, payment_status, payment_method, total, tip, refund_total
      FROM orders
      WHERE id = $1
    `, [order_id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment_intent_id) {
      return res.json({
        order_id,
        payment_status: order.payment_status || 'unpaid',
        payment_method: order.payment_method,
        amount: order.total + order.tip,
        refund_total: order.refund_total || 0,
      });
    }

    const paymentIntent = await getPaymentIntent(order.payment_intent_id);

    res.json({
      order_id,
      order_number: order.order_number,
      payment_status: paymentIntent.status,
      payment_method: order.payment_method,
      amount: order.total + order.tip,
      payment_intent_id: order.payment_intent_id,
      refund_total: order.refund_total || 0,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

// ==================== MP OAuth Callback (mounted before tenant middleware) ====================
export async function mpOAuthCallback(req, res) {
  const { code, state: tenantId } = req.query;
  if (!code || !tenantId) {
    return res.status(400).send('Missing code or state');
  }

  try {
    // Resolve MP credentials for this tenant (state param = tenantId)
    const mpCreds = await getServiceCredentials(tenantId, 'mercadopago', {
      client_id: 'MP_CLIENT_ID',
      client_secret: 'MP_CLIENT_SECRET',
    });

    const BASE_URL = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: mpCreds.client_secret,
        client_id: mpCreds.client_id,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${BASE_URL}/api/payments/mp/callback`,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('MP OAuth token exchange failed:', text);
      return res.redirect('/#/account?mp=error');
    }

    const data = await tokenRes.json();
    const { access_token, refresh_token, user_id, expires_in } = data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    await adminSql`
      UPDATE tenants
      SET mp_access_token = ${access_token},
          mp_refresh_token = ${refresh_token},
          mp_user_id = ${String(user_id)},
          mp_token_expires_at = ${expiresAt}
      WHERE id = ${tenantId}
    `;

    res.redirect('/#/account?mp=connected');
  } catch (error) {
    console.error('MP OAuth callback error:', error);
    res.redirect('/#/account?mp=error');
  }
}

// ==================== MP Webhook (mounted before tenant middleware) ====================
export async function mpWebhook(req, res) {
  // Always respond 200 immediately (MP requires fast acknowledgement)
  res.sendStatus(200);

  try {
    const { action, data } = req.body || {};
    if (!action || !data) return;

    // Verify webhook signature if MP_WEBHOOK_SECRET is configured
    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const xSignature = req.headers['x-signature'];
      const xRequestId = req.headers['x-request-id'];
      if (!xSignature || !xRequestId) {
        console.warn('MP webhook: missing x-signature or x-request-id header');
        return;
      }

      const parts = xSignature.split(',');
      let ts, hash;
      for (const part of parts) {
        const [key, ...rest] = part.split('=');
        const value = rest.join('=');
        if (key.trim() === 'ts') ts = value.trim();
        if (key.trim() === 'v1') hash = value.trim();
      }

      if (!ts || !hash) {
        console.warn('MP webhook: malformed x-signature header');
        return;
      }

      const template = `id:${data.id};request-id:${xRequestId};ts:${ts};`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(template).digest('hex');

      if (expected !== hash) {
        console.warn('MP webhook: signature verification failed');
        return;
      }
    } else {
      console.warn('MP webhook: MP_WEBHOOK_SECRET not set — skipping signature verification');
    }

    if (action === 'payment.updated' || action === 'payment') {
      // MP Point webhook: look up by payment intent ID or external_reference
      const paymentId = data.id;
      if (!paymentId) return;

      // Fetch the payment details from MP to get the status
      // We need to find the tenant for this payment
      const order = await adminSql`
        SELECT o.id, o.tenant_id, o.mp_order_id, o.payment_status
        FROM orders o
        WHERE o.mp_order_id = ${String(paymentId)}
        LIMIT 1
      `;

      if (order.length === 0) return;
      const ord = order[0];

      if (ord.payment_status === 'paid') return; // already processed

      // Get tenant's token to verify payment status
      const tenant = await getTenant(ord.tenant_id);
      if (!tenant?.mp_access_token) return;

      let accessToken;
      try {
        accessToken = await ensureFreshToken(tenant, adminSql);
      } catch {
        return;
      }

      // Fetch payment intent status from MP
      const piRes = await fetch(`https://api.mercadopago.com/point/integration-api/payment-intents/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!piRes.ok) return;
      const piData = await piRes.json();

      if (piData.state === 'FINISHED') {
        await adminSql`
          UPDATE orders
          SET payment_status = 'paid', payment_method = 'card', paid_at = NOW()
          WHERE id = ${ord.id}
        `;
      } else if (piData.state === 'CANCELLED' || piData.state === 'ERROR') {
        await adminSql`
          UPDATE orders
          SET payment_status = 'failed'
          WHERE id = ${ord.id}
        `;
      }
    }
  } catch (error) {
    console.error('MP webhook processing error:', error);
  }
}

export default router;
