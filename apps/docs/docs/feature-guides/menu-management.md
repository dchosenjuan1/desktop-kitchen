---
sidebar_position: 3
slug: /feature-guides/menu-management
title: Menu Management
---

# Menu Management

Manage your restaurant's categories, items, modifiers, combos, and virtual brands from the Menu Management screen.

## Categories

Categories organize your menu (e.g., Tacos, Burritos, Drinks, Desserts).

### Creating a Category
1. Go to **Menu** > **Categories**
2. Tap **Add Category**
3. Enter the category name
4. Set the display order (lower numbers appear first)
5. Save

### Managing Categories
- **Reorder**: Change the display order number
- **Hide**: Toggle active/inactive to temporarily hide from POS
- **Delete**: Remove empty categories (categories with items must be emptied first)

## Menu Items

### Creating an Item
1. Select a category
2. Tap **Add Item**
3. Fill in:
   - **Name**: Item display name
   - **Description**: Optional description
   - **Price**: Price in MXN
   - **Image**: Optional photo
   - **Active**: Toggle availability
4. Save

### Item Properties
- **Price**: Always in MXN, tax (16% IVA) calculated at checkout
- **Active/Inactive**: Inactive items don't appear on the POS or menu boards
- **Category**: Each item belongs to one category

## Modifiers

Modifiers handle item customizations — extras, sizes, protein choices, etc.

### Modifier Groups

A modifier group is a collection of options (e.g., "Protein" with Chicken, Beef, Pastor).

| Setting | Description |
|---------|-------------|
| **Name** | Group name displayed to cashier |
| **Required** | Must select at least one option |
| **Min/Max selections** | How many options can be chosen |

### Modifier Options

Each option within a group can have:
- **Name**: Option label (e.g., "Extra Cheese")
- **Price adjustment**: Additional cost (e.g., +$15.00 MXN) or discount

### Assigning to Items

1. Open a menu item
2. Go to the **Modifiers** tab
3. Attach one or more modifier groups
4. When this item is added to a cart, the cashier sees the modifier selection

## Combos

Combos bundle multiple items at a fixed price.

### Creating a Combo
1. Go to **Menu** > **Combos**
2. Tap **New Combo**
3. Set combo name and price
4. Define **slots** (e.g., "Main", "Side", "Drink")
5. For each slot, choose which categories or specific items are allowed
6. Save

### How Combos Work in the POS
1. Cashier taps a combo on the menu
2. A modal guides them through each slot selection
3. The combo appears in the cart as a single line item at the combo price
4. Each component is tracked for kitchen prep

## Virtual Brands

Virtual brands let you present different menus on different delivery platforms from the same kitchen.

See [Multi-Brand Setup](../admin-guide/multi-brand) for configuration details.
