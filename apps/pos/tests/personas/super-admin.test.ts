/**
 * Super Admin persona tests (~35 tests)
 * Tests all /admin/* endpoints protected by X-Admin-Secret.
 */
import { describe, it, expect } from 'vitest';
import { admin, pub, rawRequest } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Super Admin', () => {
  // ==================== Auth ====================
  describe('Auth', () => {
    it('rejects requests without admin secret', async () => {
      const res = await pub.get('/admin/tenants');
      expect(res.status).toBe(401);
      expect(res.data.error).toContain('Invalid admin secret');
    });

    it('rejects requests with wrong admin secret', async () => {
      const res = await rawRequest('GET', '/admin/tenants', {
        headers: { 'X-Admin-Secret': 'wrong-secret' },
      });
      expect(res.status).toBe(401);
    });

    it('accepts requests with correct admin secret', async () => {
      const res = await admin.get('/admin/tenants');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  // ==================== Analytics ====================
  describe('Analytics', () => {
    it('GET /admin/analytics/overview returns KPIs', async () => {
      const res = await admin.get('/admin/analytics/overview');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('total_tenants');
      expect(res.data).toHaveProperty('active_tenants');
      expect(res.data).toHaveProperty('plan_breakdown');
      expect(res.data).toHaveProperty('mrr');
      expect(res.data).toHaveProperty('total_orders');
      expect(res.data).toHaveProperty('total_revenue');
      expect(typeof res.data.total_tenants).toBe('number');
      expect(res.data.total_tenants).toBeGreaterThanOrEqual(2); // alpha + beta at minimum
    });

    it('GET /admin/analytics/signups returns monthly trend', async () => {
      const res = await admin.get('/admin/analytics/signups?months=12');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data.length > 0) {
        expect(res.data[0]).toHaveProperty('month');
        expect(res.data[0]).toHaveProperty('count');
      }
    });

    it('GET /admin/analytics/revenue returns monthly data', async () => {
      const res = await admin.get('/admin/analytics/revenue?months=6');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('GET /admin/analytics/churn returns cancellation data', async () => {
      const res = await admin.get('/admin/analytics/churn?months=12');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });

    it('GET /admin/analytics/health returns system health', async () => {
      const res = await admin.get('/admin/analytics/health');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('uptime_seconds');
      expect(res.data).toHaveProperty('node_version');
      expect(res.data).toHaveProperty('memory');
      expect(res.data).toHaveProperty('postgres_version');
    });

    it('GET /admin/analytics/activity returns active/inactive tenants', async () => {
      const res = await admin.get('/admin/analytics/activity');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('most_active');
      expect(res.data).toHaveProperty('least_active');
      expect(Array.isArray(res.data.most_active)).toBe(true);
    });
  });

  // ==================== Tenant CRUD ====================
  describe('Tenant CRUD', () => {
    const TEMP_TENANT_ID = 'test-crud-temp';
    const TEMP_EMAIL = 'crud-temp@test.desktop.kitchen';

    it('POST /admin/tenants creates a new tenant', async () => {
      const res = await admin.post('/admin/tenants', {
        id: TEMP_TENANT_ID,
        name: 'CRUD Test Tenant',
        owner_email: TEMP_EMAIL,
        owner_password: 'CrudTest2026!',
        plan: 'starter',
      });
      expect(res.status).toBe(201);
      expect(res.data.id).toBe(TEMP_TENANT_ID);
      expect(res.data.name).toBe('CRUD Test Tenant');
      expect(res.data.plan).toBe('starter');
      expect(res.data.pin).toBeDefined();
      expect(res.data.owner_password_hash).toBeUndefined(); // should be stripped
    });

    it('POST /admin/tenants rejects duplicate tenant ID', async () => {
      const res = await admin.post('/admin/tenants', {
        id: TEMP_TENANT_ID,
        name: 'Dup',
        owner_email: 'dup@test.desktop.kitchen',
        owner_password: 'DupTest2026!',
      });
      expect(res.status).toBe(409);
    });

    it('POST /admin/tenants rejects duplicate email', async () => {
      const res = await admin.post('/admin/tenants', {
        id: 'test-dup-email',
        name: 'Dup Email',
        owner_email: TEMP_EMAIL,
        owner_password: 'DupEmail2026!',
      });
      expect(res.status).toBe(409);
    });

    it('POST /admin/tenants rejects missing required fields', async () => {
      const res = await admin.post('/admin/tenants', {
        id: 'test-missing-fields',
        name: 'Missing Fields',
      });
      expect(res.status).toBe(400);
    });

    it('POST /admin/tenants rejects short password', async () => {
      const res = await admin.post('/admin/tenants', {
        id: 'test-short-pw',
        name: 'Short PW',
        owner_email: 'short-pw@test.desktop.kitchen',
        owner_password: 'short',
      });
      expect(res.status).toBe(400);
    });

    it('GET /admin/tenants lists all tenants', async () => {
      const res = await admin.get('/admin/tenants');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      const ids = res.data.map((t: any) => t.id);
      expect(ids).toContain(TEMP_TENANT_ID);
    });

    it('GET /admin/tenants supports search filter', async () => {
      const res = await admin.get('/admin/tenants?search=crud');
      expect(res.status).toBe(200);
      expect(res.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /admin/tenants/:id returns single tenant', async () => {
      const res = await admin.get(`/admin/tenants/${TEMP_TENANT_ID}`);
      expect(res.status).toBe(200);
      expect(res.data.id).toBe(TEMP_TENANT_ID);
    });

    it('GET /admin/tenants/:id returns 404 for non-existent', async () => {
      const res = await admin.get('/admin/tenants/nonexistent-tenant-xyz');
      expect(res.status).toBe(404);
    });

    it('PATCH /admin/tenants/:id updates tenant fields', async () => {
      const res = await admin.patch(`/admin/tenants/${TEMP_TENANT_ID}`, {
        name: 'Updated CRUD Tenant',
        plan: 'pro',
      });
      expect(res.status).toBe(200);
      expect(res.data.name).toBe('Updated CRUD Tenant');
      expect(res.data.plan).toBe('pro');
    });

    it('PATCH /admin/tenants/:id rejects empty update', async () => {
      const res = await admin.patch(`/admin/tenants/${TEMP_TENANT_ID}`, {});
      expect(res.status).toBe(400);
    });

    it('GET /admin/tenants/:id/deep-dive returns detailed stats', async () => {
      const state = getTestState();
      const res = await admin.get(`/admin/tenants/${state.tenantAlpha.id}/deep-dive`);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('tenant');
      expect(res.data).toHaveProperty('stats');
      expect(res.data.stats).toHaveProperty('employee_count');
      expect(res.data.stats).toHaveProperty('menu_item_count');
    });

    it('POST /admin/tenants/:id/reset-password resets owner password', async () => {
      const res = await admin.post(`/admin/tenants/${TEMP_TENANT_ID}/reset-password`, {
        new_password: 'NewPassword2026!',
      });
      expect(res.status).toBe(200);
      expect(res.data.message).toContain('reset');
    });

    it('POST /admin/tenants/:id/reset-password rejects short password', async () => {
      const res = await admin.post(`/admin/tenants/${TEMP_TENANT_ID}/reset-password`, {
        new_password: 'short',
      });
      expect(res.status).toBe(400);
    });
  });

  // ==================== Tenant Data ====================
  describe('Tenant Data', () => {
    it('POST /admin/tenants/:id/seed seeds demo data', async () => {
      const state = getTestState();
      const res = await admin.post(`/admin/tenants/${state.tenantAlpha.id}/seed`);
      expect(res.status).toBe(200);
      expect(res.data.summary).toHaveProperty('categories');
      expect(res.data.summary).toHaveProperty('menu_items');
    });

    it('GET /admin/tenants/:id/export exports all data', async () => {
      const state = getTestState();
      const res = await admin.get(`/admin/tenants/${state.tenantAlpha.id}/export`);
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('_tenant');
      expect(res.data).toHaveProperty('employees');
      expect(res.data).toHaveProperty('menu_items');
      expect(res.data._tenant.owner_password_hash).toBeUndefined();
    });

    it('GET /admin/tenants/:id/employees lists employees', async () => {
      const state = getTestState();
      const res = await admin.get(`/admin/tenants/${state.tenantAlpha.id}/employees`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(2);
      // Should not expose PIN hashes
      for (const emp of res.data) {
        expect(emp.pin).toBeUndefined();
      }
    });

    it('PATCH /admin/tenants/:id/employees/:empId/pin resets employee PIN', async () => {
      const state = getTestState();
      const emps = await admin.get(`/admin/tenants/${state.tenantAlpha.id}/employees`);
      const emp = emps.data[0];

      const res = await admin.patch(
        `/admin/tenants/${state.tenantAlpha.id}/employees/${emp.id}/pin`,
        { pin: '4321' },
      );
      expect(res.status).toBe(200);
      expect(res.data.message).toContain('PIN updated');

      // Restore original PIN for other tests (re-seed will handle this)
    });

    it('PATCH /admin/tenants/:id/employees/:empId/pin rejects invalid PIN', async () => {
      const state = getTestState();
      const emps = await admin.get(`/admin/tenants/${state.tenantAlpha.id}/employees`);
      const emp = emps.data[0];

      const res = await admin.patch(
        `/admin/tenants/${state.tenantAlpha.id}/employees/${emp.id}/pin`,
        { pin: 'abc' },
      );
      expect(res.status).toBe(400);
    });
  });

  // ==================== Tenant Deletion ====================
  describe('Tenant Deletion', () => {
    const TEMP_TENANT_ID = 'test-crud-temp';

    it('DELETE /admin/tenants/:id rejects without confirmation', async () => {
      const res = await admin.delete(`/admin/tenants/${TEMP_TENANT_ID}`, {});
      expect(res.status).toBe(400);
      expect(res.data.error).toContain('confirm');
    });

    it('DELETE /admin/tenants/:id rejects wrong confirmation', async () => {
      const res = await admin.delete(`/admin/tenants/${TEMP_TENANT_ID}`, {
        confirm: 'wrong-id',
      });
      expect(res.status).toBe(400);
    });

    it('DELETE /admin/tenants/:id deletes with correct confirmation', async () => {
      const res = await admin.delete(`/admin/tenants/${TEMP_TENANT_ID}`, {
        confirm: TEMP_TENANT_ID,
      });
      expect(res.status).toBe(200);
      expect(res.data.message).toContain('deleted');

      // Verify it's gone
      const check = await admin.get(`/admin/tenants/${TEMP_TENANT_ID}`);
      expect(check.status).toBe(404);
    }, 60_000); // Cascading delete across 46+ tables can take longer

    it('DELETE /admin/tenants/:id returns 404 for non-existent', async () => {
      const res = await admin.delete('/admin/tenants/nonexistent-xyz', {
        confirm: 'nonexistent-xyz',
      });
      expect(res.status).toBe(404);
    });
  });

  // ==================== Promos ====================
  describe('Promos', () => {
    it('GET /admin/promos/usage returns promo stats', async () => {
      const res = await admin.get('/admin/promos/usage');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });
});
