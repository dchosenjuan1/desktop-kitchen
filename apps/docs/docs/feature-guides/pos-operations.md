---
sidebar_position: 1
slug: /feature-guides/pos-operations
title: POS Operations
---

# POS Operations

The POS screen is the primary interface for taking orders and processing payments.

## Taking Orders

### Browsing the Menu

The POS screen displays menu categories as tabs along the top. Tap a category to see its items. Each item shows its name, price, and availability status.

### Adding Items to Cart

- **Tap an item** to add one to the cart
- If the item has **modifier groups**, a modal appears for customization
- **Quantity controls** (+/-) in the cart adjust amounts
- **Notes**: Tap a cart item to add special instructions (e.g., "extra spicy", "no cilantro")

### Modifiers

When an item has attached modifier groups:

1. Required groups must have a selection before continuing
2. Optional groups can be skipped
3. Each modifier option can have a **price adjustment** (positive or negative)
4. Multiple selections may be allowed depending on the group config

### Combos

Combo items appear in the menu alongside regular items:

1. Tap a combo to start building it
2. Fill each **slot** (e.g., choose a main, a side, a drink)
3. Each slot restricts choices to specific categories or items
4. The combo has a fixed price regardless of individual item prices

## Payments

### Cash

1. Tap **Charge**
2. Select **Cash**
3. Enter amount tendered
4. System shows change due
5. Complete the transaction

### Card (Stripe)

1. Tap **Charge**
2. Select **Card**
3. Stripe processes the PaymentIntent
4. Await confirmation
5. Transaction is recorded

### Split Payments

1. Tap **Charge**
2. Select **Split**
3. Enter the cash portion
4. Remaining amount is charged to card
5. Both transactions are recorded against the order

## Order Management

### Order Statuses

| Status | Meaning |
|--------|---------|
| `pending` | Order created, not yet confirmed |
| `confirmed` | Payment received, sent to kitchen |
| `preparing` | Kitchen is working on it |
| `ready` | Ready for pickup/serving |
| `completed` | Delivered to customer |
| `cancelled` | Order cancelled |

### Refunds

Managers can issue refunds on completed card orders:
1. Find the order in the **Orders** list
2. Tap **Refund**
3. Refund is processed through Stripe
4. Order status updates to `refunded`

## Offline Mode

The POS continues to work when internet is unavailable:

- Menu data is cached locally via IndexedDB
- **Cash orders** can be created offline with `OFF-NNN` numbering
- Orders queue locally and **sync automatically** when connectivity returns
- Card payments require an internet connection

:::caution
Offline orders are cash-only. Card payments cannot be processed without an internet connection.
:::
