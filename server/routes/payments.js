import { Router } from 'express';
import { all, get, run } from '../db/index.js';
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

const router = Router();

// POST /api/payments/create-intent - create Stripe PaymentIntent for an order
router.post('/create-intent', requireAuth('pos_access'), async (req, res) => {
  try {
    const { order_id, tip = 0 } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const order = get(`
      SELECT id, order_number, subtotal, tax, total, payment_status
      FROM orders
      WHERE id = ?
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
    run(`
      UPDATE orders
      SET payment_intent_id = ?, tip = ?
      WHERE id = ?
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

    const order = get('SELECT id, payment_status FROM orders WHERE id = ?', [order_id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify payment intent status
    const paymentIntent = await getPaymentIntent(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      run(`
        UPDATE orders
        SET payment_status = 'paid', status = 'preparing', payment_method = 'card'
        WHERE id = ?
      `, [order_id]);

      // Deduct inventory after successful payment
      deductInventoryForOrder(order_id);

      return res.json({
        success: true,
        message: 'Payment confirmed',
        payment_status: 'paid',
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
router.post('/cash', requireAuth('pos_access'), (req, res) => {
  try {
    const { order_id, tip = 0, amount_received = 0 } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const order = get(`
      SELECT id, order_number, subtotal, tax, tip, total, payment_status
      FROM orders
      WHERE id = ?
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
    run(`
      UPDATE orders
      SET payment_status = 'paid', status = 'preparing', payment_method = 'cash', tip = ?
      WHERE id = ?
    `, [tipAmount, order_id]);

    // Deduct inventory
    deductInventoryForOrder(order_id);

    res.json({
      success: true,
      message: 'Cash payment processed',
      order_id,
      order_number: order.order_number,
      total: finalTotal,
      amount_received,
      change_due: Math.round(changeDue * 100) / 100,
      payment_method: 'cash',
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

    const order = get('SELECT id, total, tip, payment_status FROM orders WHERE id = ?', [order_id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') return res.status(400).json({ error: 'Order is already paid' });

    // Process each split
    for (const split of splits) {
      const tipAmount = split.tip || 0;
      run(`
        INSERT INTO order_payments (order_id, payment_method, amount, tip, status)
        VALUES (?, ?, ?, ?, 'paid')
      `, [order_id, split.payment_method, split.amount, tipAmount]);
    }

    // Calculate total tip from all splits
    const totalTip = splits.reduce((sum, s) => sum + (s.tip || 0), 0);

    // Mark the order as paid
    run(`
      UPDATE orders
      SET payment_status = 'paid', status = 'preparing', payment_method = 'split', tip = ?
      WHERE id = ?
    `, [totalTip, order_id]);

    // Deduct inventory
    deductInventoryForOrder(order_id);

    res.json({ success: true, message: 'Split payment processed', splits_count: splits.length });
  } catch (error) {
    console.error('Error processing split payment:', error);
    res.status(500).json({ error: 'Failed to process split payment' });
  }
});

// GET /api/payments/split/:order_id - get split details
router.get('/split/:order_id', (req, res) => {
  try {
    const { order_id } = req.params;
    const payments = all('SELECT * FROM order_payments WHERE order_id = ?', [order_id]);
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

    const order = get(`
      SELECT id, payment_intent_id, payment_status, payment_method, total, tip, refund_total
      FROM orders
      WHERE id = ?
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
        const orderItem = get(
          'SELECT id, unit_price, quantity FROM order_items WHERE id = ? AND order_id = ?',
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
    const result = run(`
      INSERT INTO refunds (order_id, stripe_refund_id, amount, reason, refund_type, refunded_by, items_json, inventory_restored)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [order_id, stripeRefundId, refundAmount, reason || null, refundType, employeeId, itemsJson, refundItems.length > 0 ? 1 : 0]);

    // Update order refund_total
    const newRefundTotal = existingRefundTotal + refundAmount;
    const fullyRefunded = newRefundTotal >= (order.total + order.tip);

    run(`
      UPDATE orders
      SET refund_total = ?, payment_status = ?
      WHERE id = ?
    `, [newRefundTotal, fullyRefunded ? 'refunded' : order.payment_status, order_id]);

    // Restore inventory for refunded items
    if (refundItems.length > 0) {
      restoreInventoryForItems(refundItems);
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
router.get('/refunds/:order_id', (req, res) => {
  try {
    const { order_id } = req.params;
    const refunds = all(`
      SELECT r.*, e.name as refunded_by_name
      FROM refunds r
      LEFT JOIN employees e ON r.refunded_by = e.id
      WHERE r.order_id = ?
      ORDER BY r.created_at DESC
    `, [order_id]);
    res.json(refunds);
  } catch (error) {
    console.error('Error fetching refunds:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// GET /api/payments/refunds - all refunds with date filtering
router.get('/refunds', (req, res) => {
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

    if (start_date) {
      query += ' AND DATE(r.created_at) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND DATE(r.created_at) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY r.created_at DESC LIMIT 200';

    const refunds = all(query, params);
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

    const order = get('SELECT id, total, payment_status FROM orders WHERE id = ?', [order_id]);
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
    const result = run(`
      INSERT INTO crypto_payments (order_id, nowpayments_payment_id, pay_address, pay_amount, pay_currency, price_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
    run(`
      UPDATE orders SET crypto_payment_id = ?, payment_status = 'processing', tip = ?
      WHERE id = ?
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

    const cryptoPayment = get(
      'SELECT * FROM crypto_payments WHERE nowpayments_payment_id = ?',
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
      run(`
        UPDATE crypto_payments
        SET status = ?, actually_paid = ?, outcome_amount = ?, outcome_currency = ?, updated_at = datetime('now','localtime')
        WHERE nowpayments_payment_id = ?
      `, [
        newStatus,
        npStatus.actually_paid || 0,
        npStatus.outcome_amount || null,
        npStatus.outcome_currency || null,
        payment_id,
      ]);

      // If confirmed/finished, mark order as paid
      if (newStatus === 'confirmed' || newStatus === 'finished') {
        const order = get('SELECT id, payment_status FROM orders WHERE id = ?', [cryptoPayment.order_id]);
        if (order && order.payment_status !== 'paid') {
          run(`
            UPDATE orders SET payment_status = 'paid', payment_method = 'crypto', status = 'preparing'
            WHERE id = ?
          `, [cryptoPayment.order_id]);

          deductInventoryForOrder(cryptoPayment.order_id);
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
router.post('/crypto/ipn', (req, res) => {
  try {
    const signature = req.headers['x-nowpayments-sig'];
    if (!signature || !verifyIPNSignature(req.body, signature)) {
      return res.status(403).json({ error: 'Invalid IPN signature' });
    }

    const { payment_id, payment_status, actually_paid, outcome_amount, outcome_currency } = req.body;
    if (!payment_id) return res.status(400).json({ error: 'Missing payment_id' });

    const cryptoPayment = get(
      'SELECT * FROM crypto_payments WHERE nowpayments_payment_id = ?',
      [String(payment_id)]
    );
    if (!cryptoPayment) return res.status(404).json({ error: 'Crypto payment not found' });

    // Update crypto payment record
    run(`
      UPDATE crypto_payments
      SET status = ?, actually_paid = ?, outcome_amount = ?, outcome_currency = ?, updated_at = datetime('now','localtime')
      WHERE nowpayments_payment_id = ?
    `, [payment_status, actually_paid || 0, outcome_amount || null, outcome_currency || null, String(payment_id)]);

    // Mark order as paid on confirmation
    if (payment_status === 'confirmed' || payment_status === 'finished') {
      const order = get('SELECT id, payment_status FROM orders WHERE id = ?', [cryptoPayment.order_id]);
      if (order && order.payment_status !== 'paid') {
        run(`
          UPDATE orders SET payment_status = 'paid', payment_method = 'crypto', status = 'preparing'
          WHERE id = ?
        `, [cryptoPayment.order_id]);

        deductInventoryForOrder(cryptoPayment.order_id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing crypto IPN:', error);
    res.status(500).json({ error: 'IPN processing failed' });
  }
});

// GET /api/payments/:order_id - get payment status
router.get('/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = get(`
      SELECT id, order_number, payment_intent_id, payment_status, payment_method, total, tip, refund_total
      FROM orders
      WHERE id = ?
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

export default router;
