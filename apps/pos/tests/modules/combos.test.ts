/**
 * Combos module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Module: Combos', () => {
  let comboId: number;

  it('creates a combo', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/combos', {
      name: 'Test Combo Module',
      description: 'Module test combo',
      combo_price: 130,
    });
    expect(res.status).toBe(201);
    comboId = res.data.id;
  });

  it('gets combo by ID', async () => {
    const api = alpha('manager');
    const res = await api.get(`/api/combos/${comboId}`);
    expect(res.status).toBe(200);
    expect(res.data.name).toBe('Test Combo Module');
  });

  it('updates combo', async () => {
    const api = alpha('manager');
    const res = await api.put(`/api/combos/${comboId}`, {
      combo_price: 150,
      description: 'Updated description',
    });
    expect(res.status).toBe(200);
  });

  it('lists all combos with slots', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/combos');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
    const found = res.data.find((c: any) => c.id === comboId);
    expect(found).toBeDefined();
  });

  it('deactivates combo', async () => {
    // No DELETE endpoint exists for combos; deactivate via PUT instead
    const api = alpha('manager');
    const res = await api.put(`/api/combos/${comboId}`, { active: false });
    expect(res.status).toBe(200);
  });
});
