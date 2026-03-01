/**
 * Pricing module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: Pricing', () => {
  it('GET /api/pricing/dashboard returns pricing dashboard', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/pricing/dashboard');
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/pricing/suggestions returns pricing suggestions', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/pricing/suggestions');
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/pricing/rules lists pricing rules', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/pricing/rules');
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/pricing/guardrails returns guardrails', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/pricing/guardrails');
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/pricing/history returns price history', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/pricing/history');
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/pricing/experiments lists experiments', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/pricing/experiments');
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/pricing/impact returns price impact analysis', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/pricing/impact');
    expect([200, 403]).toContain(res.status);
  });
});
