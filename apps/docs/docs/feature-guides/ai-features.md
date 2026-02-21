---
sidebar_position: 8
slug: /feature-guides/ai-features
title: AI Features
---

# AI Features

The AI intelligence layer runs in the background, analyzing sales patterns and providing actionable suggestions.

## How It Works

A background scheduler runs **6 recurring jobs**:

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Suggestion cache refresh | Periodic | Pre-compute suggestions for fast retrieval |
| Hourly snapshots | Every hour | Capture sales metrics for trend analysis |
| Item pair tracking | Ongoing | Track which items are ordered together |
| Inventory velocity | Ongoing | Monitor ingredient consumption rates |
| Cache cleanup | Periodic | Remove stale suggestion data |
| Shrinkage detection | Periodic | Flag inventory discrepancies |

## Suggestion Types

### Upsell Suggestions

Based on the current cart contents, the AI suggests additional items the customer might want.

**How it works**: Item pair tracking identifies which items are frequently ordered together. When a customer adds a taco, the system might suggest adding guacamole or a drink.

### Inventory Push

When ingredients are approaching expiration or overstocked, the system suggests promoting menu items that use those ingredients.

**Example**: If avocados are overstocked, suggest featuring guacamole prominently or offering a discount.

### Combo Upgrade

When a customer's cart items could be replaced with a cheaper combo, the AI suggests the upgrade.

**Example**: Cart has a burger ($80), fries ($35), and soda ($25) = $140. A combo exists for $120. The AI suggests switching to the combo.

### Dynamic Pricing

Based on demand patterns, the system can suggest price adjustments:
- **Peak hours**: Slight price increases on high-demand items
- **Slow periods**: Discounts to drive traffic
- **Inventory-driven**: Discounts on items using overstocked ingredients

## Heuristic vs Grok AI

The system operates in two modes:

### Heuristic Mode (Always Active)
- Rule-based suggestions using sales data and inventory levels
- No external API calls
- Fast and reliable
- Covers all four suggestion types

### Grok AI Mode (Optional)
- Enhanced suggestions using the Grok API
- Requires `XAI_API_KEY` environment variable
- Provides more nuanced, natural-language suggestions
- Falls back to heuristic mode if the API is unavailable

## Configuration

1. Go to **Settings** > **AI Configuration**
2. Toggle suggestion types on/off
3. Set sensitivity thresholds (e.g., minimum confidence for upsell suggestions)
4. Configure dynamic pricing limits (maximum % increase/decrease)

:::tip
Start with heuristic mode to understand the suggestion patterns before enabling Grok AI. The heuristic suggestions are already highly effective for most restaurants.
:::
