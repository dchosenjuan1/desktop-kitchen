# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

```
desktop-kitchen/
├── apps/
│   ├── pos/           # POS system (Vite + Express)
│   ├── marketing/     # Desktop Kitchen marketing landing (Next.js + i18n)
│   ├── landing/       # Legacy restaurant landing page (Next.js + i18n) — OFF LIMITS
│   └── docs/          # Documentation site (Docusaurus 3)
├── assets/            # Brand assets (PDF, logo) — not in git
├── CLAUDE.md
└── .gitignore
```

## Apps

### POS (`apps/pos/`)

Full-stack multi-tenant white-label POS system for restaurants.

**Commands** (run from `apps/pos/`):
```bash
npm run dev              # Start both client (Vite :5173) and server (Express :3001) concurrently
npm run dev:client       # Vite dev server only
npm run dev:server       # Express backend only
npm run build            # Production build (outputs to /dist)
npm run start            # Production mode (NODE_ENV=production, serves /dist)
npm run seed             # Seed database with demo data (employees, menu, inventory)
```

**Deployment**: Railway → pos.desktop.kitchen (Root Directory: `apps/pos`)

### Marketing (`apps/marketing/`)

Desktop Kitchen SaaS marketing landing page. Single-page site with Hero, Features, How It Works, Pricing, CTA, and Footer sections. Teal `#0d9488` branding, Framer Motion scroll animations, dark backgrounds.

**Commands** (run from `apps/marketing/`):
```bash
npm run dev              # Next.js dev server on :3000
npm run build            # Production build
npm run start            # Production mode
```

**URLs**: `www.desktop.kitchen` (English), `es.desktop.kitchen` (Spanish)
**Deployment**: Vercel → www.desktop.kitchen (Root Directory: `apps/marketing`)

**i18n**: Messages in `messages/en.json` and `messages/es.json` (~70 keys). Subdomain-based locale via `i18n.domains` config in `next.config.js`. `localeDetection: false` to prevent browser-language redirects. Language switcher uses direct `<a href>` links between domains (not Next.js `<Link locale>`).

**Key patterns**: `FadeIn` component (useInView + motion.div), hero parallax (useScroll + useTransform), PricingCard inline component, feature/step data arrays with inline SVG icons. CTA buttons link to `pos.desktop.kitchen`.

### Landing (`apps/landing/`)

Restaurant landing page (legacy). **DO NOT MODIFY** — this is a separate brand.

**Commands** (run from `apps/landing/`):
```bash
npm run dev              # Next.js dev server on :3000
npm run build            # Production build
npm run start            # Production mode
```

**URLs**: `www.juanbertos.com` (English, default), `www.juanbertos.com/es` (Spanish)
**Deployment**: Vercel → www.juanbertos.com (Root Directory: `apps/landing`)

**i18n**: Messages in `messages/en.json` and `messages/es.json`. Language switcher uses `<Link locale={otherLocale}>`. ~30 translated strings.

### Docs (`apps/docs/`)

Documentation site built with Docusaurus 3.

**Commands** (run from `apps/docs/`):
```bash
npm run dev              # Docusaurus dev server on :3000
npm run build            # Production build
npm run serve            # Serve production build locally
```

**URL**: `docs.desktop.kitchen`
**Deployment**: Vercel (Root Directory: `apps/docs`)

**Structure**: Three doc sections — Getting Started, Feature Guides, Admin/Owner Guide. Sidebar config in `sidebars.js`. Docs served at root (`/`) via `routeBasePath: '/'`. i18n ready for `en` and `es`.

## POS Architecture

React + TypeScript frontend, Express.js backend, Neon Postgres database (shared multi-tenant, RLS-enforced).

**Frontend** (Vite on :5173) proxies `/api` requests to the **backend** (Express on :3001). In production, Express serves the built frontend from `/dist` with SPA fallback routing.

### Frontend (`apps/pos/src/`)

