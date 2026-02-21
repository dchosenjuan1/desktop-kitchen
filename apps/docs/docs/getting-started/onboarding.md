---
sidebar_position: 3
slug: /getting-started/onboarding
title: Onboarding Walkthrough
---

# Onboarding Walkthrough

This guide walks you through setting up your restaurant on the Desktop Kitchen platform from scratch.

## Step 1: Register Your Restaurant

1. Visit the signup page and create your owner account
2. Choose your plan (Trial, Starter, or Pro)
3. Your tenant is created with a unique subdomain

## Step 2: Set Up Employees

Navigate to **Employee Management** and add your staff:

1. Tap **Add Employee**
2. Enter their name and assign a **4-digit PIN**
3. Select their **role** (Cashier, Kitchen, Bar, Manager, or Admin)
4. Save

:::tip Default Demo Employees
New tenants come seeded with demo employees for testing:
- **Manager** — PIN `1234`
- **Maria** (Cashier) — PIN `5678`
- **Carlos** (Kitchen) — PIN `9012`

Change or remove these before going live.
:::

## Step 3: Build Your Menu

### Create Categories

1. Go to **Menu Management** > **Categories**
2. Add categories like "Tacos", "Burritos", "Drinks", "Sides"
3. Set display order for each category

### Add Menu Items

1. Select a category and tap **Add Item**
2. Fill in: name, description, price (MXN), and optional image
3. Mark items as active/inactive as needed

### Set Up Modifiers (Optional)

Modifiers handle customizations like extra cheese, size options, or spice levels:

1. Go to **Modifiers** and create modifier groups (e.g., "Protein", "Extras", "Size")
2. Add options to each group with their price adjustments
3. Assign modifier groups to the relevant menu items

### Create Combos (Optional)

1. Go to **Combos** and tap **New Combo**
2. Define combo slots (e.g., "Main", "Side", "Drink")
3. Assign which categories or specific items can fill each slot
4. Set the combo price

## Step 4: Configure Payments

### Cash Payments
Cash payments work out of the box — no configuration needed.

### Card Payments (Stripe)
1. Go to **Settings** > **Payments**
2. Connect your Stripe account
3. Card payments are now enabled for all terminals

## Step 5: Set Up Printers (Optional)

1. Go to **Settings** > **Printers**
2. Add your receipt printer's network address
3. Print a test page to verify the connection
4. Assign printers to stations (POS, Kitchen, Bar)

## Step 6: Go Live

1. Review your menu one final time
2. Ensure all employees have their PINs
3. Do a test order end-to-end (see [First Order Walkthrough](./first-order))
4. Remove or update demo employee accounts
5. Start taking real orders!
