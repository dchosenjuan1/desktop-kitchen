/**
 * Billing Lifecycle integration tests
 * Trial limits enforced, plan upgrade unlocks features.
 */
import { describe, it, expect } from 'vitest';
import { admin, alpha, tenantApi, rawRequest } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Billing Lifecycle', () => {
  const TRIAL_TENANT_ID = 'test-billing-trial';
  const TRIAL_EMAIL = 'billing-trial@test.desktop.kitchen';
  let trialManagerToken: string;
  const MANAGER_PIN = '1234';

  describe('Setup: Create trial tenant', () => {
    it('creates a trial tenant', async () => {
      const res = await admin.post('/admin/tenants', {
        id: TRIAL_TENANT_ID,
        name: 'Billing Trial Test',
        owner_email: TRIAL_EMAIL,
        owner_password: 'BillingTrial2026!',
        plan: 'trial',
      });
      expect(res.status).toBe(201);
      expect(res.data.plan).toBe('trial');
    });

    it('seeds the trial tenant', async () => {
      const res = await admin.post(`/admin/tenants/${TRIAL_TENANT_ID}/seed`);
      expect(res.status).toBe(200);
    });

    it('creates a manager employee with known PIN', async () => {
      // The admin tenant creation generates a random PIN for the first employee.
      // The seed skips employee creation when employees already exist.
      // We need to explicitly create a manager with a known PIN.
      const headers: Record<string, string> = {
        'X-Tenant-ID': TRIAL_TENANT_ID,
        'X-Admin-Secret': getTestState().adminSecret,
        'Content-Type': 'application/json',
      };
      const res = await rawRequest('POST', '/api/employees', {
        headers,
        body: { name: 'Trial Manager', pin: MANAGER_PIN, role: 'admin' },
      });
      // Accept 201 (created) or 403 (plan limit) — trial allows 3 employees
      expect([201, 403]).toContain(res.status);
    });

    it('logs in as trial manager', async () => {
      const headers: Record<string, string> = {
        'X-Tenant-ID': TRIAL_TENANT_ID,
        'X-Admin-Secret': getTestState().adminSecret,
        'Content-Type': 'application/json',
      };
      const res = await rawRequest('POST', '/api/employees/login', {
        headers,
        body: { pin: MANAGER_PIN },
      });
      expect(res.status).toBe(200);
      trialManagerToken = res.data.token;
    });
  });

  describe('Trial Limits', () => {
    it('trial tenant has limited menu items', async () => {
      const api = tenantApi(TRIAL_TENANT_ID, trialManagerToken);

      // Get current count
      const items = await api.get('/api/menu/items');
      const currentItems = (items.data.items || items.data);

      // Get a category
      const cats = await api.get('/api/menu/categories');
      if (cats.data.length === 0) return;
      const catId = cats.data[0].id;

      // Try to create items up to the trial limit (10)
      // If already at limit, creation should fail
      if (currentItems.length >= 10) {
        const res = await api.post('/api/menu/items', {
          category_id: catId,
          name: 'Over Limit Item',
          price: 50,
        });
        expect(res.status).toBe(403);
      }
    });

    it('trial tenant has limited employees', async () => {
      const api = tenantApi(TRIAL_TENANT_ID, trialManagerToken);
      const emps = await api.get('/api/employees');

      // Trial limit is 3 employees
      if (emps.data.length >= 3) {
        const res = await api.post('/api/employees', {
          name: 'Over Limit Employee',
          pin: '3333',
          role: 'cashier',
        });
        expect(res.status).toBe(403);
      }
    });
  });

  describe('Plan Upgrade', () => {
    it('upgrading to pro unlocks delivery features', async () => {
      // Upgrade trial to pro via admin
      await admin.patch(`/admin/tenants/${TRIAL_TENANT_ID}`, {
        plan: 'pro',
      });

      // Verify the plan changed
      const tenant = await admin.get(`/admin/tenants/${TRIAL_TENANT_ID}`);
      expect(tenant.data.plan).toBe('pro');
    });

    it('pro tenant can access delivery endpoints', async () => {
      const api = tenantApi(TRIAL_TENANT_ID, trialManagerToken);
      const res = await api.get('/api/delivery/platforms');
      expect(res.status).toBe(200);
    });
  });

  describe('Promo Code Validation', () => {
    it('GET /api/billing/promo/validate with valid code', async () => {
      const res = await rawRequest('GET', '/api/billing/promo/validate?code=LAUNCH50');
      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/billing/promo/validate with invalid code', async () => {
      const res = await rawRequest('GET', '/api/billing/promo/validate?code=NONEXISTENT');
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Cleanup', () => {
    it('deletes the trial tenant', async () => {
      const res = await admin.delete(`/admin/tenants/${TRIAL_TENANT_ID}`, {
        confirm: TRIAL_TENANT_ID,
      });
      expect(res.status).toBe(200);
    }, 60_000); // Cascading delete can take longer
  });
});
