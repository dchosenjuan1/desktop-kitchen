import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb, adminSql } from './db/index.js';
import { initMigrations, runMigrations } from './db/migrate.js';
import { tenantMiddleware } from './middleware/tenant.js';

// Import routes
import menuRoutes from './routes/menu.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes, { mpOAuthCallback, mpWebhook, conektaWebhook } from './routes/payments.js';
import inventoryRoutes from './routes/inventory.js';
import employeesRoutes from './routes/employees.js';
import reportsRoutes from './routes/reports.js';
import aiRoutes from './routes/ai.js';
import modifiersRoutes from './routes/modifiers.js';
import combosRoutes from './routes/combos.js';
import printersRoutes from './routes/printers.js';
import deliveryRoutes from './routes/delivery.js';
import purchaseOrdersRoutes from './routes/purchase-orders.js';
import loyaltyRoutes from './routes/loyalty.js';
import orderTemplatesRoutes from './routes/order-templates.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import brandingRoutes from './routes/branding.js';
import billingRoutes, { stripeWebhook, promoValidateHandler } from './routes/billing.js';
import deliveryIntelRoutes from './routes/delivery-intelligence.js';
import pricingRoutes from './routes/pricing.js';
import leadsRoutes, { adminLeadsHandler } from './routes/leads.js';
import menuBoardRoutes from './routes/menu-board.js';
import customerOrderRoutes from './routes/customer-order.js';
import cfdiPublicRoutes from './routes/cfdi-public.js';
import accountRoutes from './routes/account.js';
import wasteRoutes from './routes/waste.js';
import cfdiRoutes from './routes/cfdi.js';
import credentialsRoutes from './routes/credentials.js';
// Chaos/stress-test routes — only loaded when ENABLE_CHAOS=true
const chaosEnabled = process.env.ENABLE_CHAOS === 'true';
const stressTestRoutes = chaosEnabled ? (await import('./routes/stress-test.js')).default : null;
const chaosRoutes = chaosEnabled ? (await import('./routes/chaos.js')).default : null;
const adminStressTestRoutesLazy = chaosEnabled ? (await import('./routes/admin-stress-test.js')).default : null;
import bankingRoutes from './routes/banking.js';
import demoDataRoutes from './routes/demo-data.js';
import demoProvisionRoutes from './routes/demo-provision.js';
import salesRoutes from './routes/sales.js';
import onboardingRoutes from './routes/onboarding.js';
import financingRoutes, { adminRouter as financingAdminRoutes } from './routes/financing.js';
import settlementRoutes, { adminRouter as settlementAdminRoutes } from './routes/settlement.js';
import merchantBankingRoutes from './routes/merchant-banking.js';
import { startSettlementScheduler, stopSettlementScheduler } from './services/settlement/scheduler.js';
import plaidWebhook from './routes/webhooks/plaid.js';
import getnetWebhook from './routes/getnetWebhook.js';
import getnetRoutes from './routes/getnet.js';
import expensesRoutes from './routes/expenses.js';
import { initAI, shutdownAI } from './ai/index.js';
import { startBankingSyncScheduler } from './services/banking/SyncScheduler.js';
import { startFinancingScheduler, stopFinancingScheduler } from './services/financing/scheduler.js';
import { shutdown as shutdownDb } from './db/index.js';
import { requestMetricsMiddleware, recordErrorDetail } from './lib/requestMetrics.js';
import { startMetricsCollector, stopMetricsCollector } from './lib/metricsCollector.js';
import { startAlertEvaluator, stopAlertEvaluator } from './lib/alertEvaluator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Railway (and most PaaS) sit behind a reverse proxy.
// Without this, req.hostname won't reflect the actual Host header.
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // CSP managed by frontend build
  crossOriginEmbedderPolicy: false, // Allow loading external images/fonts
}));

// Request ID middleware — attach a unique ID to every request for tracing
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  next();
});

// Request metrics middleware — track throughput, error rates, latency
app.use(requestMetricsMiddleware);

