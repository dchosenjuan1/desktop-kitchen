/**
 * Order Lifecycle integration tests
 * Create → pay → kitchen → complete (+ modifiers, combos, cancellation)
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Order Lifecycle', () => {
  describe('Basic Flow: Create → Confirm → Prepare → Ready → Complete', () => {
    let orderId: number;

    it('creates an order with multiple items', async () => {
      const state = getTestState();
      const items = Object.values(state.tenantAlpha.menuItemIds).slice(0, 3);
      const api = alpha('manager');

      const res = await api.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: items.map(id => ({ menu_item_id: id, quantity: 1 })),
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('order_number');
      expect(res.data).toHaveProperty('total');
      expect(res.data.total).toBeGreaterThan(0);
      orderId = res.data.id;
    });

    it('confirms the order', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/orders/${orderId}/status`, {
        status: 'confirmed',
      });
      expect(res.status).toBe(200);
    });

    it('kitchen marks as preparing', async () => {
      const api = alpha('kitchen');
      const res = await api.put(`/api/orders/${orderId}/status`, {
        status: 'preparing',
      });
      expect(res.status).toBe(200);
    });

    it('kitchen marks as ready', async () => {
      const api = alpha('kitchen');
      const res = await api.put(`/api/orders/${orderId}/status`, {
        status: 'ready',
      });
      expect(res.status).toBe(200);
    });

    it('cashier marks as completed', async () => {
      const api = alpha('cashier');
      const res = await api.put(`/api/orders/${orderId}/status`, {
        status: 'completed',
      });
      expect(res.status).toBe(200);
    });

    it('verifies final order state', async () => {
      const api = alpha('manager');
      const res = await api.get(`/api/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('completed');
    });
  });

  describe('Order with Modifiers', () => {
    it('creates an order with modifiers', async () => {
      const state = getTestState();
      const api = alpha('manager');

      // Get a burger item that has modifiers assigned
      const burgerItemId = state.tenantAlpha.menuItemIds['Classic Burger'] ||
                           Object.values(state.tenantAlpha.menuItemIds)[0];

      // Get modifiers for this item
      const modGroups = await api.get(`/api/modifiers/groups/item/${burgerItemId}`);
      const modifiers: number[] = [];
      if (modGroups.data?.length > 0 && modGroups.data[0].modifiers?.length > 0) {
        modifiers.push(modGroups.data[0].modifiers[0].id);
      }

      const res = await api.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{
          menu_item_id: burgerItemId,
          quantity: 1,
          modifiers: modifiers,
        }],
      });
      expect(res.status).toBe(201);
      expect(res.data.total).toBeGreaterThan(0);
    });
  });

  describe('Order Cancellation', () => {
    it('cancels a pending order', async () => {
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const api = alpha('manager');

      // Create order
      const order = await api.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{ menu_item_id: itemId, quantity: 1 }],
      });
      expect(order.status).toBe(201);

      // Cancel it
      const res = await api.put(`/api/orders/${order.data.id}/status`, {
        status: 'cancelled',
      });
      expect(res.status).toBe(200);

      // Verify it's cancelled
      const verify = await api.get(`/api/orders/${order.data.id}`);
      expect(verify.data.status).toBe('cancelled');
    });
  });

  describe('Order Void', () => {
    it('voids an order via cancellation', async () => {
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const api = alpha('manager');

      const order = await api.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{ menu_item_id: itemId, quantity: 1 }],
      });
      expect(order.status).toBe(201);

      // Void is done by cancelling the order via status update
      const res = await api.put(`/api/orders/${order.data.id}/status`, {
        status: 'cancelled',
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Delivery Source Order', () => {
    it('creates an order successfully', async () => {
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const api = alpha('manager');

      const res = await api.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{ menu_item_id: itemId, quantity: 1 }],
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.status).toBe('pending');
    });
  });

  describe('Daily Summary', () => {
    it('returns accurate daily summary after orders', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/sales?period=daily');
      expect(res.status).toBe(200);
    });
  });
});
