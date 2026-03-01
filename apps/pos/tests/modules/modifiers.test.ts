/**
 * Modifiers module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Module: Modifiers', () => {
  let groupId: number;
  let modifierId: number;

  it('creates a modifier group with all fields', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/modifiers/groups', {
      name: 'Test Mod Group',
      selection_type: 'multi',
      required: true,
      min_selections: 1,
      max_selections: 3,
    });
    expect(res.status).toBe(201);
    groupId = res.data.id;
  });

  it('creates a modifier in the group', async () => {
    const api = alpha('manager');
    const res = await api.post('/api/modifiers', {
      group_id: groupId,
      name: 'Test Modifier',
      price_adjustment: 25,
    });
    expect(res.status).toBe(201);
    modifierId = res.data.id;
  });

  it('updates modifier price', async () => {
    const api = alpha('manager');
    const res = await api.put(`/api/modifiers/${modifierId}`, { price_adjustment: 30 });
    expect(res.status).toBe(200);
  });

  it('assigns group to a menu item', async () => {
    const state = getTestState();
    const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
    const api = alpha('manager');
    const res = await api.post('/api/modifiers/assign', {
      menu_item_id: itemId,
      modifier_group_id: groupId,
    });
    expect([200, 201]).toContain(res.status);
  });

  it('gets modifier groups for a specific item', async () => {
    const state = getTestState();
    const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
    const api = alpha('manager');
    const res = await api.get(`/api/modifiers/groups/item/${itemId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('gets items with modifiers', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/modifiers/items-with-modifiers');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('itemIds');
  });

  it('unassigns group from menu item', async () => {
    const state = getTestState();
    const itemId = Object.values(state.tenantAlpha.menuItemIds)[0];
    const api = alpha('manager');
    const res = await api.post('/api/modifiers/unassign', {
      menu_item_id: itemId,
      modifier_group_id: groupId,
    });
    expect(res.status).toBe(200);
  });

  it('cleanup: deactivate modifier and group', async () => {
    // No DELETE endpoints exist for modifiers; deactivate via PUT instead
    const api = alpha('manager');
    const modRes = await api.put(`/api/modifiers/${modifierId}`, { active: false });
    expect(modRes.status).toBe(200);
    const groupRes = await api.put(`/api/modifiers/groups/${groupId}`, { active: false });
    expect(groupRes.status).toBe(200);
  });
});
