---
sidebar_position: 1
slug: /getting-started/overview
title: Platform Overview
---

# Platform Overview

Desktop Kitchen is a multi-tenant POS platform built for independent quick-service restaurants (QSRs) and fast-casual operators. Whether you run a taco shop, a burger joint, a pizza place, or any counter-service concept, Desktop Kitchen combines point-of-sale operations, delivery management, inventory tracking, loyalty programs, and AI-powered intelligence in a single system.

## Key Concepts

### Tenants

Each restaurant (or restaurant group) operates as a **tenant** within a single shared Neon Postgres database, isolated by Row Level Security (RLS). Tenants get their own subdomain (e.g., `yourrestaurant.desktop.kitchen`), branding, menu, employees, and data — completely separated from other tenants at the database level.

Every tenant-scoped table contains a `tenant_id` column, and RLS policies ensure that queries from one tenant can never see another tenant's data.

### Brands (Virtual Brands)

A single kitchen can operate multiple **virtual brands** — different menu presentations for different delivery platforms. For example, your physical restaurant might also appear as a burger-only brand on Uber Eats and a wings brand on Rappi, all fulfilled from the same kitchen.

### Delivery Platforms

The system integrates with major delivery platforms:
- **Uber Eats**
- **Rappi**
- **DiDi Food**

Orders from these platforms flow into the same kitchen queue as in-house POS orders, with per-platform markup rules and P&L tracking.

### Employee Roles

Access is controlled through role-based permissions:

| Role | Access |
|------|--------|
| **Cashier** | POS screen, take orders, process payments |
| **Kitchen** | Kitchen display, order preparation |
| **Bar** | Bar display, drink preparation |
| **Manager** | All of above + reports, inventory, employee management |
| **Admin** | Full access including system configuration |

### Payments

- **Cash** payments with change calculation
- **Card** payments via Stripe (chip, tap, manual entry)
- **Split payments** (partial cash + card)

## Architecture at a Glance

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   POS App    │    │  Kitchen    │    │  Delivery   │
│  (Cashier)   │    │  Display    │    │  Platforms  │
└──────┬───────┘    └──────┬──────┘    └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Express   │
                    │   Backend   │
                    └──────┬──────┘
                           │
               ┌───────────┴───────────┐
               │    Neon Postgres      │
               │  (shared DB + RLS)    │
               ├───────────────────────┤
               │ adminSql (neondb_owner│
               │  — bypasses RLS)      │
               │ tenantSql (app_user   │
               │  — enforces RLS)      │
               └───────────────────────┘
```

:::info Two connection pools
The backend maintains two database pools. The **admin pool** (`neondb_owner`) bypasses RLS for authentication, super admin operations, and AI background jobs. The **tenant pool** (`app_user`) enforces RLS for all tenant-scoped API routes — the current tenant is set via `set_config('app.tenant_id', ...)` per connection.
:::

## What's Next?

- [System Requirements](./system-requirements) — what you need to get started
- [Onboarding Walkthrough](./onboarding) — register and set up your first restaurant
- [First Order Walkthrough](./first-order) — place your first order end-to-end
