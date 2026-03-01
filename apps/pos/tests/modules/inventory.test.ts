/**
 * Inventory module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: Inventory', () => {
  let itemId: number;

  it('creates an inventory item with all fields', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/inventory', {
      name: 'Test Inv Module Item',
      quantity: 50,
      unit: 'lbs',
      low_stock_threshold: 5,
      category: 'Test',
      cost_price: 25,
      sku: 'TEST-MOD-001',
      barcode: '1234567890123',
    });
    // POST /api/inventory returns 200 (no explicit 201 status in route)
    expect(res.status).toBe(200);
    itemId = res.data.id;
  });

  it('updates inventory item', async () => {
    const api = alpha('manager');
    const res = await api.put(`/api/inventory/${itemId}`, { quantity: 75, cost_price: 30 });
    expect(res.status).toBe(200);
  });

  it('restocks inventory', async () => {
    const api = alpha('manager');
    const res = await api.post(`/api/inventory/${itemId}/restock`, { quantity: 25 });
    expect(res.status).toBe(200);
  });

  it('records a physical count', async () => {
    const api = alpha('manager');
    const res = await api.post(`/api/inventory/${itemId}/count`, {
      counted_quantity: 90,
      notes: 'Module test count',
    });
    expect(res.status).toBe(200);
  });

  it('looks up by SKU', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/inventory/lookup?sku=TEST-MOD-001');
    expect(res.status).toBe(200);
  });

  it('looks up by barcode', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/inventory/lookup?barcode=1234567890123');
    expect(res.status).toBe(200);
  });

  it('gets low stock items', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/inventory/low-stock');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('gets variance report', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/inventory/variance-report');
    expect(res.status).toBe(200);
  });

  it('gets shrinkage alerts', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/inventory/shrinkage-alerts');
    expect(res.status).toBe(200);
  });

  it('gets count history', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/inventory/counts');
    expect(res.status).toBe(200);
  });

  it('cleanup: deactivate inventory item via update', async () => {
    // No DELETE endpoint exists for inventory; set quantity to 0 as cleanup
    const api = alpha('manager');
    const res = await api.put(`/api/inventory/${itemId}`, { quantity: 0 });
    expect(res.status).toBe(200);
  });
});
