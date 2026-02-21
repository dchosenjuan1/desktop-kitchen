---
sidebar_position: 4
slug: /feature-guides/inventory-management
title: Inventory Management
---

# Inventory Management

Track ingredients, manage stock levels, handle purchase orders, and monitor vendor relationships.

## Inventory Items

### Adding Inventory Items
1. Go to **Inventory** > **Items**
2. Tap **Add Item**
3. Fill in:
   - **Name**: Ingredient name (e.g., "Corn Tortillas")
   - **Unit**: Measurement unit (kg, liters, pieces, etc.)
   - **Current stock**: Starting quantity
   - **Minimum stock**: Alert threshold
   - **Cost per unit**: Purchase cost for tracking

### Stock Alerts

When an item falls below its **minimum stock** level, it appears as a warning in the inventory dashboard. Managers receive notifications to reorder.

## Linking Ingredients to Menu Items

Connect inventory items to menu items so stock is automatically deducted when orders are placed:

1. Open a menu item
2. Go to the **Ingredients** tab
3. Add each ingredient with the quantity used per serving
4. When this item is ordered, ingredient stock decreases automatically

## Purchase Orders

### Creating a Purchase Order
1. Go to **Inventory** > **Purchase Orders**
2. Tap **New Order**
3. Select a **vendor**
4. Add items and quantities
5. Submit the order

### Receiving Stock
1. Open a pending purchase order
2. Enter the actual quantities received
3. Confirm receipt — stock levels update automatically

## Vendors

Manage your suppliers:
1. Go to **Inventory** > **Vendors**
2. Add vendors with contact information
3. Associate vendors with inventory items
4. Track purchase history per vendor

## AI-Powered Insights

The inventory system integrates with the [AI Intelligence Layer](./ai-features):
- **Velocity tracking**: Monitors how fast ingredients are consumed
- **Inventory-push suggestions**: Recommends promoting items that use ingredients nearing expiration
- **Shrinkage detection**: Flags unusual inventory discrepancies
- **Prep forecasting**: Predicts ingredient needs based on historical patterns
