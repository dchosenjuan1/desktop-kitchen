/**
 * Tenant Isolation integration tests
 * Verifies that tenant A cannot see/modify tenant B's data across resource types.
 */
import { describe, it, expect } from 'vitest';
import { alpha, beta, tenantApi } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Tenant Isolation', () => {
  describe('Menu Items', () => {
    it('tenant alpha cannot see tenant beta menu items', async () => {
      const alphaApi = alpha('manager');
      const betaApi = beta('manager');

      const alphaItems = await alphaApi.get('/api/menu/items');
      const betaItems = await betaApi.get('/api/menu/items');

      const alphaItemIds = new Set(
        (alphaItems.data.items || alphaItems.data).map((i: any) => i.id)
      );
      const betaItemIds = new Set(
        (betaItems.data.items || betaItems.data).map((i: any) => i.id)
      );

      // No overlap in item IDs
      for (const id of alphaItemIds) {
        expect(betaItemIds.has(id)).toBe(false);
      }
    });
  });

  describe('Orders', () => {
    it('tenant alpha cannot see tenant beta orders', async () => {
      const state = getTestState();

      // Create an order in alpha (employee_id is required in the request body)
      const alphaApi = alpha('manager');
      const alphaItemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const alphaOrder = await alphaApi.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{ menu_item_id: alphaItemId, quantity: 1 }],
        source: 'pos',
      });
      expect(alphaOrder.status).toBe(201);

      // Check beta can't see it
      const betaApi = beta('manager');
      const betaOrders = await betaApi.get('/api/orders');
      const betaOrderIds = (betaOrders.data.orders || betaOrders.data).map((o: any) => o.id);
      expect(betaOrderIds).not.toContain(alphaOrder.data.id);
    });
  });

  describe('Employees', () => {
    it('tenant alpha employees not visible to tenant beta', async () => {
      const alphaApi = alpha('manager');
      const betaApi = beta('manager');

      const alphaEmps = await alphaApi.get('/api/employees');
      const betaEmps = await betaApi.get('/api/employees');

      const alphaEmpIds = new Set(alphaEmps.data.map((e: any) => e.id));
      const betaEmpIds = new Set(betaEmps.data.map((e: any) => e.id));

      for (const id of alphaEmpIds) {
        expect(betaEmpIds.has(id)).toBe(false);
      }
    });
  });

  describe('Inventory', () => {
    it('tenant alpha inventory not visible to tenant beta', async () => {
      const alphaApi = alpha('manager');
      const betaApi = beta('manager');

      const alphaInv = await alphaApi.get('/api/inventory');
      const betaInv = await betaApi.get('/api/inventory');

      const alphaInvIds = new Set(
        (alphaInv.data.items || alphaInv.data).map((i: any) => i.id)
      );
      const betaInvIds = new Set(
        (betaInv.data.items || betaInv.data).map((i: any) => i.id)
      );

      for (const id of alphaInvIds) {
        expect(betaInvIds.has(id)).toBe(false);
      }
    });
  });

  describe('Loyalty Customers', () => {
    it('tenant alpha loyalty customers not visible to tenant beta', async () => {
      const alphaApi = alpha('manager');
      const betaApi = beta('manager');

      const alphaCustomers = await alphaApi.get('/api/loyalty/customers');
      const betaCustomers = await betaApi.get('/api/loyalty/customers');

      const alphaIds = new Set(
        (alphaCustomers.data.data || alphaCustomers.data).map((c: any) => c.id)
      );
      const betaIds = new Set(
        (betaCustomers.data.data || betaCustomers.data).map((c: any) => c.id)
      );

      for (const id of alphaIds) {
        expect(betaIds.has(id)).toBe(false);
      }
    });
  });

  describe('Categories', () => {
    it('tenant alpha categories not visible to tenant beta', async () => {
      const alphaApi = alpha('manager');
      const betaApi = beta('manager');

      const alphaCats = await alphaApi.get('/api/menu/categories');
      const betaCats = await betaApi.get('/api/menu/categories');

      const alphaIds = new Set(alphaCats.data.map((c: any) => c.id));
      const betaIds = new Set(betaCats.data.map((c: any) => c.id));

      for (const id of alphaIds) {
        expect(betaIds.has(id)).toBe(false);
      }
    });
  });

  describe('Cross-Tenant JWT Attack', () => {
    it('alpha JWT cannot access beta data via authenticated endpoint', async () => {
      const state = getTestState();
      // Use alpha's manager token but try to access beta's tenant context.
      // GET /api/menu/items is a public endpoint (no requireAuth), so the cross-tenant
      // check inside requireAuth never fires. We must use an authenticated endpoint.
      // POST /api/menu/categories requires requireAuth('manage_menu') which checks tenantId.
      const crossApi = tenantApi(state.tenantBeta.id, state.tenantAlpha.managerToken);
      const res = await crossApi.post('/api/menu/categories', { name: 'Cross-Tenant Test' });
      // requireAuth checks decoded.tenantId !== req.tenant.id → 403
      expect([401, 403]).toContain(res.status);
    });

    it('beta JWT cannot access alpha data via authenticated endpoint', async () => {
      const state = getTestState();
      const crossApi = tenantApi(state.tenantAlpha.id, state.tenantBeta.managerToken);
      const res = await crossApi.post('/api/menu/categories', { name: 'Cross-Tenant Test' });
      expect([401, 403]).toContain(res.status);
    });
  });
});
