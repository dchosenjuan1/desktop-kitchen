import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/index.js';
import { initMigrations, runMigrations } from './db/migrate.js';
import { tenantMiddleware } from './middleware/tenant.js';

// Import routes
import menuRoutes from './routes/menu.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes, { mpOAuthCallback, mpWebhook } from './routes/payments.js';
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
import cfdiPublicRoutes from './routes/cfdi-public.js';
import accountRoutes from './routes/account.js';
import wasteRoutes from './routes/waste.js';
import cfdiRoutes from './routes/cfdi.js';
import credentialsRoutes from './routes/credentials.js';
import { initAI } from './ai/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Railway (and most PaaS) sit behind a reverse proxy.
// Without this, req.hostname won't reflect the actual Host header.
app.set('trust proxy', 1);

// CORS — allow *.desktop.kitchen and localhost dev
const CORS_ORIGIN_REGEX = /^https?:\/\/(.*\.desktop\.kitchen|localhost(:\d+)?)$/;
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

// Capture raw body for delivery webhook signature verification
app.use(express.json({
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Admin routes (uses admin pool, not tenant-scoped)
app.use('/admin', adminRoutes);

// Auth routes (uses admin pool for registration/login, not tenant-scoped)
app.use('/api/auth', authRoutes);

// Menu board (public, no auth required)
app.use('/api/menu-board', menuBoardRoutes);

// CFDI public self-service (token-based, no auth)
app.use('/api/cfdi-public', cfdiPublicRoutes);

// Mercado Pago OAuth callback and webhook (before tenant middleware — no tenant context)
app.get('/api/payments/mp/callback', mpOAuthCallback);
app.post('/api/payments/mp/webhook', mpWebhook);

// Promo code validation (public, no tenant context needed)
app.get('/api/billing/promo/validate', promoValidateHandler);

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

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Fail fast if JWT_SECRET is not set in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production.');
  process.exit(1);
}

// Start server (async IIFE)
(async () => {
  try {
    await initDb();
    await initMigrations();
    await runMigrations('default');
    await initAI();
    app.listen(PORT, () => {
      console.log(`Desktop Kitchen POS server running on port ${PORT}`);
      console.log(`Database: Neon Postgres`);
    });
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
})();
