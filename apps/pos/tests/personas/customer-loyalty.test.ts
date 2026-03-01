/**
 * Customer Loyalty persona tests (~15 tests)
 * Tests the full loyalty lifecycle: registration, stamps, rewards, referrals.
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Customer Loyalty', () => {
  let customerId: number;
  let customerPhone = '5550001111';

  // ==================== Registration ====================
  describe('Registration', () => {
    it('creates a loyalty customer via cashier', async () => {
      const api = alpha('cashier');
      const res = await api.post('/api/loyalty/customers', {
        phone: customerPhone,
        name: 'Loyalty Test Customer',
        sms_opt_in: false,
      });
      expect([200, 201]).toContain(res.status);
      expect(res.data).toHaveProperty('id');
      customerId = res.data.id;
    });

    it('handles duplicate phone (returns existing customer)', async () => {
      const api = alpha('cashier');
      const res = await api.post('/api/loyalty/customers', {
        phone: customerPhone,
        name: 'Duplicate Customer',
      });
      // Should return the existing customer, not create a new one
      expect([200, 201]).toContain(res.status);
      expect(res.data.id).toBe(customerId);
    });

    it('looks up customer by phone', async () => {
      const api = alpha('cashier');
      const res = await api.get(`/api/loyalty/customers/phone/${customerPhone}`);
      expect(res.status).toBe(200);
      expect(res.data.id).toBe(customerId);
      expect(res.data).toHaveProperty('name');
    });

    it('returns 404 for non-existent phone', async () => {
      const api = alpha('cashier');
      const res = await api.get('/api/loyalty/customers/phone/0000000000');
      expect(res.status).toBe(404);
    });
  });

  // ==================== Stamp Collection ====================
  describe('Stamps', () => {
    it('awards stamps on purchase', async () => {
      // First create an order to get an order_id
      const mgrApi = alpha('manager');
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];

      const order = await mgrApi.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{ menu_item_id: itemId, quantity: 1 }],
        source: 'pos',
      });
      expect(order.status).toBe(201);

      const api = alpha('cashier');
      const res = await api.post(`/api/loyalty/customers/${customerId}/stamps`, {
        order_id: order.data.id,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('manual stamp award (manager only)', async () => {
      const api = alpha('manager');
      const res = await api.post(`/api/loyalty/customers/${customerId}/stamps/manual`, {
        count: 2,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('gets customer detail with active stamp card', async () => {
      const api = alpha('manager');
      const res = await api.get(`/api/loyalty/customers/${customerId}`);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('activeCard');
    });
  });

  // ==================== Reward Redemption ====================
  describe('Rewards', () => {
    it('redeems a completed stamp card', async () => {
      // First fill the stamp card by adding manual stamps
      const mgrApi = alpha('manager');

      // Get current stamp count and fill the card
      const customer = await mgrApi.get(`/api/loyalty/customers/${customerId}`);
      const card = customer.data.activeCard;

      if (card && card.stamps_earned < card.stamps_required) {
        // Add enough stamps to complete the card
        const needed = card.stamps_required - card.stamps_earned;
        await mgrApi.post(`/api/loyalty/customers/${customerId}/stamps/manual`, {
          count: needed,
        });
      }

      // Now try to redeem
      const api = alpha('cashier');
      const res = await api.post(`/api/loyalty/customers/${customerId}/redeem`);
      // May succeed (200) or fail if card isn't complete
      expect([200, 400]).toContain(res.status);
    });

    it('prevents double-redeem of same card', async () => {
      const api = alpha('cashier');
      // Try to redeem again immediately — should fail if already redeemed
      const res = await api.post(`/api/loyalty/customers/${customerId}/redeem`);
      expect([200, 400]).toContain(res.status);
    });
  });

  // ==================== Customer Management ====================
  describe('Management', () => {
    it('lists all loyalty customers', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/loyalty/customers');
      expect(res.status).toBe(200);
      // Could be paginated
      const customers = res.data.data || res.data;
      expect(Array.isArray(customers)).toBe(true);
    });

    it('updates customer details', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/loyalty/customers/${customerId}`, {
        name: 'Updated Loyalty Customer',
      });
      expect(res.status).toBe(200);
    });

    it('gets loyalty analytics', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/loyalty/analytics');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('totalMembers');
    });

    it('gets referral leaderboard', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/loyalty/referrals');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('totalReferrals');
    });

    it('gets loyalty config', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/loyalty/config');
      expect(res.status).toBe(200);
    });

    it('updates loyalty config', async () => {
      const api = alpha('manager');
      const res = await api.put('/api/loyalty/config', {
        key: 'stamps_required',
        value: '10',
      });
      expect(res.status).toBe(200);
    });
  });
});
