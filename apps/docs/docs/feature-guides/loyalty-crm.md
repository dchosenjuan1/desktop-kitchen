---
sidebar_position: 7
slug: /feature-guides/loyalty-crm
title: Loyalty & CRM
---

# Loyalty & CRM

Build customer relationships with stamp cards, SMS messaging, and referral programs.

## Loyalty Program Overview

The loyalty system tracks customers, their purchases, and rewards them for repeat visits.

### Customer Registration

Customers are created when:
1. A cashier enters their phone number at checkout
2. They opt in to SMS communications
3. The system creates or finds the customer record

Phone numbers are automatically formatted to **E.164 Mexican mobile format** (`+521XXXXXXXXXX`).

## Stamp Cards

Digital stamp cards replace physical punch cards.

### Configuration

1. Go to **Loyalty** > **Configuration**
2. Set:
   - **Stamps required**: How many purchases for a reward (e.g., 10)
   - **Reward**: What they get (e.g., free item, discount)
   - **Qualifying amount**: Minimum order value to earn a stamp

### How It Works

1. Customer makes a qualifying purchase
2. A **stamp event** is recorded on their card
3. When stamps reach the target, the reward unlocks
4. Cashier applies the reward on the next visit
5. A new stamp card starts automatically

## SMS Messaging

Send targeted messages to loyalty customers via Twilio.

### Message Types

- **Welcome message**: Sent when a customer first joins
- **Stamp updates**: "You earned a stamp! 3 more to go"
- **Reward notifications**: "Your free taco is ready to claim!"
- **Recapture offers**: Target delivery-only customers (see [Delivery Intelligence](./delivery-intelligence))
- **Custom campaigns**: Promotional messages

### SMS Configuration

Requires Twilio credentials in your environment:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

:::note
SMS opt-in is tracked per customer. Only customers who have opted in receive messages. The `sms_opt_in` flag is set during customer creation.
:::

## Referral Program

Encourage customers to bring friends:

1. Each loyalty customer gets a unique referral code
2. When a new customer signs up with a referral code, both earn bonus stamps
3. Track referral chains in the loyalty dashboard

## CRM Dashboard

The loyalty dashboard shows:
- **Total customers**: Active loyalty members
- **Active stamp cards**: Cards in progress
- **Rewards redeemed**: Total rewards claimed
- **Top customers**: Highest visit frequency and spend
- **SMS campaign performance**: Delivery rates and engagement
