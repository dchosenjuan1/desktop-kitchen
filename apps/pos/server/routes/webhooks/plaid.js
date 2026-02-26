/**
 * Plaid Webhook Handler (Stub)
 *
 * Placeholder for future Plaid webhook integration.
 * Logs incoming webhooks and returns 200.
 */

import { Router } from 'express';

const router = Router();

// POST /webhooks/plaid
router.post('/', async (req, res) => {
  const rawBody = req.body; // Buffer from express.raw()

  let payload;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    payload = {};
  }

  console.log(`[Plaid Webhook] Received event: ${payload.webhook_type || 'unknown'} / ${payload.webhook_code || 'unknown'}`);

  // Always return 200 — Plaid retries on non-2xx
  res.status(200).json({ received: true });
});

export default router;