// CORS — allow *.desktop.kitchen and localhost dev
const CORS_ORIGIN_REGEX = /^(https?:\/\/(.*\.desktop\.kitchen|localhost(:\d+)?)|capacitor:\/\/localhost)$/;
app.use(cors({
  origin(origin, cb) {
    // Allow requests with no Origin header (curl, server-to-server, same-origin)
    if (!origin || CORS_ORIGIN_REGEX.test(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Stripe webhook needs raw body (before express.json)
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Plaid webhook needs raw body for signature verification (before express.json)
app.use('/webhooks/plaid', express.raw({ type: 'application/json' }), plaidWebhook);

// Capture raw body for delivery webhook signature verification
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    if (req.url?.startsWith('/api/delivery/webhook')) {
      req.rawBody = buf;
    }
  },
}));
app.use(express.static(path.join(__dirname, '../dist')));

// Serve uploaded files (logos, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

// Health check endpoints (before tenant middleware — always accessible)
app.get('/health', async (req, res) => {
  try {
    await adminSql`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});
app.get('/api/health', async (req, res) => {
  try {
    await adminSql`SELECT 1`;
    res.json({ ok: true, db: 'connected' });
  } catch {
    res.status(503).json({ ok: false, db: 'unreachable' });
  }
});

// Feature flags (before tenant middleware — always accessible)
app.get('/api/features', (_req, res) => {
  res.json({ stressTest: chaosEnabled });
});

// Global API rate limiter — safety net for all /api and /admin routes
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 200,                  // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use('/api', globalApiLimiter);
app.use('/admin', globalApiLimiter);

// Admin routes (uses admin pool, not tenant-scoped)
app.use('/admin', adminRoutes);
app.use('/admin/financing', financingAdminRoutes);
app.use('/admin/settlement', settlementAdminRoutes);
if (adminStressTestRoutesLazy) app.use('/admin/stress-test', adminStressTestRoutesLazy);

// Chaos agent (only when ENABLE_CHAOS=true)
if (chaosRoutes) app.use('/api/chaos', chaosRoutes);

// Auth routes (uses admin pool for registration/login, not tenant-scoped)
app.use('/api/auth', authRoutes);

// CFDI public self-service (token-based, no auth)
app.use('/api/cfdi-public', cfdiPublicRoutes);

// Mercado Pago OAuth callback and webhook (before tenant middleware — no tenant context)
app.get('/api/payments/mp/callback', mpOAuthCallback);
app.post('/api/payments/mp/webhook', mpWebhook);

// Conekta webhook (before tenant middleware — cross-tenant lookup by conekta_order_id)
app.post('/api/payments/conekta/webhook', conektaWebhook);

// Getnet webhook (before tenant middleware — cross-tenant lookup by getnet_payment_id)
app.use('/webhooks/getnet', getnetWebhook);

// Promo code validation (public, no tenant context needed)
app.get('/api/billing/promo/validate', promoValidateHandler);

// Sales team commission tracking (platform-level, uses adminSql)
app.use('/api/sales', salesRoutes);

// Demo provisioning (public, no tenant context needed)
app.use('/api/demo', demoProvisionRoutes);

// Demo auto-login (public, token-based auth)
app.post('/api/auth/demo-login', (req, res, next) => {
  // Forward to demo-provision router's demo-login handler
  req.url = '/demo-login';
  demoProvisionRoutes(req, res, next);
});

// Lead capture (public, no tenant context needed)
app.use('/api/leads', leadsRoutes);

// Admin leads endpoint (under /admin, protected by requireAdmin in admin routes)
app.get('/admin/leads', (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin secret' });
  }
  adminLeadsHandler(req, res);
});

// Tenant resolution middleware — all /api routes below use the resolved tenant DB
app.use('/api', tenantMiddleware);

// Menu board (public display, no auth — tenant resolved by subdomain for RLS)
app.use('/api/menu-board', menuBoardRoutes);

// Customer ordering (public, QR code — tenant resolved by subdomain for RLS)
app.use('/api/customer-order', customerOrderRoutes);

// API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/modifiers', modifiersRoutes);
app.use('/api/combos', combosRoutes);
app.use('/api/printers', printersRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/order-templates', orderTemplatesRoutes);
app.use('/api/waste', wasteRoutes);
app.use('/api/branding', brandingRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/delivery-intel', deliveryIntelRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/cfdi', cfdiRoutes);
app.use('/api/credentials', credentialsRoutes);
if (stressTestRoutes) app.use('/api/stress-test', stressTestRoutes);
app.use('/api/demo-data', demoDataRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/financing', financingRoutes);
app.use('/api/settlement', settlementRoutes);
app.use('/api/merchant-banking', merchantBankingRoutes);
app.use('/api/getnet', getnetRoutes);
app.use('/api/expenses', expensesRoutes);

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handler
app.use((err, req, res, _next) => {
  console.error(`[${req.id}] ${req.method} ${req.path} tenant=${req.tenant?.id || 'none'}:`, err.message || err);
  if (err.stack) console.error(`[${req.id}] Stack:`, err.stack);
  if (err.type) console.error(`[${req.id}] Type: ${err.type}, Status: ${err.status || err.statusCode}`);
  recordErrorDetail(req, err);
  res.status(err.status || err.statusCode || 500).json({ error: err.expose ? err.message : 'Internal server error' });
});

// Fail fast if critical secrets are missing in production
if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET', 'ADMIN_SECRET', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`FATAL: Missing required environment variables in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ==================== Graceful Shutdown ====================

let server;
let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Shutdown] ${signal} received — shutting down gracefully...`);

  // 1. Stop accepting new connections
  if (server) {
    server.close(() => {
      console.log('[Shutdown] HTTP server closed');
    });
  }

  // 2. Stop AI scheduler (clears all intervals)
  shutdownAI();

  // 2b. Stop financing scheduler
  stopFinancingScheduler();

  // 2c. Stop settlement scheduler
  stopSettlementScheduler();

  // 2d. Stop metrics collector and alert evaluator
  stopMetricsCollector();
  stopAlertEvaluator();

  // 3. Close database connection pools
  await shutdownDb();
  console.log('[Shutdown] Database pools closed');

  // 4. Exit cleanly
  console.log('[Shutdown] Goodbye');
  process.exit(0);
}

// Give shutdown 10s before force-killing (Railway sends SIGTERM, waits, then SIGKILL)
function shutdownWithTimeout(signal) {
  const timer = setTimeout(() => {
    console.error('[Shutdown] Timed out after 10s — forcing exit');
    process.exit(1);
  }, 10_000);
  timer.unref(); // Don't keep process alive just for the timer
  gracefulShutdown(signal);
}

process.on('SIGTERM', () => shutdownWithTimeout('SIGTERM'));
process.on('SIGINT', () => shutdownWithTimeout('SIGINT'));

// ==================== Start Server ====================

(async () => {
  try {
    await initDb();
    await initMigrations();
    await runMigrations('default');
    await initAI();

    // Background schedulers (skip in test mode to avoid connection pressure)
    if (process.env.NODE_ENV !== 'test') {
      startBankingSyncScheduler();
      startFinancingScheduler();
      startSettlementScheduler();
      startMetricsCollector();
      startAlertEvaluator();
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Desktop Kitchen POS server running on port ${PORT}`);
      console.log(`Database: Neon Postgres`);
    });
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
})();
