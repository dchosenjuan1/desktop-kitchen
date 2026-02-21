---
sidebar_position: 6
slug: /feature-guides/delivery-intelligence
title: Delivery Intelligence
---

# Delivery Intelligence

Delivery Intelligence gives you visibility into per-platform profitability and tools to recapture delivery-only customers.

## P&L Analytics

### Per-Platform Breakdown

The delivery intelligence dashboard shows:
- **Revenue** per platform (Uber Eats, Rappi, DiDi Food)
- **Commission costs** per platform
- **Net profit** after commissions
- **POS vs Delivery** comparison — see what percentage of revenue comes from each channel

### Reading the Dashboard

| Metric | What it means |
|--------|---------------|
| Gross Revenue | Total delivery sales before commissions |
| Commission % | Platform's cut (varies by platform) |
| Net Revenue | What you actually receive |
| Avg Order Value | Average ticket size per platform |
| Order Volume | Number of orders per platform |

Use this data to decide which platforms are worth the commission and where markup rules need adjustment.

## Customer Recapture

Identify customers who only order through delivery platforms and bring them direct.

### How It Works

1. The system identifies customers who have **only** ordered via delivery (never in-person)
2. You can create **recapture campaigns** targeting these customers
3. Campaigns send SMS offers via Twilio (e.g., "10% off your next in-store visit")
4. Track conversion rates to measure campaign effectiveness

### Creating a Recapture Campaign

1. Go to **Delivery** > **Recapture**
2. Select the target audience (delivery-only customers)
3. Write your offer message
4. Set the discount or incentive
5. Launch the campaign

:::info SMS Requirements
Recapture campaigns require Twilio SMS configuration. Phone numbers are formatted to E.164 Mexican mobile format (+521...) automatically.
:::

## Best Practices

- Review P&L weekly to catch margin erosion early
- Adjust markup rules seasonally as platform commission rates change
- Run recapture campaigns monthly for best results
- Compare average order values across platforms — higher AOV platforms may be worth higher commissions
