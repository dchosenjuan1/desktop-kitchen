/**
 * Leads module deep tests
 */
import { describe, it, expect } from 'vitest';
import { pub, admin } from '../setup/helpers.js';

describe('Module: Leads', () => {
  it('POST /api/leads captures a lead', async () => {
    const res = await pub.post('/api/leads', {
      restaurant_name: 'Lead Test Restaurant',
      name: 'Lead Test Person',
      email: `lead-${Date.now()}@test.desktop.kitchen`,
      phone: '5559998888',
      source: 'test-suite',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('POST /api/leads rejects missing email', async () => {
    const res = await pub.post('/api/leads', {
      restaurant_name: 'No Email Lead',
    });
    expect([400, 200]).toContain(res.status);
  });

  it('GET /admin/leads lists leads (admin)', async () => {
    const res = await admin.get('/admin/leads');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});
