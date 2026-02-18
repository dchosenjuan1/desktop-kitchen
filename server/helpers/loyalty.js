import { all, get, run } from '../db.js';
import {
  sendWelcomeSMS,
  sendStampEarnedSMS,
  sendCardCompletedSMS,
  sendReferralSuccessSMS,
} from './twilio.js';

/* ==================== Helpers ==================== */

export function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = 'JB';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = get('SELECT id FROM loyalty_customers WHERE referral_code = ?', [code]);
    if (!existing) return code;
  }
  // Fallback: longer code
  return 'JB' + Date.now().toString(36).toUpperCase().slice(-6);
}

export function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  // Accept 10-digit MX numbers, or with country code prefix
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('52')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('521')) return digits.slice(3);
  return digits.slice(-10); // best effort
}

/* ==================== Config ==================== */

export function getLoyaltyConfig() {
  const rows = all('SELECT key, value, description, updated_at FROM loyalty_config');
  const config = {};
  for (const row of rows) {
    config[row.key] = { value: row.value, description: row.description, updated_at: row.updated_at };
  }
  return config;
}

export function getConfigValue(key, defaultVal = null) {
  const row = get('SELECT value FROM loyalty_config WHERE key = ?', [key]);
  return row ? row.value : defaultVal;
}

export function updateLoyaltyConfig(key, value) {
  run(
    `INSERT INTO loyalty_config (key, value, updated_at) VALUES (?, ?, datetime('now','localtime'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value]
  );
}

/* ==================== Stamp Cards ==================== */

export function getActiveStampCard(customerId) {
  let card = get(
    `SELECT * FROM stamp_cards WHERE customer_id = ? AND completed = 0 ORDER BY id DESC LIMIT 1`,
    [customerId]
  );
  if (!card) {
    const stampsRequired = parseInt(getConfigValue('stamps_required', '10'));
    const rewardDesc = getConfigValue('reward_description', 'Free item of your choice');
    const { lastInsertRowid } = run(
      `INSERT INTO stamp_cards (customer_id, stamps_required, reward_description) VALUES (?, ?, ?)`,
      [customerId, stampsRequired, rewardDesc]
    );
    card = get('SELECT * FROM stamp_cards WHERE id = ?', [lastInsertRowid]);
  }
  return card;
}

/* ==================== Customer Operations ==================== */

export async function findOrCreateCustomer(phone, name, referralCodeUsed, smsOptIn = false) {
  const normalized = normalizePhone(phone);
  let customer = get('SELECT * FROM loyalty_customers WHERE phone = ?', [normalized]);

  if (customer) {
    return { customer, created: false };
  }

  const referralCode = generateReferralCode();
  const { lastInsertRowid } = run(
    `INSERT INTO loyalty_customers (phone, name, referral_code, sms_opt_in) VALUES (?, ?, ?, ?)`,
    [normalized, name, referralCode, smsOptIn ? 1 : 0]
  );

  customer = get('SELECT * FROM loyalty_customers WHERE id = ?', [lastInsertRowid]);

  // Create first stamp card
  getActiveStampCard(customer.id);

  // Process referral if code provided
  if (referralCodeUsed) {
    await processReferral(referralCodeUsed, customer.id);
  }

  // Send welcome SMS (non-blocking)
  if (customer.sms_opt_in && getConfigValue('sms_enabled', 'true') === 'true') {
    sendWelcomeSMS(normalized, name, referralCode).catch(() => {});
  }

  return { customer: get('SELECT * FROM loyalty_customers WHERE id = ?', [customer.id]), created: true };
}

/* ==================== Stamp Operations ==================== */

export async function addStampsForOrder(customerId, orderId, count = 1) {
  const card = getActiveStampCard(customerId);
  const newStamps = card.stamps_earned + count;
  const cardCompleted = newStamps >= card.stamps_required;

  run(
    `UPDATE stamp_cards SET stamps_earned = ?, completed = ?, completed_at = ? WHERE id = ?`,
    [
      Math.min(newStamps, card.stamps_required),
      cardCompleted ? 1 : 0,
      cardCompleted ? new Date().toISOString() : null,
      card.id,
    ]
  );

  run(
    `INSERT INTO stamp_events (stamp_card_id, order_id, stamps_added, event_type) VALUES (?, ?, ?, 'purchase')`,
    [card.id, orderId, count]
  );

  // Update customer totals
  run(
    `UPDATE loyalty_customers SET stamps_earned = stamps_earned + ?, orders_count = orders_count + 1, last_visit = datetime('now','localtime') WHERE id = ?`,
    [count, customerId]
  );

  // Link order to customer
  run(`UPDATE orders SET loyalty_customer_id = ? WHERE id = ?`, [customerId, orderId]);

  // Get updated card
  const updatedCard = get('SELECT * FROM stamp_cards WHERE id = ?', [card.id]);
  const customer = get('SELECT * FROM loyalty_customers WHERE id = ?', [customerId]);

  // Send SMS notifications (non-blocking)
  if (customer.sms_opt_in && getConfigValue('sms_enabled', 'true') === 'true') {
    if (cardCompleted) {
      sendCardCompletedSMS(customer.phone, customer.name, updatedCard.reward_description, customerId).catch(() => {});
      // Auto-create next card
      getActiveStampCard(customerId);
    } else {
      sendStampEarnedSMS(customer.phone, customer.name, updatedCard.stamps_earned, updatedCard.stamps_required, customerId).catch(() => {});
    }
  } else if (cardCompleted) {
    // Still auto-create next card even if SMS disabled
    getActiveStampCard(customerId);
  }

  return {
    stampCard: get('SELECT * FROM stamp_cards WHERE id = ?', [card.id]),
    cardCompleted,
    customer: get('SELECT * FROM loyalty_customers WHERE id = ?', [customerId]),
  };
}

export function addBonusStamps(customerId, count, eventType = 'manual') {
  const card = getActiveStampCard(customerId);
  const newStamps = card.stamps_earned + count;
  const cardCompleted = newStamps >= card.stamps_required;

  run(
    `UPDATE stamp_cards SET stamps_earned = ?, completed = ?, completed_at = ? WHERE id = ?`,
    [
      Math.min(newStamps, card.stamps_required),
      cardCompleted ? 1 : 0,
      cardCompleted ? new Date().toISOString() : null,
      card.id,
    ]
  );

  run(
    `INSERT INTO stamp_events (stamp_card_id, stamps_added, event_type) VALUES (?, ?, ?)`,
    [card.id, count, eventType]
  );

  run(
    `UPDATE loyalty_customers SET stamps_earned = stamps_earned + ? WHERE id = ?`,
    [count, customerId]
  );

  if (cardCompleted) {
    getActiveStampCard(customerId); // auto-create next card
  }

  return get('SELECT * FROM stamp_cards WHERE id = ?', [card.id]);
}

/* ==================== Referral ==================== */

export async function processReferral(referralCode, newCustomerId) {
  const referrer = get('SELECT * FROM loyalty_customers WHERE referral_code = ?', [referralCode]);
  if (!referrer) return null;
  if (referrer.id === newCustomerId) return null; // can't refer yourself

  // Check if this referral already happened
  const existing = get(
    'SELECT id FROM referral_events WHERE referrer_id = ? AND referee_id = ?',
    [referrer.id, newCustomerId]
  );
  if (existing) return null;

  const bonus = parseInt(getConfigValue('referral_bonus_stamps', '2'));

  // Add bonus stamps to both
  addBonusStamps(referrer.id, bonus, 'referral_bonus');
  addBonusStamps(newCustomerId, bonus, 'referral_bonus');

  // Record referral
  run(
    `INSERT INTO referral_events (referrer_id, referee_id, referrer_stamps_added, referee_stamps_added) VALUES (?, ?, ?, ?)`,
    [referrer.id, newCustomerId, bonus, bonus]
  );

  // Update referred_by
  run(`UPDATE loyalty_customers SET referred_by = ? WHERE id = ?`, [referrer.id, newCustomerId]);

  // Notify referrer via SMS
  const referee = get('SELECT * FROM loyalty_customers WHERE id = ?', [newCustomerId]);
  if (referrer.sms_opt_in && getConfigValue('sms_enabled', 'true') === 'true') {
    sendReferralSuccessSMS(referrer.phone, referrer.name, referee.name, bonus, referrer.id).catch(() => {});
  }

  return { referrer_id: referrer.id, referee_id: newCustomerId, bonus };
}

/* ==================== Redemption ==================== */

export function redeemReward(stampCardId) {
  const card = get('SELECT * FROM stamp_cards WHERE id = ?', [stampCardId]);
  if (!card) throw new Error('Stamp card not found');
  if (!card.completed) throw new Error('Card is not completed');
  if (card.redeemed) throw new Error('Card already redeemed');

  run(
    `UPDATE stamp_cards SET redeemed = 1, redeemed_at = datetime('now','localtime') WHERE id = ?`,
    [stampCardId]
  );

  return get('SELECT * FROM stamp_cards WHERE id = ?', [stampCardId]);
}

/* ==================== Queries ==================== */

export function getCustomerWithCard(customerId) {
  const customer = get('SELECT * FROM loyalty_customers WHERE id = ?', [customerId]);
  if (!customer) return null;

  const activeCard = getActiveStampCard(customerId);
  const allCards = all(
    'SELECT * FROM stamp_cards WHERE customer_id = ? ORDER BY id DESC',
    [customerId]
  );
  const events = all(
    `SELECT se.*, sc.stamps_required FROM stamp_events se
     JOIN stamp_cards sc ON sc.id = se.stamp_card_id
     WHERE sc.customer_id = ? ORDER BY se.id DESC LIMIT 20`,
    [customerId]
  );

  return { ...customer, activeCard, cards: allCards, recentEvents: events };
}