- **React 18 + TypeScript + Tailwind CSS + Vite**
- Routing: `react-router-dom` v6 in `App.tsx`
- Auth: `AuthContext` (PIN-based employee login, role-based route protection via `ProtectedRoute`)
- Roles: `cashier`, `kitchen`, `bar`, `manager`, `admin` — each role gates access to specific routes
- API client: `src/api/index.ts` — all fetch calls to `/api/*`, typed responses, Capacitor-aware base URL
- Types: `src/types/index.ts` — all shared interfaces (55+ types)
- Menu-board types: `src/types/menu-board.ts` — shared Badge, MenuItemData, CategoryData, BrandTheme, BrandData
- Charts: `recharts` for reports; Icons: `lucide-react`
- State: React Context + local component state (no Redux/Zustand)
- Screens in `src/screens/`, reusable components in `src/components/`
- POS modal components: `src/components/pos/` — NotesModal, PaymentModal, ReceiptModal
- Menu board components: `src/components/menu-board/`
- Admin components: `src/components/admin/` — CreateTenantModal, EditTenantModal, ResetPasswordModal, DeleteTenantModal
- Super Admin API client: `src/api/superAdmin.ts` — analytics, tenant CRUD, onboarding/offboarding functions
- Offline support: IndexedDB via Dexie.js for menu caching, offline orders, cart persistence
- Branding: CSS variable theming via `BrandingContext` — all colors use `brand-*` Tailwind classes backed by `var(--brand-N, #fallback)`

### Backend (`apps/pos/server/`)

- **Express.js with ES modules** (`"type": "module"` in package.json)
- Entry: `server/index.js` — mounts all route files under `/api/*`
- Database: `server/db/index.js` — two Postgres connection pools (`adminSql` as neondb_owner, `tenantSql` as app_user with RLS), helpers (`run`, `get`, `all`, `exec`), tenant context via AsyncLocalStorage
- Multi-tenancy: `AsyncLocalStorage` in `server/db/index.js` — tenant middleware reserves a connection with `set_config('app.tenant_id', ...)` for RLS
- Tenant registry: `server/tenants.js` — all tenants in single `tenants` table in Neon Postgres, CRUD via `adminSql`, cached via `server/lib/tenantCache.js`
- Tenant middleware: `server/middleware/tenant.js` — resolves via X-Tenant-ID header (requires admin secret in prod) → subdomain → DEFAULT_TENANT_ID env → hard 401 in production
- Owner auth: `server/middleware/ownerAuth.js` — JWT validation for tenant owners (separate from employee PIN auth)
- Plan enforcement: `server/planLimits.js` — `checkLimit` for numeric caps, `requirePlanFeature` middleware for feature gating on downgrade
- Audit logging: `server/lib/auditLog.js` — fire-and-forget writes to `audit_log` table (orders, employees, menu, tenant CRUD)
- Routes: 18 files in `server/routes/` (menu, orders, payments, inventory, employees, reports, modifiers, combos, printers, delivery, delivery-intelligence, ai, auth, admin, branding, billing, loyalty, order-templates)
- Payments: Stripe integration (PaymentIntents, refunds, split payments, subscriptions, billing portal, webhooks)
- Tax rate: 16% IVA (Mexican tax, hardcoded in order creation)
- Currency: MXN

### Multi-Tenancy

- Single Neon Postgres database — all tenant data in shared tables with `tenant_id` column
- Row Level Security (RLS) enforced via `app_user` role; policies use `current_setting('app.tenant_id')`
- `adminSql` pool (neondb_owner) bypasses RLS for admin routes, auth, AI scheduler, tenant CRUD
- `tenantSql` pool (app_user) enforces RLS for all tenant-scoped `/api/*` routes
- Tenant resolution order: `X-Tenant-ID` header (requires `X-Admin-Secret` in production) → subdomain → `DEFAULT_TENANT_ID` env → hard 401 in production (dev-only fallback)
- Auth routes (`/api/auth/*`) and admin routes (`/admin/*`) are mounted BEFORE tenant middleware (they use `adminSql`)
- AI scheduled jobs run outside request context and use `adminSql`
- Tenant lookups cached in-memory (60s TTL) via `server/lib/tenantCache.js` — invalidated on mutation
- Connection pool: 30 connections with 5s reserve timeout → returns 503 on exhaustion

