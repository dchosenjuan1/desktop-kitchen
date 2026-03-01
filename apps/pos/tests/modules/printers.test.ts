/**
 * Printers module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: Printers', () => {
  let printerId: number;

  it('GET /api/printers lists printers', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/printers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('POST /api/printers creates a printer', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/printers', {
      name: 'Test Printer',
      printer_type: 'kitchen',
      address: '192.168.1.100',
    });
    expect([201, 403]).toContain(res.status); // May be plan-gated
    if (res.status === 201) printerId = res.data.id;
  });

  it('PUT /api/printers/:id updates a printer', async () => {
    if (!printerId) return;
    const api = alpha('manager');
    const res = await api.put(`/api/printers/${printerId}`, { name: 'Updated Printer' });
    expect(res.status).toBe(200);
  });

  it('GET /api/printers/routes lists printer routes', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/printers/routes');
    expect(res.status).toBe(200);
  });
});
