/**
 * Delivery module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: Delivery', () => {
  it('GET /api/delivery/platforms lists platforms', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/delivery/platforms');
    expect(res.status).toBe(200);
    expect(res.data.length).toBeGreaterThanOrEqual(3);
  });

  it('PUT /api/delivery/platforms/:id updates platform', async () => {
    const api = alpha('manager');
    const platforms = await api.get('/api/delivery/platforms');
    const p = platforms.data[0];
    const res = await api.put(`/api/delivery/platforms/${p.id}`, { active: true });
    expect(res.status).toBe(200);
  });

  it('GET /api/delivery/orders lists delivery orders', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/delivery/orders');
    expect(res.status).toBe(200);
  });

  it('GET /api/delivery-intel/summary returns analytics', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/delivery-intel/summary');
    expect(res.status).toBe(200);
  });

  it('GET /api/delivery-intel/markup-rules lists rules', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/delivery-intel/markup-rules');
    expect(res.status).toBe(200);
  });

  it('GET /api/delivery-intel/virtual-brands lists brands', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/delivery-intel/virtual-brands');
    expect(res.status).toBe(200);
  });

  it('GET /api/delivery-intel/recapture/candidates lists candidates', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/delivery-intel/recapture/candidates');
    expect(res.status).toBe(200);
  });
});
