---
sidebar_position: 4
slug: /getting-started/first-order
title: First Order Walkthrough
---

# First Order Walkthrough

Follow this step-by-step guide to place your first order from start to finish.

## 1. Log In

1. Open the POS in your browser
2. Enter your employee PIN (e.g., `1234` for the demo Manager)
3. You'll land on the **POS Screen**

## 2. Build the Order

1. **Select a category** from the top tabs (e.g., "Tacos")
2. **Tap an item** to add it to the cart
3. If the item has **modifiers**, a popup will appear — select your options and confirm
4. Repeat for additional items
5. Adjust quantities using the **+/-** buttons in the cart

:::tip Quick Actions
- Tap an item in the cart to add a **note** (e.g., "no onions")
- Swipe left on a cart item to **remove** it
:::

## 3. Review the Cart

The cart shows:
- Each item with modifiers and notes
- Item subtotals
- **Subtotal** before tax
- **IVA (16%)** tax
- **Total** in MXN

## 4. Process Payment

1. Tap **Charge** to open the payment modal
2. Choose your payment method:

### Cash Payment
1. Select **Cash**
2. Enter the amount received
3. The system calculates change automatically
4. Tap **Complete Payment**

### Card Payment
1. Select **Card**
2. Stripe processes the payment
3. Wait for confirmation
4. Tap **Complete Payment**

### Split Payment
1. Select **Split**
2. Enter the cash portion
3. The remaining balance goes to card
4. Complete both transactions

## 5. Print Receipt (Optional)

After payment, the receipt modal appears:
- Tap **Print** to send to your receipt printer
- Tap **Done** to close

## 6. Kitchen View

1. The order automatically appears on the **Kitchen Display**
2. Kitchen staff sees the order with all items and modifiers
3. They mark items as **preparing** > **ready**
4. Order status updates: `pending` → `confirmed` → `preparing` → `ready` → `completed`

## Order Flow Summary

```
Customer orders → POS Screen → Payment → Kitchen Display → Ready → Completed
                                  │
                                  ├── Cash (instant)
                                  ├── Card (Stripe)
                                  └── Split (Cash + Card)
```

Congratulations — you've completed your first order! Head to [POS Operations](../feature-guides/pos-operations) for the full guide.
