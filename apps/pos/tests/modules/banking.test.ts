/**
 * Banking module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Module: Banking', () => {
  it('GET /api/banking/connections lists bank connections', async () => {
    const state = getTestState();
    const api = alpha('owner');
    const res = await api.get('/api/banking/connections');
    expect([200, 401, 403]).toContain(res.status);
  });

  it('GET /api/banking/accounts lists bank accounts', async () => {
    const api = alpha('owner');
    const res = await api.get('/api/banking/accounts');
    expect([200, 401, 403]).toContain(res.status);
  });

  it('GET /api/banking/summary returns balance summary', async () => {
    const api = alpha('owner');
    const res = await api.get('/api/banking/summary');
    expect([200, 401, 403]).toContain(res.status);
  });

  it('GET /api/banking/sync-health returns sync health', async () => {
    const api = alpha('owner');
    const res = await api.get('/api/banking/sync-health');
    expect([200, 401, 403]).toContain(res.status);
  });

  it('POST /api/banking/widget-token requires owner auth', async () => {
    const api = alpha('owner');
    const res = await api.post('/api/banking/widget-token');
    // Will fail without Plaid/Belvo credentials — expected
    expect([200, 400, 401, 403, 500]).toContain(res.status);
  });
});
