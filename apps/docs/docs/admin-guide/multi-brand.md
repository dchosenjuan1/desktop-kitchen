---
sidebar_position: 3
slug: /admin-guide/multi-brand
title: Multi-Brand Setup
---

# Multi-Brand Setup

Operate multiple virtual brands from a single kitchen, each with its own menu presentation on delivery platforms.

## What Are Virtual Brands?

A virtual brand is a separate "restaurant" identity that shares your physical kitchen. For example:

- **Desktop Kitchen** (your main brand) — full menu on all platforms
- **Wing Factory** — wings-only menu on Uber Eats
- **Burrito Express** — burritos and bowls on Rappi

All orders from all brands come into the **same kitchen queue**, but each brand has its own name, menu selection, and pricing on delivery platforms.

## Creating a Virtual Brand

1. Go to **Delivery** > **Virtual Brands**
2. Tap **New Brand**
3. Configure:
   - **Brand name**: The name customers see on delivery platforms
   - **Description**: Brand description for platform listings
4. Save

## Assigning Menu Items

1. Open a virtual brand
2. Go to the **Menu** tab
3. Select which items from your main menu appear under this brand
4. Optionally set brand-specific prices (different from your main menu)
5. Save

### Item Selection Strategy

| Strategy | Example |
|----------|---------|
| **Category focus** | Wings brand only shows items from "Wings" and "Sides" categories |
| **Best sellers** | Brand features only your top 10 items for a focused menu |
| **Price tier** | Premium brand with higher-end items at premium prices |
| **Cuisine type** | Separate brands for tacos, burgers, and bowls |

## Platform Assignment

1. Open a virtual brand
2. Go to the **Platforms** tab
3. Select which delivery platforms this brand appears on
4. Each platform can have different brands assigned

### Example Setup

| Platform | Brands |
|----------|--------|
| Uber Eats | Desktop Kitchen, Wing Factory |
| Rappi | Desktop Kitchen, Burrito Express |
| DiDi Food | Desktop Kitchen |

## Markup Rules Per Brand

Each virtual brand can have its own markup rules:
- Higher markups on premium brands
- Lower markups on value brands to drive volume
- Platform-specific markups (see [Delivery Setup](../feature-guides/delivery-setup))

## Kitchen View

From the kitchen's perspective, nothing changes:
- All orders appear in the same queue
- Each order shows its **brand** and **platform** source
- Prep is identical regardless of which brand the customer ordered from

## Analytics

Track performance per brand in [Delivery Intelligence](../feature-guides/delivery-intelligence):
- Revenue per brand
- Order volume per brand
- Which brands perform best on which platforms
- Commission impact per brand/platform combination

## Best Practices

- Start with 1-2 virtual brands and expand based on performance
- Choose brand names that clearly communicate the cuisine type
- Keep virtual brand menus focused (10-15 items max) — too many items dilute the brand identity
- Use different pricing strategies per brand to test what works
- Monitor which brands cannibalize your main brand vs bring net-new customers
