---
sidebar_position: 4
slug: /admin-guide/api-overview
title: API Overview
---

# API Overview

The Desktop Kitchen POS exposes a REST API for all operations. This overview covers the API structure for developers and integrations.

## Base URL

```
https://pos.desktop.kitchen/api
```

For tenant-specific access, include the `X-Tenant-ID` header or use the tenant's subdomain.

## Authentication

The API uses two authentication systems:

### Employee PIN Auth
For POS operations (orders, payments, menu queries):
- Header: `x-employee-id: <employee_id>`
- Used by the POS frontend

### Owner JWT Auth
For tenant management and billing:
- Header: `Authorization: Bearer <jwt_token>`
- Obtain tokens via `POST /api/auth/login`

## API Routes

### Menu
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/menu/categories` | List all categories |
| `GET` | `/api/menu/items` | List all menu items |
| `POST` | `/api/menu/items` | Create a menu item |
| `PUT` | `/api/menu/items/:id` | Update a menu item |
| `DELETE` | `/api/menu/items/:id` | Delete a menu item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/orders` | List orders |
| `POST` | `/api/orders` | Create an order |
| `PUT` | `/api/orders/:id/status` | Update order status |
| `GET` | `/api/orders/:id` | Get order details |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/payments/create-intent` | Create Stripe PaymentIntent |
| `POST` | `/api/payments/refund` | Refund a payment |

### Inventory
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/inventory` | List inventory items |
| `POST` | `/api/inventory` | Add inventory item |
| `PUT` | `/api/inventory/:id` | Update stock |

### Employees
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/employees` | List employees |
| `POST` | `/api/employees` | Create employee |
| `POST` | `/api/employees/login` | PIN login |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports/sales` | Sales summary |
| `GET` | `/api/reports/items` | Item performance |

### Delivery
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/delivery/platforms` | List platforms |
| `GET` | `/api/delivery/markup-rules` | List markup rules |
| `GET` | `/api/delivery-intelligence/pnl` | P&L analytics |

### Loyalty
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/loyalty/customers` | List customers |
| `GET` | `/api/loyalty/config` | Loyalty configuration |

### Branding
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/branding` | Get tenant branding |
| `PUT` | `/api/branding` | Update branding |

## Response Format

All endpoints return JSON:

```json
// Success
{
  "id": 1,
  "name": "Taco al Pastor",
  "price": 45.00
}

// Error
{
  "error": "Item not found"
}
```

## Multi-Tenancy

Tenant resolution happens automatically via:
1. `X-Tenant-ID` header (highest priority)
2. Subdomain (e.g., `yourrestaurant.desktop.kitchen`)
3. `DEFAULT_TENANT_ID` environment variable
4. Default database fallback

## Tax

All prices are in **MXN**. Tax (16% IVA) is calculated at order creation, not stored on items.

:::note
Full API reference documentation with request/response schemas will be available in a future update. This overview covers the primary endpoints.
:::
