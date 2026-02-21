---
sidebar_position: 1
slug: /getting-started/overview
title: Platform Overview
---

# Platform Overview

Desktop Kitchen is a multi-tenant restaurant POS platform built for Mexican restaurants. It combines point-of-sale operations, delivery management, inventory tracking, loyalty programs, and AI-powered intelligence in a single system.

## Key Concepts

### Tenants

Each restaurant (or restaurant group) operates as a **tenant** with its own isolated database. Tenants get their own subdomain (e.g., `yourrestaurant.desktop.kitchen`), branding, menu, employees, and data — completely separated from other tenants.

### Brands (Virtual Brands)

A single kitchen can operate multiple **virtual brands** — different menu presentations for different delivery platforms. For example, your physical restaurant might also appear as a burger-only brand on Uber Eats and a wings brand on Rappi, all fulfilled from the same kitchen.

### Delivery Platforms

The system integrates with major delivery platforms in Mexico:
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
- **Cryptocurrency** via NOWPayments (optional)

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
                    ┌──────┴──────┐
                    │   SQLite    │
                    │  (per tenant)│
                    └─────────────┘
```

## What's Next?

- [System Requirements](./system-requirements) — what you need to get started
- [Onboarding Walkthrough](./onboarding) — register and set up your first restaurant
- [First Order Walkthrough](./first-order) — place your first order end-to-end
