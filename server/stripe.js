import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');

export async function createPaymentIntent(amount, metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to centavos
      currency: 'mxn',
      metadata,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

export async function createRefund(paymentIntentId, amount = null) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount && { amount: Math.round(amount * 100) }),
    });
    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw error;
  }
}

export async function getPaymentIntent(id) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
}

/**
 * Get balance transactions for reconciliation
 */
export async function getBalanceTransactions(startDate, endDate) {
  try {
    const params = { limit: 100 };
    if (startDate) params.created = { gte: Math.floor(new Date(startDate).getTime() / 1000) };
    if (endDate) {
      params.created = params.created || {};
      params.created.lte = Math.floor(new Date(endDate).getTime() / 1000);
    }
    const transactions = await stripe.balanceTransactions.list(params);
    return transactions.data;
  } catch (error) {
    console.error('Error fetching balance transactions:', error);
    throw error;
  }
}

/**
 * Get charge fees from a payment intent's balance transaction
 */
export async function getChargeFees(paymentIntentId) {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const charge = pi.latest_charge;
    if (charge && charge.balance_transaction) {
      const bt = charge.balance_transaction;
      return {
        gross: bt.amount / 100,
        fee: bt.fee / 100,
        net: bt.net / 100,
        fee_details: bt.fee_details?.map(d => ({
          type: d.type,
          amount: d.amount / 100,
          description: d.description,
        })) || [],
      };
    }
    return { gross: 0, fee: 0, net: 0, fee_details: [] };
  } catch (error) {
    console.error('Error fetching charge fees:', error);
    return { gross: 0, fee: 0, net: 0, fee_details: [] };
  }
}

export default stripe;
