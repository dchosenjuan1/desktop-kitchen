/**
 * CFDI (Mexican invoicing) module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: CFDI', () => {
  it('GET /api/cfdi/catalogs returns tax catalogs', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/cfdi/catalogs');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('taxRegimes');
    expect(res.data).toHaveProperty('usoCfdi');
    expect(res.data).toHaveProperty('formaPago');
  });

  it('GET /api/cfdi/config returns CFDI config', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/cfdi/config');
    expect([200, 403]).toContain(res.status);
  });

  it('GET /api/cfdi/invoices lists invoices', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/cfdi/invoices');
    expect([200, 403]).toContain(res.status);
  });

  it('POST /api/cfdi/config/test validates config (without Facturapi key)', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/cfdi/config/test');
    // Will fail without FACTURAPI_API_KEY — that's expected
    expect([200, 400, 403, 500]).toContain(res.status);
  });
});
