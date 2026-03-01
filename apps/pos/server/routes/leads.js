import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { adminSql } from '../db/index.js';

const router = Router();

// Rate limiting: 10 lead submissions per IP per 15 minutes
const leadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
});

/**
 * POST /api/leads — capture a lead from a campaign landing page
 *
 * Body: { restaurant_name?, name?, email, phone?, promo_code?, source? }
 * Returns: { success: true }
 *
 * Upserts on email — if email already exists, updates the record.
 */
router.post('/', leadLimiter, async (req, res) => {
  try {
    const { restaurant_name, name, email, phone, promo_code, source } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await adminSql`SELECT id FROM leads WHERE email = ${cleanEmail}`;
    if (existing.length > 0) {
      await adminSql`
        UPDATE leads SET
          restaurant_name = COALESCE(${restaurant_name || null}, restaurant_name),
          name = COALESCE(${name || null}, leads.name),
          phone = COALESCE(${phone || null}, phone),
          promo_code = COALESCE(${promo_code || null}, promo_code),
          source = COALESCE(${source || null}, source)
        WHERE email = ${cleanEmail}
      `;
    } else {
      await adminSql`
        INSERT INTO leads (restaurant_name, name, email, phone, promo_code, source)
        VALUES (
          ${restaurant_name || null},
          ${name || null},
          ${cleanEmail},
          ${phone || null},
          ${promo_code || null},
          ${source || 'mexico50_flyer'}
        )
      `;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

export default router;

/**
 * Admin leads endpoint — mounted separately under /admin/leads
 *
 * GET /admin/leads — returns all leads ordered by created_at DESC
 */
export async function adminLeadsHandler(req, res) {
  try {
    const rows = await adminSql`
      SELECT
        id, restaurant_name, name, email, phone, promo_code, source,
        created_at, converted_at, tenant_id,
        (tenant_id IS NOT NULL) AS converted
      FROM leads
      ORDER BY created_at DESC
    `;
    res.json(rows);
  } catch (error) {
    console.error('Admin leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
}
