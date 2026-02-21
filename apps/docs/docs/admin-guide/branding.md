---
sidebar_position: 2
slug: /admin-guide/branding
title: Branding Customization
---

# Branding Customization

White-label the POS with your restaurant's branding — colors, logo, and identity.

## How Branding Works

The branding system uses **CSS variables** to theme the entire application. Every color reference in the POS uses `brand-*` classes backed by CSS variables. When you set your brand color, the system generates a complete color palette (shades 50 through 900) from your single hex value.

## Setting Your Brand Color

1. Go to **Settings** > **Branding**
2. Pick your primary brand color using the color picker
3. Preview the color across the interface
4. Save

The system automatically generates:
- A full palette from shade 50 (lightest) to 900 (darkest)
- Appropriate contrast for text and buttons
- Dark mode variants

### Default Colors

If no custom branding is set, the POS defaults to a **teal** color scheme (Desktop Kitchen brand colors). Your customization completely replaces these defaults.

## What Gets Branded

- **Navigation bar** and header
- **Buttons** (primary, secondary states)
- **Accent colors** throughout the interface
- **Active states** and highlights
- **Charts and graphs** in reports

## Per-Tenant Branding

In a multi-tenant setup, each tenant has independent branding:
- Tenant A can be blue
- Tenant B can be green
- Each tenant's users only see their brand colors

Branding is stored in the tenant's record in the master database and loaded via the `BrandingContext` when the app initializes.

## Logo

Upload your restaurant's logo to replace the default:
1. Go to **Settings** > **Branding**
2. Upload your logo (recommended: SVG or PNG with transparent background)
3. The logo appears in the navbar and on receipts

## Tips

- Choose a color that has good contrast for readability
- Test your brand color in both light and dark modes
- Use your actual restaurant logo, not a placeholder
- Preview on a tablet — that's where most staff will see it
