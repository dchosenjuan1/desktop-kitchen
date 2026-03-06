/**
 * Financing API Routes
 *
 * Merchant-facing endpoints (ownerAuth + tenant middleware):
 *   POST   /api/financing/consent
 *   GET    /api/financing/consent
 *   DELETE /api/financing/consent
 *   GET    /api/financing/profile
 *   GET    /api/financing/offers
 *   POST   /api/financing/offers/:id/view
 *   POST   /api/financing/offers/:id/accept
 *   POST   /api/financing/offers/:id/decline
 *
 * Super admin endpoints (adminSecret):
 *   GET    /admin/financing/overview
 *   GET    /admin/financing/profiles
 *   GET    /admin/financing/profiles/:tenantId
 *   POST   /admin/financing/profiles/:tenantId/recalculate
 *   GET    /admin/financing/offers
 *   PATCH  /admin/financing/offers/:id
 *   GET    /admin/financing/events
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { adminSql, getConn, getTenantId } from '../db/index.js';
import { requireOwner } from '../middleware/ownerAuth.js';
import { getTenant } from '../tenants.js';
import { calculateMerchantProfile } from '../services/financing/scoringEngine.js';
import { auditFinancing } from '../lib/auditLog.js';
import { CONSENT_VERSION, consentText, getConsentDocument } from '../templates/financing-consent.js';
import { notifyOfferAccepted } from '../services/financing/webhooks.js';

const router = Router();

// ─── Rate limiters ───────────────────────────────────────────────────

const consentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  keyGenerator: (req) => `consent-${req.owner?.tenantId || 'anon'}`,
  message: { error: 'Too many consent requests, please try again later' },
  validate: false,
});

const acceptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Too many acceptance requests, please try again later' },
  validate: false,
});

/**
 * Generate eligibility tips based on profile metrics.
 */
function generateEligibilityTips(profile) {
  const tips = [];
  if (parseFloat(profile.card_revenue_percent) < 50) {
    tips.push('Accept more card payments to improve your score');
  }
  if (profile.days_active < 90) {
    tips.push('Continue operating to build business maturity (90+ days recommended)');
  }
  if (parseFloat(profile.monthly_avg_revenue) < 30000) {
    tips.push('Grow your monthly revenue above $30,000 MXN to qualify');
  }
  if (parseFloat(profile.revenue_volatility) >= 0.5) {
    tips.push('Maintain more consistent daily sales to reduce revenue volatility');
  }
  if (parseFloat(profile.refund_rate) >= 0.05) {
    tips.push('Reduce your refund rate below 5% to improve your score');
  }
  if (profile.eligibility_status === 'eligible' && tips.length === 0) {
    tips.push('Your business is in great shape — you qualify for financing!');
  }
  return tips;
}

// ═══════════════════════════════════════════════════════════════════════
// MERCHANT-FACING ENDPOINTS (ownerAuth required)
// These run AFTER tenant middleware, so req.owner and tenant context exist.
// ═══════════════════════════════════════════════════════════════════════

