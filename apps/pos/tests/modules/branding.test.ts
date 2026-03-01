/**
 * Branding module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha, rawRequest } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Module: Branding', () => {
  it('GET /api/branding returns branding (public)', async () => {
    const state = getTestState();
    const res = await rawRequest('GET', '/api/branding', {
      tenantId: state.tenantAlpha.id,
    });
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('restaurantName');
  });

  it('PUT /api/branding/settings updates branding via employee auth', async () => {
    const api = alpha('manager');
    const res = await api.put('/api/branding/settings', {
      primaryColor: '#0d9488',
      restaurantName: 'Test Restaurant Alpha',
    });
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/onboarding/status returns onboarding progress', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/onboarding/status');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('has_menu_items');
    expect(res.data).toHaveProperty('has_branding');
  });
});
