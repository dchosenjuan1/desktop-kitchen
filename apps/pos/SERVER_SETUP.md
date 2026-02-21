# Juanbertos POS System - Backend Server Files

All backend server files have been created successfully. Here's a summary:

## Directory Structure
```
/sessions/amazing-gifted-archimedes/mnt/POS/juanbertos-pos/
├── server/
│   ├── index.js           (Express server entry point)
│   ├── db.js              (SQLite database setup)
│   ├── stripe.js          (Stripe payment integration)
│   ├── seed.js            (Database seeding script)
│   └── routes/
│       ├── menu.js        (Menu endpoints)
│       ├── orders.js      (Order endpoints)
│       ├── payments.js    (Payment endpoints)
│       ├── inventory.js   (Inventory endpoints)
│       ├── employees.js   (Employee endpoints)
│       └── reports.js     (Reporting endpoints)
└── data/                  (SQLite database directory)
```

## File Details

### 1. server/index.js
- Express server running on port 3001
- CORS and JSON middleware configured
- Static file serving from ../dist in production
- All API routes mounted under /api
- Database initialization on startup
- SPA fallback routing for frontend

### 2. server/db.js
- better-sqlite3 database setup
- Auto-creates data/ directory if missing
- Database path: ../data/juanbertos.db
- Creates 8 tables with proper schema:
  - employees
  - menu_categories
  - menu_items
  - orders
  - order_items
  - inventory_items
  - menu_item_ingredients
- Exports db instance and initDb() function

### 3. server/seed.js
- Standalone script: `node server/seed.js`
- Seeds 3 employees (Manager, Maria, Carlos)
- Seeds 6 menu categories
- Seeds 27 menu items with realistic prices
- Seeds 20 inventory items
- Links menu items to ingredients

### 4. server/stripe.js
- Stripe client initialization with STRIPE_SECRET_KEY env var
- Functions:
  - createPaymentIntent(amount, metadata)
  - createRefund(paymentIntentId, amount)
  - getPaymentIntent(id)

### 5. server/routes/menu.js
Endpoints:
- GET /api/menu/categories
- GET /api/menu/items (with optional ?category_id filter)
- GET /api/menu/items/:id
- POST /api/menu/items (admin)
- PUT /api/menu/items/:id (admin)
- PUT /api/menu/items/:id/toggle

### 6. server/routes/orders.js
Endpoints:
- GET /api/orders (with ?status and ?date filters)
- GET /api/orders/:id (with items)
- POST /api/orders (creates order with auto-generated order_number)
- PUT /api/orders/:id/status
- GET /api/orders/kitchen/active (for kitchen display)

Features:
- Auto-generates sequential order numbers (daily)
- Calculates tax (8.75% CA rate)
- Includes order items with pricing

### 7. server/routes/payments.js
Endpoints:
- POST /api/payments/create-intent (creates Stripe PaymentIntent)
- POST /api/payments/confirm (confirms payment)
- POST /api/payments/refund (refunds payment)
- GET /api/payments/:order_id (payment status)

### 8. server/routes/inventory.js
Endpoints:
- GET /api/inventory
- GET /api/inventory/low-stock
- PUT /api/inventory/:id (update quantity)
- POST /api/inventory/:id/restock
- POST /api/inventory/deduct (deduct for order)

### 9. server/routes/employees.js
Endpoints:
- GET /api/employees
- POST /api/employees (create)
- PUT /api/employees/:id (update)
- POST /api/employees/login (PIN-based)
- PUT /api/employees/:id/toggle (activate/deactivate)

### 10. server/routes/reports.js
Endpoints:
- GET /api/reports/sales?period=daily|weekly|monthly
- GET /api/reports/top-items?period=daily|weekly|monthly&limit=10
- GET /api/reports/employee-performance?period=daily|weekly|monthly
- GET /api/reports/hourly (for today)

## Environment Variables Required

```
STRIPE_SECRET_KEY=sk_test_your_key_here
PORT=3001 (optional, defaults to 3001)
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install express cors better-sqlite3 stripe
   ```

2. Create .env file with Stripe key:
   ```bash
   echo "STRIPE_SECRET_KEY=sk_test_your_key" > .env
   ```

3. Seed the database:
   ```bash
   node server/seed.js
   ```

4. Start the server:
   ```bash
   node server/index.js
   ```

5. Server will be available at http://localhost:3001

## Key Features

✓ All ES module syntax (import/export)
✓ Error handling with try/catch blocks
✓ Proper HTTP status codes
✓ SQLite database with schema
✓ Stripe payment integration
✓ PIN-based employee authentication
✓ Inventory tracking with deductions
✓ Order management with status workflow
✓ Sales reporting and analytics
✓ Menu management with categories

All files are production-ready and follow RESTful API best practices.