// POST /api/financing/consent
router.post('/consent', requireOwner, consentLimiter, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const { consent_types } = req.body;

    if (!Array.isArray(consent_types) || consent_types.length === 0) {
      return res.status(400).json({ error: 'consent_types array is required' });
    }

    const validTypes = ['financial_data_analysis', 'financing_offers', 'marketing_communications'];
    const invalid = consent_types.filter(t => !validTypes.includes(t));
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid consent types: ${invalid.join(', ')}` });
    }

    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const conn = getConn();

    // Record each consent type via tenant-scoped connection (RLS)
    for (const consentType of consent_types) {
      await conn`
        INSERT INTO data_processing_consent (consent_type, accepted, accepted_at, ip_address, user_agent, consent_version)
        VALUES (${consentType}, true, NOW(), ${ip}, ${userAgent}, ${CONSENT_VERSION})
      `;
    }

    // Set financing_consent_at on tenant record (adminSql, no RLS)
    await adminSql`
      UPDATE tenants
      SET financing_consent_at = NOW(),
          financing_consent_ip = ${ip},
          financing_consent_version = ${CONSENT_VERSION}
      WHERE id = ${tenantId}
    `;

    // Trigger initial profile calculation async (don't block response)
    calculateMerchantProfile(tenantId).catch(err => {
      console.error(`[Financing] Initial profile calc failed for tenant ${tenantId}:`, err.message);
    });

    auditFinancing({
      tenantId,
      actorType: 'owner',
      actorId: req.owner.email,
      eventType: 'consent_granted',
      resource: 'financing_consent',
      details: { consent_types, version: CONSENT_VERSION },
      ip,
      userAgent,
    });

    res.json({ consented: true, consent_at: new Date().toISOString() });
  } catch (error) {
    console.error('[Financing] Consent error:', error.message);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

// GET /api/financing/consent
router.get('/consent', requireOwner, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const tenant = await getTenant(tenantId);

    const conn = getConn();
    const consents = await conn`
      SELECT consent_type, consent_version, accepted_at FROM data_processing_consent
      WHERE accepted = true AND revoked_at IS NULL
    `;

    res.json({
      consented: !!tenant.financing_consent_at,
      consent_at: tenant.financing_consent_at || null,
      consent_version: tenant.financing_consent_version || null,
      consent_types: consents.map(c => c.consent_type),
    });
  } catch (error) {
    console.error('[Financing] Consent fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch consent status' });
  }
});

// GET /api/financing/consent/terms
router.get('/consent/terms', requireOwner, async (req, res) => {
  const locale = req.query.locale || 'en';
  const text = consentText[locale] || consentText.en;
  res.json({ version: CONSENT_VERSION, consent: text });
});

// DELETE /api/financing/consent
router.delete('/consent', requireOwner, consentLimiter, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || '';
    const conn = getConn();

    // Revoke all active consents (don't delete — regulatory requirement)
    await conn`
      UPDATE data_processing_consent
      SET revoked_at = NOW(), accepted = false
      WHERE accepted = true AND revoked_at IS NULL
    `;

    // Withdraw any active financing offers
    const withdrawn = await adminSql`
      UPDATE merchant_financing_offers
      SET status = 'withdrawn', admin_notes = 'Auto-withdrawn: consent revoked'
      WHERE tenant_id = ${tenantId}
        AND status IN ('available', 'viewed')
      RETURNING id
    `;

    // Clear financing_consent_at on tenant
    await adminSql`
      UPDATE tenants
      SET financing_consent_at = NULL
      WHERE id = ${tenantId}
    `;

    auditFinancing({
      tenantId,
      actorType: 'owner',
      actorId: req.owner.email,
      eventType: 'consent_revoked',
      resource: 'financing_consent',
      details: { withdrawn_offers: withdrawn.map(o => o.id) },
      ip,
      userAgent,
    });

    res.json({ revoked: true, offers_withdrawn: withdrawn.length });
  } catch (error) {
    console.error('[Financing] Consent revoke error:', error.message);
    res.status(500).json({ error: 'Failed to revoke consent' });
  }
});

// GET /api/financing/profile
router.get('/profile', requireOwner, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const tenant = await getTenant(tenantId);

    if (!tenant.financing_consent_at) {
      return res.status(403).json({ error: 'Financing consent required' });
    }
    if (tenant.plan !== 'pro') {
      return res.status(403).json({
        error: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'pro',
        feature: 'financing',
        currentPlan: tenant.plan,
      });
    }

    const [profile] = await adminSql`
      SELECT * FROM merchant_financial_profiles
      WHERE tenant_id = ${tenantId}
    `;

    if (!profile) {
      return res.json({ profile: null, eligibility_tips: ['Your profile is being calculated. Check back soon.'] });
    }

    const tips = generateEligibilityTips(profile);
    res.json({ profile, eligibility_tips: tips });
  } catch (error) {
    console.error('[Financing] Profile fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch financial profile' });
  }
});

// GET /api/financing/offers
router.get('/offers', requireOwner, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const tenant = await getTenant(tenantId);

    if (!tenant.financing_consent_at) {
      return res.status(403).json({ error: 'Financing consent required' });
    }
    if (tenant.plan !== 'pro') {
      return res.status(403).json({
        error: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan: 'pro',
        feature: 'financing',
        currentPlan: tenant.plan,
      });
    }

    const offers = await adminSql`
      SELECT * FROM merchant_financing_offers
      WHERE tenant_id = ${tenantId}
        AND status IN ('available', 'viewed')
      ORDER BY created_at DESC
    `;

    res.json({
      offers,
      has_active_offer: offers.length > 0,
    });
  } catch (error) {
    console.error('[Financing] Offers fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// POST /api/financing/offers/:id/view
router.post('/offers/:id/view', requireOwner, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const offerId = parseInt(req.params.id, 10);

    const [offer] = await adminSql`
      UPDATE merchant_financing_offers
      SET status = 'viewed'
      WHERE id = ${offerId}
        AND tenant_id = ${tenantId}
        AND status = 'available'
      RETURNING *
    `;

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or already viewed' });
    }

    auditFinancing({
      tenantId,
      actorType: 'owner',
      actorId: req.owner.email,
      eventType: 'offer_viewed',
      resource: 'financing_offer',
      resourceId: offerId,
      details: { offer_id: offerId },
      ip: req.ip,
    });
    res.json({ status: 'viewed' });
  } catch (error) {
    console.error('[Financing] Offer view error:', error.message);
    res.status(500).json({ error: 'Failed to mark offer as viewed' });
  }
});

// POST /api/financing/offers/:id/accept
router.post('/offers/:id/accept', requireOwner, acceptLimiter, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const offerId = parseInt(req.params.id, 10);

    const [offer] = await adminSql`
      UPDATE merchant_financing_offers
      SET status = 'accepted', accepted_at = NOW()
      WHERE id = ${offerId}
        AND tenant_id = ${tenantId}
        AND status IN ('available', 'viewed')
      RETURNING *
    `;

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or not in acceptable state' });
    }

    auditFinancing({
      tenantId,
      actorType: 'owner',
      actorId: req.owner.email,
      eventType: 'offer_accepted',
      resource: 'financing_offer',
      resourceId: offerId,
      details: {
        offer_id: offerId,
        offer_amount: parseFloat(offer.offer_amount),
        factor_rate: parseFloat(offer.factor_rate),
        holdback_percent: parseFloat(offer.holdback_percent),
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    // Notify webhook (fire-and-forget)
    const tenant = await getTenant(tenantId);
    const [profile] = await adminSql`
      SELECT * FROM merchant_financial_profiles WHERE tenant_id = ${tenantId}
    `;
    notifyOfferAccepted(offer, profile, tenant).catch(() => {});

    res.json({
      status: 'accepted',
      message: 'Our team will contact you within 24 hours.',
    });
  } catch (error) {
    console.error('[Financing] Offer accept error:', error.message);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
});

// POST /api/financing/offers/:id/decline
router.post('/offers/:id/decline', requireOwner, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const offerId = parseInt(req.params.id, 10);
    const { reason } = req.body || {};

    const [offer] = await adminSql`
      UPDATE merchant_financing_offers
      SET status = 'declined', declined_at = NOW()
      WHERE id = ${offerId}
        AND tenant_id = ${tenantId}
        AND status IN ('available', 'viewed')
      RETURNING *
    `;

    if (!offer) {
      return res.status(404).json({ error: 'Offer not found or not in declinable state' });
    }

    auditFinancing({
      tenantId,
      actorType: 'owner',
      actorId: req.owner.email,
      eventType: 'offer_declined',
      resource: 'financing_offer',
      resourceId: offerId,
      details: { offer_id: offerId, reason: reason || null },
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({ status: 'declined' });
  } catch (error) {
    console.error('[Financing] Offer decline error:', error.message);
    res.status(500).json({ error: 'Failed to decline offer' });
  }
});

// GET /api/financing/export — download financial profile as JSON (ARCO: Access)
router.get('/export', requireOwner, async (req, res) => {
  try {
    const tenantId = req.owner.tenantId;
    const tenant = await getTenant(tenantId);

    if (!tenant.financing_consent_at) {
      return res.status(403).json({ error: 'Financing consent required' });
    }

    const [profile] = await adminSql`
      SELECT * FROM merchant_financial_profiles WHERE tenant_id = ${tenantId}
    `;

    const offers = await adminSql`
      SELECT id, offer_amount, holdback_percent, factor_rate, total_repayment,
             estimated_repayment_days, status, created_at, expires_at,
             accepted_at, declined_at
      FROM merchant_financing_offers
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    const events = await adminSql`
      SELECT event_type, details, created_at
      FROM merchant_financing_events
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 500
    `;

    const conn = getConn();
    const consents = await conn`
      SELECT consent_type, accepted, accepted_at, revoked_at, consent_version
      FROM data_processing_consent
      ORDER BY accepted_at DESC
    `;

    auditFinancing({
      tenantId,
      actorType: 'owner',
      actorId: req.owner.email,
      eventType: 'data_export_requested',
      resource: 'financial_profile',
      details: { export_format: 'json' },
      ip: req.ip,
      userAgent: req.headers['user-agent'] || '',
    });

    res.json({
      exported_at: new Date().toISOString(),
      tenant_id: tenantId,
      tenant_name: tenant.name,
      profile: profile || null,
      offers: Array.from(offers),
      consent_records: Array.from(consents),
      events: Array.from(events),
    });
  } catch (error) {
    console.error('[Financing] Export error:', error.message);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// SUPER ADMIN ENDPOINTS
// These are mounted under /admin/financing in server/index.js.
// Protected by requireAdmin middleware (applied at mount point).
// ═══════════════════════════════════════════════════════════════════════

export const adminRouter = Router();

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many admin requests, please try again later' },
});

