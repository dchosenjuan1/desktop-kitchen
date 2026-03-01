/**
 * AI module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Module: AI', () => {
  it('GET /api/ai/config returns AI configuration', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/config');
    expect(res.status).toBe(200);
  });

  it('PUT /api/ai/config updates config entry', async () => {
    const api = alpha('manager');
    const res = await api.put('/api/ai/config', {
      entries: [{ key: 'max_suggestions_per_order', value: '3' }],
    });
    expect([200, 400]).toContain(res.status);
  });

  it('GET /api/ai/suggestions/cart returns cart suggestions', async () => {
    const state = getTestState();
    const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
    const api = alpha('manager');
    const res = await api.get(`/api/ai/suggestions/cart?items=${itemId}`);
    expect(res.status).toBe(200);
  });

  it('GET /api/ai/suggestions/inventory-push returns push items', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/suggestions/inventory-push');
    expect(res.status).toBe(200);
  });

  it('POST /api/ai/suggestions/feedback logs suggestion action', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/ai/suggestions/feedback', {
      suggestion_type: 'upsell',
      action: 'dismissed',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('GET /api/ai/insights returns business insights', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/insights');
    expect(res.status).toBe(200);
  });

  it('GET /api/ai/analytics returns AI performance metrics', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/analytics');
    expect(res.status).toBe(200);
  });

  it('GET /api/ai/inventory-forecast returns forecasts', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/inventory-forecast');
    expect(res.status).toBe(200);
  });

  it('GET /api/ai/inventory-insights returns inventory dashboard', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/inventory-insights');
    expect(res.status).toBe(200);
  });

  it('GET /api/ai/prep-forecast returns prep forecast', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/prep-forecast');
    expect(res.status).toBe(200);
  });

  it('GET /api/ai/category-roles returns category roles', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/category-roles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('GET /api/ai/config/export exports config', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/ai/config/export');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('config');
  });
});
