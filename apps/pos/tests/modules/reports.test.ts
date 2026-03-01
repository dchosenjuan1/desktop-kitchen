/**
 * Reports module deep tests
 */
import { describe, it, expect } from 'vitest';
import { alpha } from '../setup/helpers.js';

describe('Module: Reports', () => {
  it('GET /api/reports/sales returns sales report', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/sales?period=today');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/top-items returns popular items', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/top-items?period=today');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/employee-performance returns staff stats', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/employee-performance');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/hourly returns hourly breakdown', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/hourly');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/cash-card-breakdown returns payment breakdown', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/cash-card-breakdown');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/cogs-summary returns cost of goods', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/cogs-summary');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/cogs returns item-level COGS', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/cogs');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/category-margins returns margin data', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/category-margins');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/contribution-margin returns contribution data', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/contribution-margin');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/live returns live dashboard', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/live');
    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty('kpis');
  });

  it('GET /api/reports/delivery-margins returns delivery P&L', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/delivery-margins');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/channel-comparison returns channel data', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/channel-comparison');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/reconciliation returns reconciliation', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/reconciliation');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/refund-summary returns refund data', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/refund-summary');
    expect(res.status).toBe(200);
  });

  it('GET /api/reports/financial-projection returns projections', async () => {
    const api = alpha('manager');
    const res = await api.get('/api/reports/financial-projection');
    expect(res.status).toBe(200);
  });
});
