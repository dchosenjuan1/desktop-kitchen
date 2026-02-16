import { Router } from 'express';
import { get, run } from '../db.js';
import { createPaymentIntent, createRefund, getPaymentIntent } from '../stripe.js';

const router = Router();

// POST /api/payments/create-intent - create Stripe PaymentIntent for an order
router.post('/create-intent', async (req, res) => {
  try {
    const { order_id, tip = 0 } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const order = get(`
      SELECT id, order_number, subtotal, tax, total
      FROM orders
      WHERE id = ?
    `, [order_id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
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

// POST /api/payments/confirm - confirm payment
router.post('/confirm', async (req, res) => {
  try {
    const { order_id, payment_intent_id } = req.body;

    if (!order_id || !payment_intent_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = get('SELECT id FROM orders WHERE id = ?', [order_id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify payment intent status
    const paymentIntent = await getPaymentIntent(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      run(`
        UPDATE orders
        SET payment_status = 'paid', status = 'preparing'
        WHERE id = ?
      `, [order_id]);

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

// POST /api/payments/refund - refund payment
router.post('/refund', async (req, res) => {
  try {
    const { order_id, amount } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const order = get(`
      SELECT id, payment_intent_id, payment_status, total, tip
      FROM orders
      WHERE id = ?
    `, [order_id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment_intent_id) {
      return res.status(400).json({ error: 'Order has no payment intent' });
    }

    const refundAmount = amount || (order.total + order.tip);

    const refund = await createRefund(order.payment_intent_id, refundAmount);

    run(`
      UPDATE orders
      SET payment_status = 'refunded'
      WHERE id = ?
    `, [order_id]);

    res.json({
      success: true,
      refundId: refund.id,
      amount: refundAmount,
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(500).json({ error: 'Failed to refund payment' });
  }
});

// GET /api/payments/:order_id - get payment status
router.get('/:order_id', async (req, res) => {
  try {
    const { order_id } = req.params;

    const order = get(`
      SELECT id, order_number, payment_intent_id, payment_status, total, tip
      FROM orders
      WHERE id = ?
    `, [order_id]);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment_intent_id) {
      return res.json({
        order_id,
        payment_status: 'unpaid',
        amount: order.total + order.tip,
      });
    }

    const paymentIntent = await getPaymentIntent(order.payment_intent_id);

    res.json({
      order_id,
      order_number: order.order_number,
      payment_status: paymentIntent.status,
      amount: order.total + order.tip,
      payment_intent_id: order.payment_intent_id,
    });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

export default router;
