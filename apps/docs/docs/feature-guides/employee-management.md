---
sidebar_position: 10
slug: /feature-guides/employee-management
title: Employee Management
---

# Employee Management

Manage staff accounts, PINs, roles, and permissions.

## Adding Employees

1. Go to **Employees** > **Add Employee**
2. Enter:
   - **Name**: Employee's display name
   - **PIN**: Unique 4-digit login PIN
   - **Role**: Access level (see below)
3. Save

## Roles & Permissions

| Role | POS | Kitchen | Bar | Reports | Inventory | Employees | Settings |
|------|-----|---------|-----|---------|-----------|-----------|----------|
| Cashier | Yes | - | - | - | - | - | - |
| Kitchen | - | Yes | - | - | - | - | - |
| Bar | - | - | Yes | - | - | - | - |
| Manager | Yes | Yes | Yes | Yes | Yes | Yes | - |
| Admin | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

### Role Details

- **Cashier**: Access to POS screen only. Can take orders and process payments.
- **Kitchen**: Access to kitchen display. Can view and update food order status.
- **Bar**: Access to bar display. Can view and update drink order status.
- **Manager**: Full operational access including reports, inventory, and employee management.
- **Admin**: Everything a Manager can do, plus system configuration and settings.

## PIN Management

- Each employee has a unique 4-digit PIN
- PINs are used to log in at any POS terminal
- Managers can reset PINs from the employee management screen
- PINs should be changed periodically for security

:::caution
Remove or change default demo PINs (1234, 5678, 9012) before going live with real customers.
:::

## Best Practices

- Create individual accounts for each staff member (don't share PINs)
- Use the most restrictive role that covers each employee's needs
- Review employee list regularly and deactivate former staff
- Managers should have their own PINs — don't share the Manager PIN