#### Critical Constraint: Connection Reservation

Tenant isolation depends on `set_config('app.tenant_id', ..., false)` (session-scoped). This requires that each request gets a **dedicated reserved connection** via `tenantSql.reserve()`. Never use a shared connection pool (like PgBouncer in transaction mode) without switching to transaction-scoped config (`set_config(..., true)`) and wrapping all queries in explicit transactions. Violating this constraint causes **cross-tenant data leaks**.

### Branding System

- `src/lib/colorUtils.ts` — generates full Tailwind palette (50–900) from a single hex color
- `src/context/BrandingContext.tsx` — fetches tenant branding from `GET /api/branding`, applies CSS variables to `:root`
- `tailwind.config.js` — brand colors defined as `var(--brand-N, #fallback)` with teal defaults (#0d9488)
- All 427 color references use `brand-*` classes (zero hardcoded colors in codebase) — default is teal

### Stripe Billing

- `server/routes/billing.js` — checkout sessions, customer portal, webhook handler
- Webhook URL: `https://pos.desktop.kitchen/api/billing/webhook`
- Webhook mounted BEFORE `express.json()` for raw body signature verification
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Tenant fields: `plan` (trial/starter/pro), `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`
- Stripe account: `acct_1T1TerFNBtYtIvy1` (juan@injupe.com, MX, MXN, currently test mode)

### Delivery Intelligence (`server/routes/delivery-intelligence.js`)

- P&L analytics: per-platform revenue, commissions, net profit, POS vs delivery comparison
- Markup rules: per-platform price adjustments by item or category (percent or fixed)
- Virtual brands: different menu presentations per delivery platform from the same kitchen
- Customer recapture: identify delivery-only customers, send SMS offers via Twilio

### AI Intelligence Layer (`server/ai/`)

Background scheduler runs 6 jobs (suggestion cache refresh, hourly snapshots, item pair tracking, inventory velocity, cache cleanup, shrinkage detection). Heuristic-based suggestions always active; Grok API integration optional (requires `XAI_API_KEY`). Model: `grok-4-1-fast-reasoning` (configurable via `ai_config.grok_model`). Suggestion types: upsell, inventory-push, combo-upgrade, dynamic-pricing.

### Super Admin Dashboard (`/#/super-admin`)

- Protected by `ADMIN_SECRET` — entered via login gate, stored in `sessionStorage`
- Tabs: Overview (KPIs, plan distribution, signups, churn, activity), Tenants, Revenue, Health
- Tenant management: full CRUD with onboarding (create + seed + PIN generation) and offboarding (export + delete)
- API client: `src/api/superAdmin.ts` — `createTenant`, `seedTenant`, `patchTenant`, `resetTenantPassword`, `exportTenantData`, `deleteTenant`
- Modals: `src/components/admin/TenantManagement.tsx` — Create, Edit, ResetPassword, Delete modals + `downloadTenantExport` utility
- Delete safety: requires typing tenant ID to confirm, FK-safe cascading delete across all 46 tenant-scoped tables in a single transaction
- Backend: `server/routes/admin.js` — all endpoints under `/admin/*`, protected by `requireAdmin` middleware

### Offline Support

- Service worker (`public/sw.js`): network-first for HTML, cache-first for hashed assets, stale-while-revalidate for menu API
- IndexedDB via Dexie.js (`src/lib/offlineDb.ts`): menu cache, offline orders, cart persistence, employee cache
- `src/lib/menuCache.ts`: cache-first wrapper for all menu API calls
- `src/lib/offlineOrderQueue.ts`: offline cash order creation with `OFF-NNN` numbering
- `src/lib/syncEngine.ts`: syncs pending offline orders when connectivity returns
- `src/hooks/useNetworkStatus.ts`: online/offline detection with heartbeat
- `src/context/SyncContext.tsx`: app-wide sync state

### Database

46+ tables in Neon Postgres. All tenant-scoped tables have a `tenant_id` column with RLS policies. Key domains:
- **Core**: employees, menu (categories/items/modifiers/combos), orders (items/modifiers/payments), inventory
- **Delivery**: delivery_platforms, delivery_orders, delivery_markup_rules, virtual_brands, virtual_brand_items, delivery_recapture
- **AI**: ai_config, ai_suggestion_events, ai_hourly_snapshots, ai_item_pairs, ai_inventory_velocity, ai_suggestion_cache
- **Loyalty**: loyalty_customers, stamp_cards, stamp_events, loyalty_config, loyalty_messages, referral_events
- **Financial**: financial_targets, financial_actuals
- **Infrastructure**: printers, category_printer_routes, role_permissions, purchase_orders, purchase_order_items, vendors, vendor_items, order_templates
- **Audit**: audit_log (tenant_id, actor_type, actor_id, action, resource, resource_id, details JSONB, ip_address) — no RLS, written via `server/lib/auditLog.js` (fire-and-forget)
- **Platform**: tenants (id, name, subdomain, plan, stripe fields, branding_json, owner credentials)

Schema managed via SQL migrations in Neon. `schema_version` table tracks applied versions.

## Environment Variables

Copy `apps/pos/.env.example` to `apps/pos/.env`:
```
# Database (required)
DATABASE_URL=postgres://...             # Neon Postgres connection string
PG_APP_USER=app_user                    # RLS-enforced role for tenant queries
PG_APP_PASSWORD=...                     # Password for app_user role

# Payments (required)
STRIPE_SECRET_KEY=sk_test_...           # Stripe secret key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Stripe publishable key (browser)
PORT=3001                               # Optional (default: 3001)

# AI (optional — enables Grok-powered suggestions)
XAI_API_KEY=...                         # xAI API key (model: grok-4-1-fast-reasoning)

# Multi-tenancy
ADMIN_SECRET=...                        # Protects /admin/* API routes + super-admin dashboard
DEFAULT_TENANT_ID=                      # Optional fallback tenant for local dev
JWT_SECRET=...                          # JWT signing secret for owner auth

# Stripe Billing (optional — enables SaaS subscriptions)
# STRIPE_PRICE_STARTER=price_xxx
# STRIPE_PRICE_PRO=price_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx       # Webhook: https://pos.desktop.kitchen/api/billing/webhook
# APP_URL=https://pos.desktop.kitchen

# Twilio SMS (optional — enables loyalty + recapture SMS)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Email (optional — sends PIN emails on tenant creation)
RESEND_API_KEY=...                      # Resend API key for transactional email
```

## Key Patterns

- **API pattern**: Routes return JSON. Success: `res.json(data)`. Errors: `res.status(4xx).json({ error: 'message' })`.
- **Order flow**: Cart state in POSScreen → `POST /api/orders` (calculates tax, generates order_number) → payment via Stripe or cash → inventory deduction.
- **Order statuses**: `pending` → `confirmed` → `preparing` → `ready` → `completed` (or `cancelled`).
- **Payment statuses**: `unpaid` → `processing` → `paid` → `completed` (or `failed`/`refunded`).
- **Modifiers**: Modifier groups assigned to menu items. Orders store selected modifiers with price adjustments in `order_item_modifiers`.
- **Combos**: `combo_definitions` with `combo_slots` (each slot allows a category or specific item). Orders track combo items via `combo_instance_id` (UUID).
- **Delivery sources**: Orders have a `source` field (`pos`, `uber_eats`, `rappi`, `didi_food`) for channel tracking.
- **Tenant-scoped DB**: All `run/get/all/exec` calls in route files automatically use the resolved tenant's DB via `AsyncLocalStorage`. No explicit tenant ID passing needed.
- **Branding colors**: Use `brand-*` Tailwind classes (e.g., `bg-brand-600`, `text-brand-400`). Never use hardcoded colors — the brand palette defaults to teal (#0d9488) via CSS variable fallbacks.
- **Two auth systems**: Employee PIN login (`AuthContext`, `x-employee-id` header) for POS operations. Owner JWT (`ownerAuth.js`, `Authorization: Bearer` header) for tenant management/billing.
- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig.json and vite.config.ts).
