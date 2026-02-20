# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start both client (Vite :5173) and server (Express :3001) concurrently
npm run dev:client       # Vite dev server only
npm run dev:server       # Express backend only
npm run build            # Production build (outputs to /dist)
npm run start            # Production mode (NODE_ENV=production, serves /dist)
npm run seed             # Seed database with demo data (employees, menu, inventory)
```

No test runner is configured.

## Architecture

Full-stack multi-tenant POS system for Mexican restaurants. React + TypeScript frontend, Express.js backend, better-sqlite3 (native C++ SQLite) database with WAL mode.

**Frontend** (Vite on :5173) proxies `/api` requests to the **backend** (Express on :3001). In production, Express serves the built frontend from `/dist` with SPA fallback routing.

### Frontend (`src/`)

- **React 18 + TypeScript + Tailwind CSS + Vite**
- Routing: `react-router-dom` v6 in `App.tsx`
- Auth: `AuthContext` (PIN-based employee login, role-based route protection via `ProtectedRoute`)
- Roles: `cashier`, `kitchen`, `bar`, `manager`, `admin` — each role gates access to specific routes
- API client: `src/api/index.ts` — all fetch calls to `/api/*`, typed responses, Capacitor-aware base URL
- Types: `src/types/index.ts` — all shared interfaces (55+ types)
- Charts: `recharts` for reports; Icons: `lucide-react`
- State: React Context + local component state (no Redux/Zustand)
- Screens are in `src/screens/` (18 screens), reusable components in `src/components/`
- Offline support: IndexedDB via Dexie.js for menu caching, offline orders, cart persistence
- Branding: CSS variable theming via `BrandingContext` — all colors use `brand-*` Tailwind classes backed by `var(--brand-N, #fallback)`

### Backend (`server/`)

- **Express.js with ES modules** (`"type": "module"` in package.json)
- Entry: `server/index.js` — mounts all route files under `/api/*`
- Database: `server/db.js` — better-sqlite3 with WAL mode, FK enforcement, helpers (`run`, `get`, `all`, `exec`)
- Multi-tenancy: `AsyncLocalStorage` in `server/db.js` — `getDb()` auto-resolves to tenant DB per request, zero changes needed in route files
- Tenant registry: `server/tenants.js` — master DB at `data/master.db`, tenant DBs at `data/tenants/{id}.db`
- Tenant middleware: `server/middleware/tenant.js` — resolves via X-Tenant-ID header → subdomain → DEFAULT_TENANT_ID env → default DB
- Owner auth: `server/middleware/ownerAuth.js` — JWT validation for tenant owners (separate from employee PIN auth)
- Routes: 18 files in `server/routes/` (menu, orders, payments, inventory, employees, reports, modifiers, combos, printers, delivery, delivery-intelligence, ai, auth, admin, branding, billing, loyalty, order-templates)
- Payments: Stripe integration (PaymentIntents, refunds, split payments, subscriptions, billing portal, webhooks)
- Tax rate: 16% IVA (Mexican tax, hardcoded in order creation)
- Currency: MXN

### Multi-Tenancy

- One SQLite file per tenant at `data/tenants/{tenant_id}.db`
- Master registry at `data/master.db` (tenants table with billing, branding, auth fields)
- `AsyncLocalStorage` makes multi-tenancy transparent — all existing route files use `run/get/all/exec` from `db.js` which auto-resolves to the correct tenant DB
- `applySchema(database)` extracted and reused for both default DB and new tenant initialization
- Tenant resolution order: `X-Tenant-ID` header → subdomain → `DEFAULT_TENANT_ID` env → default DB (backward compatible)
- Auth routes (`/api/auth/*`) and admin routes (`/admin/*`) are mounted BEFORE tenant middleware (they use master DB)
- AI scheduled jobs run outside request context and use the default DB

### Branding System

- `src/lib/colorUtils.ts` — generates full Tailwind palette (50–900) from a single hex color
- `src/context/BrandingContext.tsx` — fetches tenant branding from `GET /api/branding`, applies CSS variables to `:root`
- `tailwind.config.js` — brand colors defined as `var(--brand-N, #fallback)` with red defaults
- All 427 color references use `brand-*` classes (zero `red-*` in codebase) — default is red, zero visual change for Juanbertos

### Stripe Billing

- `server/routes/billing.js` — checkout sessions, customer portal, webhook handler
- Webhook mounted BEFORE `express.json()` for raw body signature verification
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Tenant fields: `plan` (trial/starter/pro), `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`

### Delivery Intelligence (`server/routes/delivery-intelligence.js`)

- P&L analytics: per-platform revenue, commissions, net profit, POS vs delivery comparison
- Markup rules: per-platform price adjustments by item or category (percent or fixed)
- Virtual brands: different menu presentations per delivery platform from the same kitchen
- Customer recapture: identify delivery-only customers, send SMS offers via Twilio

### AI Intelligence Layer (`server/ai/`)

Background scheduler runs 6 jobs (suggestion cache refresh, hourly snapshots, item pair tracking, inventory velocity, cache cleanup, shrinkage detection). Heuristic-based suggestions always active; Grok API integration optional (requires `XAI_API_KEY`). Suggestion types: upsell, inventory-push, combo-upgrade, dynamic-pricing.

### Offline Support

- Service worker (`public/sw.js`): network-first for HTML, cache-first for hashed assets, stale-while-revalidate for menu API
- IndexedDB via Dexie.js (`src/lib/offlineDb.ts`): menu cache, offline orders, cart persistence, employee cache
- `src/lib/menuCache.ts`: cache-first wrapper for all menu API calls
- `src/lib/offlineOrderQueue.ts`: offline cash order creation with `OFF-NNN` numbering
- `src/lib/syncEngine.ts`: syncs pending offline orders when connectivity returns
- `src/hooks/useNetworkStatus.ts`: online/offline detection with heartbeat
- `src/context/SyncContext.tsx`: app-wide sync state

### Database

35+ tables in better-sqlite3. Schema defined inline in `server/db.js` `applySchema()` using `CREATE TABLE IF NOT EXISTS` + `alterSafe()` for migrations. Key domains:
- **Core**: employees, menu (categories/items/modifiers/combos), orders (items/modifiers/payments), inventory
- **Delivery**: delivery_platforms, delivery_orders, delivery_markup_rules, virtual_brands, virtual_brand_items, delivery_recapture
- **AI**: ai_config, ai_suggestion_events, ai_hourly_snapshots, ai_item_pairs, ai_inventory_velocity, ai_suggestion_cache
- **Loyalty**: loyalty_customers, loyalty_stamp_cards, loyalty_stamps, loyalty_config, loyalty_messages
- **Infrastructure**: printers, role_permissions, purchase_orders, purchase_order_items, vendors
- **Master DB** (separate file): tenants (id, name, subdomain, plan, stripe fields, branding_json, owner credentials)

No migrations system — schema changes go directly in `applySchema()` in `db.js`.

## Environment Variables

Copy `.env.example` to `.env`:
```
STRIPE_SECRET_KEY=sk_test_...           # Required for payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Required for browser Stripe
PORT=3001                               # Optional (default: 3001)
XAI_API_KEY=...                         # Optional (enables Grok AI suggestions)

# Multi-tenancy
ADMIN_SECRET=...                        # Protects /admin/* API routes
DEFAULT_TENANT_ID=                      # Optional fallback tenant for local dev
JWT_SECRET=...                          # JWT signing secret for owner auth

# Stripe Billing (optional — enables SaaS subscriptions)
# STRIPE_PRICE_STARTER=price_xxx
# STRIPE_PRICE_PRO=price_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx
# APP_URL=https://pos.juanbertos.com

# Twilio SMS (optional — enables loyalty + recapture SMS)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
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
- **Branding colors**: Use `brand-*` Tailwind classes (e.g., `bg-brand-600`, `text-brand-400`). Never use `red-*` — the brand palette defaults to red via CSS variable fallbacks.
- **Two auth systems**: Employee PIN login (`AuthContext`, `x-employee-id` header) for POS operations. Owner JWT (`ownerAuth.js`, `Authorization: Bearer` header) for tenant management/billing.
- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig.json and vite.config.ts).
