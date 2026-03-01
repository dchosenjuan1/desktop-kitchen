/**
 * Manager persona tests (~80 tests)
 * Tests all manager-accessible endpoints: menu, orders, inventory,
 * employees, reports, modifiers, combos, AI, loyalty, delivery, etc.
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Manager', () => {
  // ==================== PIN Login ====================
  describe('PIN Login', () => {
    it('POST /api/employees/login with valid PIN returns token + permissions', async () => {
      const state = getTestState();
      expect(state.tenantAlpha.managerToken).toBeTruthy();
      expect(state.tenantAlpha.managerEmployeeId).toBeGreaterThan(0);
    });
  });

  // ==================== Menu Categories ====================
  describe('Menu Categories', () => {
    let newCategoryId: number;

    it('GET /api/menu/categories lists categories', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/menu/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(5);
    });

    it('POST /api/menu/categories creates a category', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/menu/categories', {
        name: 'Test Category',
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.name).toBe('Test Category');
      newCategoryId = res.data.id;
    });

    it('POST /api/menu/categories rejects empty name', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/menu/categories', { name: '' });
      expect(res.status).toBe(400);
    });

    it('PUT /api/menu/categories/:id updates a category', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/menu/categories/${newCategoryId}`, {
        name: 'Updated Test Category',
      });
      expect(res.status).toBe(200);
    });

    it('PUT /api/menu/categories/:id/toggle deactivates a category', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/menu/categories/${newCategoryId}/toggle`);
      expect(res.status).toBe(200);
    });
  });

  // ==================== Menu Items ====================
  describe('Menu Items', () => {
    let newItemId: number;

    it('GET /api/menu/items lists items', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/menu/items');
      expect(res.status).toBe(200);
      // Could be { items: [...] } or just [...]
      const items = res.data.items || res.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(10);
    });

    it('POST /api/menu/items creates an item', async () => {
      const state = getTestState();
      const categoryId = Object.values(state.tenantAlpha.categoryIds)[0];
      const api = alpha('manager');
      const res = await api.post('/api/menu/items', {
        category_id: categoryId,
        name: 'Test Item',
        price: 50,
        description: 'A test menu item',
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      newItemId = res.data.id;
    });

    it('PUT /api/menu/items/:id updates an item', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/menu/items/${newItemId}`, {
        name: 'Updated Test Item',
        price: 60,
      });
      expect(res.status).toBe(200);
    });

    it('PUT /api/menu/items/:id/toggle deactivates an item', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/menu/items/${newItemId}/toggle`);
      expect(res.status).toBe(200);
    });

    it('GET /api/menu/items/:id/recipe returns recipe', async () => {
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const api = alpha('manager');
      const res = await api.get(`/api/menu/items/${itemId}/recipe`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  // ==================== Modifiers ====================
  describe('Modifiers', () => {
    let newGroupId: number;
    let newModifierId: number;

    it('GET /api/modifiers/groups lists modifier groups', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/modifiers/groups');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/modifiers/groups creates a group', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/modifiers/groups', {
        name: 'Test Modifier Group',
        selection_type: 'single',
        required: false,
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      newGroupId = res.data.id;
    });

    it('POST /api/modifiers creates a modifier', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/modifiers', {
        group_id: newGroupId,
        name: 'Test Modifier',
        price_adjustment: 10,
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      newModifierId = res.data.id;
    });

    it('PUT /api/modifiers/:id updates a modifier', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/modifiers/${newModifierId}`, {
        name: 'Updated Test Modifier',
        price_adjustment: 15,
      });
      expect(res.status).toBe(200);
    });

    it('PUT /api/modifiers/:id deactivates a modifier', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/modifiers/${newModifierId}`, {
        active: false,
      });
      expect(res.status).toBe(200);
    });

    it('PUT /api/modifiers/groups/:id deactivates a group', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/modifiers/groups/${newGroupId}`, {
        active: false,
      });
      expect(res.status).toBe(200);
    });
  });

  // ==================== Combos ====================
  describe('Combos', () => {
    it('GET /api/combos lists combos', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/combos');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(2);
    });

    it('POST /api/combos creates a combo', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/combos', {
        name: 'Test Combo',
        description: 'A test combo',
        combo_price: 100,
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');

      // Clean up by deactivating
      await api.put(`/api/combos/${res.data.id}`, { active: false });
    });
  });

  // ==================== Orders ====================
  describe('Orders', () => {
    let orderId: number;

    it('POST /api/orders creates an order', async () => {
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const api = alpha('manager');
      const res = await api.post('/api/orders', {
        employee_id: state.tenantAlpha.managerEmployeeId,
        items: [{ menu_item_id: itemId, quantity: 2 }],
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data).toHaveProperty('order_number');
      expect(res.data).toHaveProperty('total');
      orderId = res.data.id;
    });

    it('GET /api/orders lists orders', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/orders');
      expect(res.status).toBe(200);
      const orders = res.data.orders || res.data;
      expect(Array.isArray(orders)).toBe(true);
    });

    it('GET /api/orders/:id returns single order', async () => {
      const api = alpha('manager');
      const res = await api.get(`/api/orders/${orderId}`);
      expect(res.status).toBe(200);
      expect(res.data.id).toBe(orderId);
    });

    it('PUT /api/orders/:id/status updates order status', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/orders/${orderId}/status`, {
        status: 'confirmed',
      });
      expect(res.status).toBe(200);
    });

    it('GET /api/reports/live returns today summary', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/live');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('kpis');
    });
  });

  // ==================== Payments ====================
  describe('Payments', () => {
    it('POST /api/payments/cash processes a cash payment', async () => {
      // Payment tests covered in payment-flows integration tests
      // Just verify the endpoint is reachable with the right shape
      const api = alpha('manager');
      const res = await api.post('/api/payments/cash', { order_id: -1, amount_received: 100 });
      // Should fail gracefully (order not found), not 500
      expect([200, 400, 404]).toContain(res.status);
    });
  });

  // ==================== Inventory ====================
  describe('Inventory', () => {
    let newInvItemId: number;

    it('GET /api/inventory lists inventory', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/inventory');
      expect(res.status).toBe(200);
      const items = res.data.items || res.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThanOrEqual(10);
    });

    it('POST /api/inventory creates an item', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/inventory', {
        name: 'Test Ingredient',
        quantity: 100,
        unit: 'count',
        low_stock_threshold: 10,
        category: 'Test',
        cost_price: 5,
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('id');
      newInvItemId = res.data.id;
    });

    it('PUT /api/inventory/:id updates an item', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/inventory/${newInvItemId}`, {
        name: 'Updated Test Ingredient',
        quantity: 200,
      });
      expect(res.status).toBe(200);
    });

    it('POST /api/inventory/:id/restock restocks quantity', async () => {
      const api = alpha('manager');
      const res = await api.post(`/api/inventory/${newInvItemId}/restock`, {
        quantity: 10,
      });
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('quantity');
    });

    it('PUT /api/inventory/:id sets quantity to 0 (soft delete)', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/inventory/${newInvItemId}`, {
        quantity: 0,
      });
      expect(res.status).toBe(200);
    });
  });

  // ==================== Waste ====================
  describe('Waste', () => {
    it('POST /api/waste logs a waste event', async () => {
      const api = alpha('manager');
      const state = getTestState();
      const invItems = await api.get('/api/inventory');
      const items = invItems.data.items || invItems.data;
      if (items.length > 0) {
        const res = await api.post('/api/waste', {
          inventory_item_id: items[0].id,
          quantity: 1,
          reason: 'expired',
          notes: 'Test waste log',
        });
        expect([200, 201]).toContain(res.status);
      }
    });

    it('GET /api/waste lists waste log', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/waste');
      expect(res.status).toBe(200);
    });
  });

  // ==================== Reports ====================
  describe('Reports', () => {
    it('GET /api/reports/sales?period=daily returns daily report', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/sales?period=daily');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('period');
    });

    it('GET /api/reports/sales?period=weekly returns weekly report', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/sales?period=weekly');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('period');
    });

    it('GET /api/reports/sales?period=monthly returns monthly report', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/sales?period=monthly');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('period');
    });

    it('GET /api/reports/category-margins returns category data', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/category-margins');
      expect(res.status).toBe(200);
    });

    it('GET /api/reports/cash-card-breakdown returns payment method data', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/cash-card-breakdown');
      expect(res.status).toBe(200);
    });

    it('GET /api/reports/employee-performance returns staff stats', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/employee-performance');
      expect(res.status).toBe(200);
    });

    it('GET /api/reports/hourly returns traffic analysis', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/reports/hourly');
      expect(res.status).toBe(200);
    });

    it('GET /api/inventory/low-stock returns low stock items', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/inventory/low-stock');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });

  // ==================== Employees ====================
  describe('Employees', () => {
    let newEmpId: number;

    it('GET /api/employees lists employees', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/employees');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(3);
    });

    it('POST /api/employees creates a new employee', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/employees', {
        name: 'Test Employee',
        pin: '7777',
        role: 'cashier',
      });
      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.role).toBe('cashier');
      newEmpId = res.data.id;
    });

    it('POST /api/employees rejects invalid role', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/employees', {
        name: 'Bad Role',
        pin: '8888',
        role: 'superadmin',
      });
      expect(res.status).toBe(400);
    });

    it('PUT /api/employees/:id updates an employee', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/employees/${newEmpId}`, {
        name: 'Updated Test Employee',
      });
      expect(res.status).toBe(200);
    });

    it('PUT /api/employees/:id/toggle deactivates an employee', async () => {
      const api = alpha('manager');
      const res = await api.put(`/api/employees/${newEmpId}/toggle`);
      expect(res.status).toBe(200);
    });

    it('GET /api/employees/permissions lists roles and permissions', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/employees/permissions');
      expect(res.status).toBe(200);
    });
  });

  // ==================== Purchase Orders ====================
  describe('Purchase Orders', () => {
    it('GET /api/purchase-orders lists POs', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/purchase-orders');
      expect(res.status).toBe(200);
    });
  });

  // ==================== Loyalty ====================
  describe('Loyalty', () => {
    it('GET /api/loyalty/config returns loyalty config', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/loyalty/config');
      expect(res.status).toBe(200);
    });

    it('GET /api/loyalty/customers lists loyalty customers', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/loyalty/customers');
      expect(res.status).toBe(200);
    });

    it('POST /api/loyalty/customers creates a customer', async () => {
      const api = alpha('manager');
      const res = await api.post('/api/loyalty/customers', {
        phone: '5551234567',
        name: 'Test Customer',
      });
      expect([200, 201]).toContain(res.status);
    });
  });

  // ==================== AI ====================
  describe('AI', () => {
    it('GET /api/ai/config returns AI config', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/ai/config');
      expect(res.status).toBe(200);
    });

    it('GET /api/ai/suggestions/cart returns cart suggestions', async () => {
      const api = alpha('manager');
      const state = getTestState();
      const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
      const res = await api.get(`/api/ai/suggestions/cart?items=${itemId}`);
      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/ai/insights returns business insights', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/ai/insights');
      expect([200, 404]).toContain(res.status);
    });
  });

  // ==================== Delivery ====================
  describe('Delivery', () => {
    it('GET /api/delivery/platforms lists platforms', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery/platforms');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/delivery/orders lists delivery orders', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery/orders');
      expect(res.status).toBe(200);
    });
  });

  // ==================== Delivery Intelligence ====================
  describe('Delivery Intelligence', () => {
    it('GET /api/delivery-intel/analytics returns platform summary', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery-intel/analytics');
      expect(res.status).toBe(200);
    });

    it('GET /api/delivery-intel/markup-rules returns rules', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery-intel/markup-rules');
      expect(res.status).toBe(200);
    });

    it('GET /api/delivery-intel/virtual-brands returns brands', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/delivery-intel/virtual-brands');
      expect(res.status).toBe(200);
    });
  });

  // ==================== Pricing ====================
  describe('Pricing', () => {
    it('GET /api/pricing/rules returns pricing rules', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/pricing/rules');
      // Trial plan blocks dynamic pricing → 403; Pro plan → 200
      expect([200, 403]).toContain(res.status);
    });
  });

  // ==================== Printers ====================
  describe('Printers', () => {
    it('GET /api/printers lists printers', async () => {
      const api = alpha('manager');
      const res = await api.get('/api/printers');
      expect(res.status).toBe(200);
    });
  });
});
