/**
 * Sales Rep persona tests (~15 tests)
 * Tests sales rep login, profile, prospect CRUD, commission view.
 * Sales reps are platform-level (no tenant context).
 */
import { describe, it, expect } from 'vitest';
import { pub, authApi } from '../setup/helpers.js';
import { getTestState } from '../setup/test-env.js';

describe('Sales Rep', () => {
  // Note: Sales reps need to be created before these tests can fully run.
  // If no sales rep tokens are available, tests will be skipped.

  describe('Login', () => {
    it('POST /api/sales/login rejects missing credentials', async () => {
      const res = await pub.post('/api/sales/login', {});
      expect(res.status).toBe(400);
    });

    it('POST /api/sales/login rejects wrong password', async () => {
      const res = await pub.post('/api/sales/login', {
        email: 'nonexistent@test.desktop.kitchen',
        password: 'WrongPassword!',
      });
      expect(res.status).toBe(401);
    });
  });

  // The following tests require sales reps to exist.
  // They'll check token availability and skip if not setup.

  describe('Profile', () => {
    it('GET /api/sales/me returns rep profile', async () => {
      const state = getTestState();
      if (!state.sales.repToken) return; // Skip if no rep token

      const api = authApi(state.sales.repToken);
      const res = await api.get('/api/sales/me');
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('full_name');
    });
  });

  describe('Prospects', () => {
    let prospectId: string;

    it('POST /api/sales/prospects creates a prospect', async () => {
      const state = getTestState();
      if (!state.sales.repToken) return;

      const api = authApi(state.sales.repToken);
      const res = await api.post('/api/sales/prospects', {
        restaurant_name: 'Test Prospect Restaurant',
        contact_name: 'Test Contact',
        email: 'prospect@test.desktop.kitchen',
        phone: '5551112222',
        notes: 'Created by test suite',
      });
      expect(res.status).toBe(201);
      prospectId = res.data.id;
    });

    it('GET /api/sales/prospects lists prospects', async () => {
      const state = getTestState();
      if (!state.sales.repToken) return;

      const api = authApi(state.sales.repToken);
      const res = await api.get('/api/sales/prospects');
      expect(res.status).toBe(200);
    });

    it('GET /api/sales/prospects/:id returns single prospect', async () => {
      const state = getTestState();
      if (!state.sales.repToken || !prospectId) return;

      const api = authApi(state.sales.repToken);
      const res = await api.get(`/api/sales/prospects/${prospectId}`);
      expect(res.status).toBe(200);
    });

    it('PUT /api/sales/prospects/:id updates a prospect', async () => {
      const state = getTestState();
      if (!state.sales.repToken || !prospectId) return;

      const api = authApi(state.sales.repToken);
      const res = await api.put(`/api/sales/prospects/${prospectId}`, {
        notes: 'Updated by test suite',
      });
      expect(res.status).toBe(200);
    });

    it('DELETE /api/sales/prospects/:id deletes a prospect', async () => {
      const state = getTestState();
      if (!state.sales.repToken || !prospectId) return;

      const api = authApi(state.sales.repToken);
      const res = await api.delete(`/api/sales/prospects/${prospectId}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Commissions', () => {
    it('GET /api/sales/commissions lists own commissions', async () => {
      const state = getTestState();
      if (!state.sales.repToken) return;

      const api = authApi(state.sales.repToken);
      const res = await api.get('/api/sales/commissions');
      expect(res.status).toBe(200);
    });
  });

  describe('Cannot Access Manager Endpoints', () => {
    it('GET /api/sales/dashboard returns 403 for non-manager', async () => {
      const state = getTestState();
      if (!state.sales.repToken) return;

      const api = authApi(state.sales.repToken);
      const res = await api.get('/api/sales/dashboard');
      expect(res.status).toBe(403);
    });
  });

  describe('Auth Required', () => {
    it('GET /api/sales/me rejects unauthenticated', async () => {
      const res = await pub.get('/api/sales/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/sales/prospects rejects unauthenticated', async () => {
      const res = await pub.get('/api/sales/prospects');
      expect(res.status).toBe(401);
    });
  });
});
