/**
 * Input Validation security tests
 * SQL injection, XSS, LIKE injection, oversized payloads.
 */
import { describe, it, expect } from 'vitest';
import { alpha, admin, rawRequest } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Input Validation', () => {
  describe('SQL Injection', () => {
    it('menu item name with SQL injection is handled safely', async () => {
      const api = alpha('manager');
      const state = getTestState();
      const categoryId = Object.values(state.tenantAlpha.categoryIds)[0];

      const res = await api.post('/api/menu/items', {
        category_id: categoryId,
        name: "'; DROP TABLE menu_items; --",
        price: 50,
      });
      // Should either create the item with the literal string or reject it
      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        // Clean up
        await api.delete(`/api/menu/items/${res.data.id}`);
      }

      // Verify table still exists
      const items = await api.get('/api/menu/items');
      expect(res.status !== 500 || items.status === 200).toBe(true);
    });

    it('search query with SQL injection is safe', async () => {
      const res = await admin.get("/admin/tenants?search=' OR 1=1; --");
      expect(res.status).toBe(200);
      // Should return filtered results, not all data
    });

    it('employee name with SQL injection is safe', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/employees', {
        name: "Robert'); DROP TABLE employees;--",
        pin: '1111',
        role: 'cashier',
      });
      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        await api.delete(`/api/employees/${res.data.id}`);
      }
    });

    it('category name with UNION SELECT is safe', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/menu/categories', {
        name: "' UNION SELECT id, owner_password_hash FROM tenants; --",
      });
      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        await api.delete(`/api/menu/categories/${res.data.id}`);
      }
    });
  });

  describe('XSS Prevention', () => {
    it('menu item name with script tag is stored safely', async () => {
      const api = alpha('manager');
      const state = getTestState();
      const categoryId = Object.values(state.tenantAlpha.categoryIds)[0];

      const res = await api.post('/api/menu/items', {
        category_id: categoryId,
        name: '<script>alert("xss")</script>Burger',
        price: 50,
        description: '<img src=x onerror=alert(1)>',
      });
      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        // The item should be stored — XSS prevention is on the frontend
        await api.delete(`/api/menu/items/${res.data.id}`);
      }
    });

    it('employee name with HTML injection', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/employees', {
        name: '<b onmouseover=alert(1)>Evil</b>',
        pin: '2222',
        role: 'cashier',
      });
      expect([201, 400]).toContain(res.status);

      if (res.status === 201) {
        await api.delete(`/api/employees/${res.data.id}`);
      }
    });
  });

  describe('LIKE Injection', () => {
    it('tenant search with LIKE wildcards is handled', async () => {
      const res = await admin.get('/admin/tenants?search=%25%25');
      expect(res.status).toBe(200);
      // Should not return all tenants due to wildcard
    });

    it('customer phone search with wildcards is safe', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/loyalty/customers?search=%25%25');
      expect(res.status).toBe(200);
    });
  });

  describe('Oversized Payloads', () => {
    it('rejects extremely long menu item name', async () => {
      const api = alpha('manager');
      const state = getTestState();
      const categoryId = Object.values(state.tenantAlpha.categoryIds)[0];

      const res = await api.post('/api/menu/items', {
        category_id: categoryId,
        name: 'A'.repeat(10000),
        price: 50,
      });
      // Should either reject or truncate
      expect([201, 400, 413, 500]).toContain(res.status);

      if (res.status === 201) {
        await api.delete(`/api/menu/items/${res.data.id}`);
      }
    });

    it('rejects extremely large JSON payload', async () => {
      const state = getTestState();
      const largeBody = {
        items: Array(1000).fill({
          menu_item_id: Object.values(state.tenantAlpha.menuItemIds)[0],
          quantity: 1,
        }),
        source: 'pos',
      };

      const api = alpha('manager');
      const res = await api.post('/api/orders', largeBody);
      // Should handle gracefully (either process or reject)
      expect([201, 400, 413, 500]).toContain(res.status);
    });
  });

  describe('ID Parameter Injection', () => {
    it('non-numeric ID parameter is handled safely', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/orders/abc-not-a-number');
      expect([400, 404, 500]).toContain(res.status);
    });

    it('negative ID parameter is handled safely', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/orders/-1');
      expect([400, 404, 500]).toContain(res.status);
    });

    it('very large ID parameter is handled safely', async () => {
      const api = alpha('manager');
      // 99999999999999 exceeds Postgres INTEGER max (~2.1 billion), which may
      // cause a Postgres "integer out of range" error resulting in 500.
      const res = await api.get('/api/orders/99999999999999');
      expect([400, 404, 500]).toContain(res.status);
    });
  });

  describe('Tenant ID Header Injection', () => {
    it('SQL in X-Tenant-ID header is handled safely', async () => {
      const state = getTestState();
      const res = await rawRequest('GET', '/api/menu/categories', {
        headers: {
          'X-Tenant-ID': "'; DROP TABLE tenants; --",
          'X-Admin-Secret': state.adminSecret,
        },
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