adminRouter.use(adminLimiter);

// Inline admin auth (same pattern as admin.js)
function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!process.env.ADMIN_SECRET) return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  if (secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Invalid admin secret' });
  next();
}

adminRouter.use(requireAdmin);

// GET /admin/financing/overview
adminRouter.get('/overview', async (req, res) => {
  try {
    const [counts] = await adminSql`
      SELECT
        COUNT(*) FILTER (WHERE financing_consent_at IS NOT NULL)::int AS total_consented_merchants
      FROM tenants
      WHERE active = true
    `;

    const [eligibility] = await adminSql`
      SELECT
        COUNT(*) FILTER (WHERE eligibility_status = 'eligible')::int AS total_eligible,
        COUNT(*) FILTER (WHERE eligibility_status = 'pre_eligible')::int AS total_pre_eligible,
        COUNT(*) FILTER (WHERE eligibility_status = 'ineligible')::int AS total_ineligible,
        COALESCE(AVG(risk_score), 0) AS avg_risk_score
      FROM merchant_financial_profiles
    `;

    const [offerStats] = await adminSql`
      SELECT
        COUNT(*)::int AS total_offers_generated,
        COUNT(*) FILTER (WHERE status = 'accepted')::int AS total_offers_accepted,
        COUNT(*) FILTER (WHERE status = 'declined')::int AS total_offers_declined,
        COALESCE(SUM(offer_amount) FILTER (WHERE status IN ('available', 'viewed')), 0) AS total_capital_offered,
        COALESCE(SUM(offer_amount) FILTER (WHERE status = 'accepted'), 0) AS total_capital_accepted
      FROM merchant_financing_offers
    `;

    const scoreDistribution = await adminSql`
      SELECT
        CASE
          WHEN risk_score <= 20 THEN '0-20'
          WHEN risk_score <= 40 THEN '21-40'
          WHEN risk_score <= 60 THEN '41-60'
          WHEN risk_score <= 80 THEN '61-80'
          ELSE '81-100'
        END AS bucket,
        COUNT(*)::int AS count
      FROM merchant_financial_profiles
      GROUP BY bucket
      ORDER BY bucket
    `;

    const distribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    for (const row of scoreDistribution) {
      distribution[row.bucket] = row.count;
    }

    const totalGenerated = offerStats.total_offers_generated;
    const totalAccepted = offerStats.total_offers_accepted;
    const totalDeclined = offerStats.total_offers_declined;

    res.json({
      total_consented_merchants: counts.total_consented_merchants,
      total_eligible: eligibility.total_eligible,
      total_pre_eligible: eligibility.total_pre_eligible,
      total_ineligible: eligibility.total_ineligible,
      total_offers_generated: totalGenerated,
      total_offers_accepted: totalAccepted,
      total_offers_declined: totalDeclined,
      total_capital_offered: parseFloat(offerStats.total_capital_offered),
      total_capital_accepted: parseFloat(offerStats.total_capital_accepted),
      acceptance_rate: totalGenerated > 0 ? totalAccepted / totalGenerated : 0,
      avg_risk_score: parseFloat(eligibility.avg_risk_score),
      score_distribution: distribution,
    });
  } catch (error) {
    console.error('[Financing Admin] Overview error:', error.message);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// GET /admin/financing/profiles
adminRouter.get('/profiles', async (req, res) => {
  try {
    const {
      eligibility,
      sort = 'risk_score',
      order = 'desc',
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
    const offsetNum = parseInt(offset, 10) || 0;

    // Whitelist sortable columns
    const sortableColumns = ['risk_score', 'monthly_avg_revenue', 'days_active', 'last_calculated_at', 'created_at'];
    const sortCol = sortableColumns.includes(sort) ? sort : 'risk_score';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    let profiles;
    let total;

    if (eligibility) {
      [{ count: total }] = await adminSql`
        SELECT COUNT(*)::int AS count FROM merchant_financial_profiles
        WHERE eligibility_status = ${eligibility}
      `;
      profiles = await adminSql.unsafe(
        `SELECT p.*, t.name AS tenant_name, t.subdomain, t.plan
         FROM merchant_financial_profiles p
         JOIN tenants t ON t.id = p.tenant_id
         WHERE p.eligibility_status = $1
         ORDER BY p.${sortCol} ${sortDir}
         LIMIT $2 OFFSET $3`,
        [eligibility, limitNum, offsetNum]
      );
    } else {
      [{ count: total }] = await adminSql`
        SELECT COUNT(*)::int AS count FROM merchant_financial_profiles
      `;
      profiles = await adminSql.unsafe(
        `SELECT p.*, t.name AS tenant_name, t.subdomain, t.plan
         FROM merchant_financial_profiles p
         JOIN tenants t ON t.id = p.tenant_id
         ORDER BY p.${sortCol} ${sortDir}
         LIMIT $1 OFFSET $2`,
        [limitNum, offsetNum]
      );
    }

    res.json({ profiles: Array.from(profiles), total });
  } catch (error) {
    console.error('[Financing Admin] Profiles list error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// GET /admin/financing/profiles/:tenantId
adminRouter.get('/profiles/:tenantId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);

    const [profile] = await adminSql`
      SELECT * FROM merchant_financial_profiles WHERE tenant_id = ${tenantId}
    `;

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const offers = await adminSql`
      SELECT * FROM merchant_financing_offers
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;

    const events = await adminSql`
      SELECT * FROM merchant_financing_events
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const [tenant] = await adminSql`
      SELECT name, plan, created_at FROM tenants WHERE id = ${tenantId}
    `;

    res.json({
      profile,
      offers: Array.from(offers),
      events: Array.from(events),
      tenant: tenant || null,
    });
  } catch (error) {
    console.error('[Financing Admin] Profile detail error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile details' });
  }
});

// POST /admin/financing/profiles/:tenantId/recalculate
adminRouter.post('/profiles/:tenantId/recalculate', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId, 10);
    const profile = await calculateMerchantProfile(tenantId);

    auditFinancing({
      tenantId,
      actorType: 'admin',
      actorId: 'super_admin',
      eventType: 'profile_recalculated',
      resource: 'financial_profile',
      details: { trigger: 'manual', risk_score: profile?.risk_score },
      ip: req.ip,
    });

    res.json({ profile });
  } catch (error) {
    console.error('[Financing Admin] Recalculate error:', error.message);
    res.status(500).json({ error: 'Failed to recalculate profile' });
  }
});

// GET /admin/financing/offers
adminRouter.get('/offers', async (req, res) => {
  try {
    const {
      status,
      sort = 'created_at',
      order = 'desc',
      limit = '50',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
    const offsetNum = parseInt(offset, 10) || 0;

    const sortableColumns = ['created_at', 'offer_amount', 'factor_rate', 'expires_at'];
    const sortCol = sortableColumns.includes(sort) ? sort : 'created_at';
    const sortDir = order === 'asc' ? 'ASC' : 'DESC';

    let offers;
    let total;

    if (status) {
      [{ count: total }] = await adminSql`
        SELECT COUNT(*)::int AS count FROM merchant_financing_offers WHERE status = ${status}
      `;
      offers = await adminSql.unsafe(
        `SELECT o.*, t.name AS tenant_name
         FROM merchant_financing_offers o
         JOIN tenants t ON t.id = o.tenant_id
         WHERE o.status = $1
         ORDER BY o.${sortCol} ${sortDir}
         LIMIT $2 OFFSET $3`,
        [status, limitNum, offsetNum]
      );
    } else {
      [{ count: total }] = await adminSql`
        SELECT COUNT(*)::int AS count FROM merchant_financing_offers
      `;
      offers = await adminSql.unsafe(
        `SELECT o.*, t.name AS tenant_name
         FROM merchant_financing_offers o
         JOIN tenants t ON t.id = o.tenant_id
         ORDER BY o.${sortCol} ${sortDir}
         LIMIT $1 OFFSET $2`,
        [limitNum, offsetNum]
      );
    }

    res.json({ offers: Array.from(offers), total });
  } catch (error) {
    console.error('[Financing Admin] Offers list error:', error.message);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// PATCH /admin/financing/offers/:id
adminRouter.patch('/offers/:id', async (req, res) => {
  try {
    const offerId = parseInt(req.params.id, 10);
    const { offer_amount, holdback_percent, factor_rate, status, admin_notes } = req.body;

    // Fetch current offer
    const [existing] = await adminSql`
      SELECT * FROM merchant_financing_offers WHERE id = ${offerId}
    `;
    if (!existing) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    // Build update values
    const newAmount = offer_amount != null ? parseFloat(offer_amount) : parseFloat(existing.offer_amount);
    const newRate = factor_rate != null ? parseFloat(factor_rate) : parseFloat(existing.factor_rate);
    const newHoldback = holdback_percent != null ? parseFloat(holdback_percent) : parseFloat(existing.holdback_percent);
    const newStatus = status || existing.status;
    const newNotes = admin_notes !== undefined ? admin_notes : existing.admin_notes;

    // Recalculate derived fields
    const newTotalRepayment = newAmount * newRate;

    // Re-estimate repayment days if amount or rate changed
    let newRepaymentDays = existing.estimated_repayment_days;
    if (offer_amount != null || factor_rate != null || holdback_percent != null) {
      const [profile] = await adminSql`
        SELECT monthly_avg_revenue, card_revenue_percent
        FROM merchant_financial_profiles
        WHERE tenant_id = ${existing.tenant_id}
      `;
      if (profile) {
        const monthlyRev = parseFloat(profile.monthly_avg_revenue);
        const cardPct = parseFloat(profile.card_revenue_percent) / 100;
        const avgDailyCard = (monthlyRev / 30) * cardPct;
        const dailyHoldback = avgDailyCard * (newHoldback / 100);
        newRepaymentDays = dailyHoldback > 0 ? Math.ceil(newTotalRepayment / dailyHoldback) : 365;
      }
    }

    const [updated] = await adminSql`
      UPDATE merchant_financing_offers
      SET offer_amount = ${newAmount},
          holdback_percent = ${newHoldback},
          factor_rate = ${newRate},
          total_repayment = ${newTotalRepayment},
          estimated_repayment_days = ${newRepaymentDays},
          status = ${newStatus},
          admin_notes = ${newNotes}
      WHERE id = ${offerId}
      RETURNING *
    `;

    // Determine event type
    const isWithdraw = status === 'withdrawn' && existing.status !== 'withdrawn';
    const eventType = isWithdraw ? 'offer_withdrawn' : 'offer_modified';

    auditFinancing({
      tenantId: existing.tenant_id,
      actorType: 'admin',
      actorId: 'super_admin',
      eventType,
      resource: 'financing_offer',
      resourceId: offerId,
      details: {
        offer_id: offerId,
        changes: { offer_amount, holdback_percent, factor_rate, status, admin_notes },
        previous: {
          offer_amount: parseFloat(existing.offer_amount),
          holdback_percent: parseFloat(existing.holdback_percent),
          factor_rate: parseFloat(existing.factor_rate),
          status: existing.status,
        },
      },
      ip: req.ip,
    });

    res.json({ offer: updated });
  } catch (error) {
    console.error('[Financing Admin] Offer patch error:', error.message);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// GET /admin/financing/events
adminRouter.get('/events', async (req, res) => {
  try {
    const {
      tenant_id,
      event_type,
      from,
      to,
      limit = '100',
      offset = '0',
    } = req.query;

    const limitNum = Math.min(parseInt(limit, 10) || 100, 500);
    const offsetNum = parseInt(offset, 10) || 0;

    // Build dynamic query with conditions
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (tenant_id) {
      conditions.push(`tenant_id = $${paramIdx++}`);
      params.push(parseInt(tenant_id, 10));
    }
    if (event_type) {
      conditions.push(`event_type = $${paramIdx++}`);
      params.push(event_type);
    }
    if (from) {
      conditions.push(`created_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`created_at <= $${paramIdx++}`);
      params.push(to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ count: total }] = await adminSql.unsafe(
      `SELECT COUNT(*)::int AS count FROM merchant_financing_events ${whereClause}`,
      params
    );

    const events = await adminSql.unsafe(
      `SELECT e.*, t.name AS tenant_name
       FROM merchant_financing_events e
       JOIN tenants t ON t.id = e.tenant_id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limitNum, offsetNum]
    );

    res.json({ events: Array.from(events), total });
  } catch (error) {
    console.error('[Financing Admin] Events list error:', error.message);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /admin/financing/activity — real-time activity feed (last 50 events)
adminRouter.get('/activity', async (req, res) => {
  try {
    const { event_type, since } = req.query;

    let events;
    if (since) {
      // Poll mode: get events since a timestamp
      if (event_type) {
        events = await adminSql`
          SELECT e.*, t.name AS tenant_name
          FROM merchant_financing_events e
          JOIN tenants t ON t.id = e.tenant_id
          WHERE e.created_at > ${since} AND e.event_type = ${event_type}
          ORDER BY e.created_at DESC
          LIMIT 50
        `;
      } else {
        events = await adminSql`
          SELECT e.*, t.name AS tenant_name
          FROM merchant_financing_events e
          JOIN tenants t ON t.id = e.tenant_id
          WHERE e.created_at > ${since}
          ORDER BY e.created_at DESC
          LIMIT 50
        `;
      }
    } else {
      if (event_type) {
        events = await adminSql`
          SELECT e.*, t.name AS tenant_name
          FROM merchant_financing_events e
          JOIN tenants t ON t.id = e.tenant_id
          WHERE e.event_type = ${event_type}
          ORDER BY e.created_at DESC
          LIMIT 50
        `;
      } else {
        events = await adminSql`
          SELECT e.*, t.name AS tenant_name
          FROM merchant_financing_events e
          JOIN tenants t ON t.id = e.tenant_id
          ORDER BY e.created_at DESC
          LIMIT 50
        `;
      }
    }

    res.json({ events: Array.from(events) });
  } catch (error) {
    console.error('[Financing Admin] Activity feed error:', error.message);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

export default router;
