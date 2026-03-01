/**
 * Purchase Orders module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: Purchase Orders', () => {
  let vendorId: number;
  let poId: number;

  it('POST /api/purchase-orders/vendors creates a vendor', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/purchase-orders/vendors', {
      name: 'Test Vendor Module',
      contact_name: 'John Doe',
      phone: '5551234567',
      email: 'vendor@test.com',
    });
    expect(res.status).toBe(201);
    vendorId = res.data.id;
  });

  it('GET /api/purchase-orders/vendors lists vendors', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/purchase-orders/vendors');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('POST /api/purchase-orders creates a PO', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/purchase-orders', {
      vendor_id: vendorId,
      notes: 'Test PO',
    });
    expect(res.status).toBe(201);
    poId = res.data.id;
  });

  it('GET /api/purchase-orders lists POs', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/purchase-orders');
    expect(res.status).toBe(200);
  });

  it('GET /api/purchase-orders/:id returns PO detail', async () => {
    const api = alpha('manager');
    const res = await api.get(`/api/purchase-orders/${poId}`);
    expect(res.status).toBe(200);
  });

  it('POST /api/purchase-orders/:id/submit submits PO', async () => {
    const api = alpha('manager');
    const res = await api.post(`/api/purchase-orders/${poId}/submit`);
    expect([200, 400]).toContain(res.status);
  });

  it('POST /api/purchase-orders/:id/cancel cancels PO', async () => {
    const api = alpha('manager');
    const res = await api.post(`/api/purchase-orders/${poId}/cancel`);
    expect([200, 400]).toContain(res.status);
  });
});
