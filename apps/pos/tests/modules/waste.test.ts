/**
 * Waste module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: Waste', () => {
  it('POST /api/waste logs waste event', async () => {
    const api = alpha('manager');
    const inv = await api.get('/api/inventory');
    const items = inv.data.items || inv.data;
    if (items.length === 0) return;

    const res = await api.post('/api/waste', {
      inventory_item_id: items[0].id,
      quantity: 2,
      reason: 'spoilage',
      notes: 'Module test waste',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('GET /api/waste lists waste entries', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/waste');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('GET /api/waste with date filter', async () => {
    const api = alpha('manager');
    const today = new Date().toISOString().slice(0, 10);
    const res = await api.get(`/api/waste?start_date=${today}&end_date=${today}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/waste/report returns waste analytics', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/waste/report');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('summary');
  });
});
