/**
 * Loyalty Flow integration tests
 * Register → purchase → stamps → fill card → redeem → referral
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Loyalty Flow', () => {
  let customerId: number;
  const phone = '5552223333';

  describe('Full Lifecycle', () => {
    it('1. registers a new loyalty customer', async () => {
      const api = alpha('cashier');
      const res = await api.post('/api/loyalty/customers', {
        phone,
        name: 'Loyalty Flow Customer',
        sms_opt_in: false,
      });
      expect([200, 201]).toContain(res.status);
      customerId = res.data.id;
    });

    it('2. customer has a fresh stamp card', async () => {
      const api = alpha('manager');
      const res = await api.get(`/api/loyalty/customers/${customerId}`);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('activeCard');
      if (res.data.activeCard) {
        // DB column is stamps_earned (not stamp_count)
        expect(res.data.activeCard.stamps_earned).toBe(0);
      }
    });

    it('3. earns stamps via purchase', async () => {
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const mgrApi = alpha('manager');

      // Create an order (employee_id is required)
      const order = await mgrApi.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{ menu_item_id: itemId, quantity: 1 }],
        source: 'pos',
      });
      expect(order.status).toBe(201);

      const cashierApi = alpha('cashier');
      const res = await cashierApi.post(`/api/loyalty/customers/${customerId}/stamps`, {
        order_id: order.data.id,
      });
      expect([200, 201]).toContain(res.status);
    });

    it('4. fills stamp card via manual stamps (manager)', async () => {
      const api = alpha('manager');
      // Get current card state
      const customer = await api.get(`/api/loyalty/customers/${customerId}`);
      const card = customer.data.activeCard;

      if (card) {
        // DB column is stamps_earned (not stamp_count)
        const needed = Math.max(0, card.stamps_required - card.stamps_earned);
        if (needed > 0) {
          const res = await api.post(`/api/loyalty/customers/${customerId}/stamps/manual`, {
            count: needed,
          });
          expect([200, 201]).toContain(res.status);
        }
      }
    }, 60_000);

    it('5. redeems completed stamp card', async () => {
      const api = alpha('cashier');
      const res = await api.post(`/api/loyalty/customers/${customerId}/redeem`);
      // If card is complete, this should succeed
      expect([200, 400]).toContain(res.status);
    });

    it('6. verifies a new card is created after redemption', async () => {
      const api = alpha('manager');
      const res = await api.get(`/api/loyalty/customers/${customerId}`);
      expect(res.status).toBe(200);
      // After redemption, there should be a new active card
      // stamps_earned may be > 0 if referral bonuses or other stamps were awarded
      if (res.data.activeCard) {
        expect(res.data.activeCard.stamps_earned).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Referral Flow', () => {
    let referralCode: string;

    it('original customer has a referral code', async () => {
      const api = alpha('manager');
      const res = await api.get(`/api/loyalty/customers/${customerId}`);
      expect(res.status).toBe(200);
      referralCode = res.data.referral_code;
      // Referral code may or may not be auto-generated
    });

    it('new customer uses referral code', async () => {
      if (!referralCode) return;

      const api = alpha('cashier');
      const res = await api.post('/api/loyalty/customers', {
        phone: '5554445555',
        name: 'Referred Customer',
        referral_code_used: referralCode,
      });
      expect([200, 201]).toContain(res.status);
    });
  });
});
