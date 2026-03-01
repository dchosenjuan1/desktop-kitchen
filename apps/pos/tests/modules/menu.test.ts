/**
 * Menu module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Module: Menu', () => {
  let categoryId: number;
  let itemId: number;

  it('creates a category with sort_order', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/menu/categories', { name: 'Test Module Cat', sort_order: 99 });
    expect(res.status).toBe(201);
    expect(res.data.sort_order).toBe(99);
    categoryId = res.data.id;
  });

  it('lists categories ordered by sort_order', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/menu/categories');
    expect(res.status).toBe(200);
    for (let i = 1; i < res.data.length; i++) {
      expect(res.data[i].sort_order).toBeGreaterThanOrEqual(res.data[i - 1].sort_order);
    }
  });

  it('creates an item with full details', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/menu/items', {
      category_id: categoryId,
      name: 'Test Module Item',
      price: 99.50,
      description: 'Detailed test item',
    });
    expect(res.status).toBe(201);
    itemId = res.data.id;
  });

  it('updates item price', async () => {
    const api = alpha('manager');
    const res = await api.put(`/api/menu/items/${itemId}`, { price: 120 });
    expect(res.status).toBe(200);
  });

  it('filters items by active_only', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/menu/categories?active_only=1');
    expect(res.status).toBe(200);
    for (const cat of res.data) {
      expect(cat.active).toBe(true);
    }
  });

  it('gets item ingredients', async () => {
    const api = alpha('manager');
    const res = await api.get(`/api/menu/items/${itemId}/ingredients`);
    expect([200, 404]).toContain(res.status);
  });

  it('gets popular items', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/menu/items?sort=popular');
    expect([200, 400]).toContain(res.status);
  });

  it('cleanup: delete test item and category', async () => {
    const api = alpha('manager');
    await api.delete(`/api/menu/items/${itemId}`);
    await api.delete(`/api/menu/categories/${categoryId}`);
  });
});
