/**
 * ReconciliationService — matches expected delivery payouts against actual bank deposits.
 *
 * For each delivery platform with orders in the period, finds matching INFLOW
 * bank transactions by fuzzy description + amount tolerance + date range.
 */

import { all } from '../../db/index.js';

// Keywords that appear in bank deposit descriptions for each platform
const PLATFORM_KEYWORDS = {
  uber_eats: ['Uber Eats', 'UberEats', 'UBER EATS', 'Uber'],
  rappi: ['Rappi', 'RAPPI'],
  didi_food: ['DiDi Food', 'DidiFood', 'DIDI FOOD', 'DiDi'],
  pedidos_ya: ['Pedidos Ya', 'PedidosYa', 'PEDIDOS YA'],
};

const AMOUNT_TOLERANCE = 0.05; // 5%
const DEPOSIT_WINDOW_DAYS = 7; // deposits within 7 days after period end

/**
 * Reconcile delivery platform payouts against bank deposits.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {{ items: ReconciliationItem[], summary: ReconciliationSummary }}
 */
export async function reconcileDeliveryPayouts(startDate, endDate) {
  // 1. Fetch delivery platform revenue summaries for the period
  const platformStats = await all(`
    SELECT
      dp.id AS platform_id,
      dp.name AS platform_name,
      dp.display_name,
      dp.commission_percent,
      COUNT(do2.id)::int AS order_count,
      COALESCE(SUM(o.total), 0) AS gross_revenue,
      COALESCE(SUM(do2.platform_commission), 0) AS total_commission,
      COALESCE(SUM(o.total) - SUM(do2.platform_commission), 0) AS expected_payout
    FROM delivery_platforms dp
    JOIN delivery_orders do2 ON do2.platform_id = dp.id
    JOIN orders o ON o.id = do2.order_id
      AND o.created_at::date >= $1 AND o.created_at::date <= $2
      AND o.status NOT IN ('cancelled')
    GROUP BY dp.id, dp.name, dp.display_name, dp.commission_percent
    HAVING COUNT(do2.id) > 0
    ORDER BY gross_revenue DESC
  `, [startDate, endDate]);

  // 2. Fetch INFLOW bank transactions in the period + deposit window
  const depositEndDate = new Date(endDate);
  depositEndDate.setDate(depositEndDate.getDate() + DEPOSIT_WINDOW_DAYS);
  const depositEndStr = depositEndDate.toISOString().split('T')[0];

  const bankInflows = await all(`
    SELECT bt.*, ba.name AS account_name
    FROM bank_transactions bt
    JOIN bank_accounts ba ON bt.account_id = ba.id
    JOIN bank_connections bc ON ba.connection_id = bc.id
    WHERE bc.status = 'active'
      AND bt.transaction_type = 'INFLOW'
      AND bt.transaction_date >= $1
      AND bt.transaction_date <= $2
    ORDER BY bt.transaction_date DESC
  `, [startDate, depositEndStr]);

  // 3. Match each platform's expected payout to bank deposits
  const usedTransactionIds = new Set();
  const items = [];

  for (const platform of platformStats) {
    const expectedPayout = Number(platform.expected_payout) || 0;
    if (expectedPayout <= 0) continue;

    const keywords = PLATFORM_KEYWORDS[platform.platform_name] || [platform.display_name];

    // Find matching bank deposit: keyword match + amount tolerance
    let bestMatch = null;
    let bestDiff = Infinity;

    for (const tx of bankInflows) {
      if (usedTransactionIds.has(tx.id)) continue;

      const desc = ((tx.description || '') + ' ' + (tx.merchant_name || '')).toLowerCase();
      const matchesKeyword = keywords.some(kw => desc.includes(kw.toLowerCase()));
      if (!matchesKeyword) continue;

      const txAmount = Number(tx.amount) || 0;
      const diff = Math.abs(txAmount - expectedPayout);
      const pctDiff = expectedPayout > 0 ? diff / expectedPayout : 1;

      // Accept if within reasonable range (50% max - to catch partial payouts too)
      if (pctDiff < 0.5 && diff < bestDiff) {
        bestMatch = { ...tx, txAmount, diff, pctDiff };
        bestDiff = diff;
      }
    }

    let status = 'missing';
    let depositAmount = null;
    let difference = null;
    let matchedTransactionId = null;
    let matchedDescription = null;
    let matchedDate = null;

    if (bestMatch) {
      usedTransactionIds.add(bestMatch.id);
      depositAmount = bestMatch.txAmount;
      difference = bestMatch.txAmount - expectedPayout;
      matchedTransactionId = bestMatch.id;
      matchedDescription = bestMatch.description;
      matchedDate = bestMatch.transaction_date;

      if (bestMatch.pctDiff <= AMOUNT_TOLERANCE) {
        status = 'matched';
      } else {
        status = 'partial';
      }
    }

    items.push({
      platformId: platform.platform_id,
      platformName: platform.platform_name,
      displayName: platform.display_name,
      orderCount: Number(platform.order_count),
      grossRevenue: Number(platform.gross_revenue),
      commission: Number(platform.total_commission),
      expectedPayout,
      depositAmount,
      difference,
      status,
      matchedTransactionId,
      matchedDescription,
      matchedDate,
    });
  }

  // 4. Build summary
  const totalExpected = items.reduce((s, i) => s + i.expectedPayout, 0);
  const totalConfirmed = items
    .filter(i => i.status === 'matched')
    .reduce((s, i) => s + (i.depositAmount || 0), 0);
  const totalPartial = items
    .filter(i => i.status === 'partial')
    .reduce((s, i) => s + (i.depositAmount || 0), 0);
  const totalUnconfirmed = items
    .filter(i => i.status === 'missing')
    .reduce((s, i) => s + i.expectedPayout, 0);

  return {
    items,
    summary: {
      totalExpected,
      totalConfirmed,
      totalPartial,
      totalUnconfirmed,
      matchedCount: items.filter(i => i.status === 'matched').length,
      partialCount: items.filter(i => i.status === 'partial').length,
      missingCount: items.filter(i => i.status === 'missing').length,
    },
  };
}
