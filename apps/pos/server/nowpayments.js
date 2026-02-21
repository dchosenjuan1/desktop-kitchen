import crypto from 'crypto';

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';
const SANDBOX = process.env.NOWPAYMENTS_SANDBOX === 'true';

const BASE_URL = SANDBOX
  ? 'https://api-sandbox.nowpayments.io/v1'
  : 'https://api.nowpayments.io/v1';

async function apiRequest(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    const msg = data.message || data.statusCode || res.statusText;
    throw new Error(`NOWPayments API error: ${msg}`);
  }

  return data;
}

export async function createCryptoPayment({ price_amount, pay_currency, order_id, ipn_callback_url }) {
  try {
    return await apiRequest('POST', '/payment', {
      price_amount,
      price_currency: 'mxn',
      pay_currency,
      order_id: String(order_id),
      ipn_callback_url: ipn_callback_url || process.env.NOWPAYMENTS_IPN_URL || undefined,
    });
  } catch (error) {
    console.error('Error creating crypto payment:', error);
    throw error;
  }
}

export async function getCryptoPaymentStatus(paymentId) {
  try {
    return await apiRequest('GET', `/payment/${paymentId}`);
  } catch (error) {
    console.error('Error getting crypto payment status:', error);
    throw error;
  }
}

export async function getEstimate(amount, currencyTo) {
  try {
    return await apiRequest('GET', `/estimate?amount=${amount}&currency_from=mxn&currency_to=${currencyTo}`);
  } catch (error) {
    console.error('Error getting crypto estimate:', error);
    throw error;
  }
}

export async function getMinAmount(currencyTo) {
  try {
    return await apiRequest('GET', `/min-amount?currency_from=mxn&currency_to=${currencyTo}`);
  } catch (error) {
    console.error('Error getting min amount:', error);
    throw error;
  }
}

export async function getAvailableCurrencies() {
  try {
    return await apiRequest('GET', '/currencies');
  } catch (error) {
    console.error('Error getting available currencies:', error);
    throw error;
  }
}

export function verifyIPNSignature(body, signature) {
  if (!IPN_SECRET) return false;

  const sorted = Object.keys(body)
    .sort()
    .reduce((acc, key) => {
      acc[key] = body[key];
      return acc;
    }, {});

  const hmac = crypto
    .createHmac('sha512', IPN_SECRET)
    .update(JSON.stringify(sorted))
    .digest('hex');

  return hmac === signature;
}
