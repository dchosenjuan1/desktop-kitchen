/**
 * Delivery Flow integration tests
 * Platform orders, markup rules, virtual brands.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { alpha, admin } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Delivery Flow', () => {
  // Ensure delivery platforms are seeded before running delivery tests.
  // The super-admin persona tests may re-seed alpha, but the delivery_platforms
  // insertion could fail silently. Re-seed to guarantee platforms exist.
  beforeAll(async () => {
    const state = getTestState();
    await admin.post(`/admin/tenants/${state.tenantAlpha.id}/seed`);
  }, 30_000);

  describe('Platform Configuration', () => {
    it('lists delivery platforms', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery/platforms');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(3);
    });

    it('updates a platform configuration', async () => {
      const api = alpha('manager');
      const platforms = await api.get('/api/delivery/platforms');
      if (platforms.data.length === 0) return;

      const platform = platforms.data[0];
      const res = await api.put(`/api/delivery/platforms/${platform.id}`, {
        commission_percent: 28,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('Markup Rules', () => {
    let ruleId: number;

    it('lists markup rules', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery-intel/markup-rules');
      expect(res.status).toBe(200);
    });

    it('creates a markup rule', async () => {
      const api = alpha('manager');
      const platforms = await api.get('/api/delivery/platforms');
      if (platforms.data.length === 0) return;

      const state = getTestState();
      const categoryId = Object.values(state.tenantAlpha.categoryIds)[0];

      const res = await api.post('/api/delivery-intel/markup-rules', {
        platform_id: platforms.data[0].id,
        category_id: categoryId,
        markup_type: 'percent',
        markup_value: 15,
      });
      expect([200, 201]).toContain(res.status);
      if (res.data?.id) ruleId = res.data.id;
    });

    it('previews markup for a platform', async () => {
      const api = alpha('manager');
      const platforms = await api.get('/api/delivery/platforms');
      if (platforms.data.length === 0) return;

      const res = await api.get(`/api/delivery-intel/markup-preview/${platforms.data[0].id}`);
      expect(res.status).toBe(200);
    });

    it('deletes a markup rule', async () => {
      if (!ruleId) return;
      const api = alpha('manager');
      const res = await api.delete(`/api/delivery-intel/markup-rules/${ruleId}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Virtual Brands', () => {
    let brandId: number;

    it('lists virtual brands', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery-intel/virtual-brands');
      expect(res.status).toBe(200);
    });

    it('creates a virtual brand', async () => {
      const api = alpha('manager');
      const platforms = await api.get('/api/delivery/platforms');
      if (platforms.data.length === 0) return;

      const res = await api.post('/api/delivery-intel/virtual-brands', {
        name: 'Test Virtual Brand',
        platform_id: platforms.data[0].id,
        description: 'Test brand for delivery tests',
        colors: { primary: '#ff6600' },
        fonts: { heading: 'Arial' },
      });
      expect([200, 201]).toContain(res.status);
      if (res.data?.id) brandId = res.data.id;
    });

    it('adds items to a virtual brand', async () => {
      if (!brandId) return;
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];

      const api = alpha('manager');
      const res = await api.post(`/api/delivery-intel/virtual-brands/${brandId}/items`, {
        items: [{ menu_item_id: itemId, custom_name: 'VB Test Item' }],
      });
      expect([200, 201]).toContain(res.status);
    });

    it('lists items in a virtual brand', async () => {
      if (!brandId) return;
      const api = alpha('manager');
      const res = await api.get(`/api/delivery-intel/virtual-brands/${brandId}/items`);
      expect(res.status).toBe(200);
    });

    it('deletes a virtual brand', async () => {
      if (!brandId) return;
      const api = alpha('manager');
      const res = await api.delete(`/api/delivery-intel/virtual-brands/${brandId}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Delivery Orders', () => {
    it('lists delivery orders (empty or with existing)', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery/orders');
      expect(res.status).toBe(200);
    });
  });

  describe('Delivery Analytics', () => {
    it('GET /api/delivery-intel/summary returns P&L', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery-intel/summary');
      expect(res.status).toBe(200);
    });
  });

  describe('Recapture Candidates', () => {
    it('GET /api/delivery-intel/recapture/candidates lists delivery-only customers', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery-intel/recapture/candidates');
      expect(res.status).toBe(200);
    });
  });
});
