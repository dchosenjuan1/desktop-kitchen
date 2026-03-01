/**
 * Test helpers — request builders, auth helpers, assertion utilities.
 */
import { getTestState } from './test-env.js';

// ==================== Request Builders ====================

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  tenantId?: string;
}

/**
 * Make an HTTP request to the test server.
 */
async function request(method: Method, path: string, opts: RequestOptions = {}) {
  const state = getTestState();
  const url = `${state.baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...opts.headers,
  };

  if (opts.token) {
    headers['Authorization'] = `Bearer ${opts.token}`;
  }

  if (opts.tenantId) {
    headers['X-Tenant-ID'] = opts.tenantId;
    headers['X-Admin-Secret'] = state.adminSecret;
  }

  const fetchOpts: RequestInit = { method, headers };
  if (opts.body && method !== 'GET') {
    fetchOpts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, fetchOpts);
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data, headers: res.headers };
}

// ==================== Convenience Methods ====================

/** Admin API — sends X-Admin-Secret header */
export const admin = {
  get: (path: string, opts?: RequestOptions) =>
    request('GET', path, { ...opts, headers: { 'X-Admin-Secret': getTestState().adminSecret, ...opts?.headers } }),
  post: (path: string, body?: unknown, opts?: RequestOptions) =>
    request('POST', path, { body, ...opts, headers: { 'X-Admin-Secret': getTestState().adminSecret, ...opts?.headers } }),
  patch: (path: string, body?: unknown, opts?: RequestOptions) =>
    request('PATCH', path, { body, ...opts, headers: { 'X-Admin-Secret': getTestState().adminSecret, ...opts?.headers } }),
  delete: (path: string, body?: unknown, opts?: RequestOptions) =>
    request('DELETE', path, { body, ...opts, headers: { 'X-Admin-Secret': getTestState().adminSecret, ...opts?.headers } }),
};

/** Tenant-scoped API — sends X-Tenant-ID + auth token */
export function tenantApi(tenantId: string, token: string) {
  const base = (opts?: RequestOptions): RequestOptions => ({
    ...opts,
    token,
    tenantId,
  });

  return {
    get: (path: string, opts?: RequestOptions) => request('GET', path, base(opts)),
    post: (path: string, body?: unknown, opts?: RequestOptions) => request('POST', path, { ...base(opts), body }),
    put: (path: string, body?: unknown, opts?: RequestOptions) => request('PUT', path, { ...base(opts), body }),
    patch: (path: string, body?: unknown, opts?: RequestOptions) => request('PATCH', path, { ...base(opts), body }),
    delete: (path: string, body?: unknown, opts?: RequestOptions) => request('DELETE', path, { ...base(opts), body }),
  };
}

/** Public API — no auth, no tenant */
export const pub = {
  get: (path: string, opts?: RequestOptions) => request('GET', path, opts),
  post: (path: string, body?: unknown, opts?: RequestOptions) => request('POST', path, { ...opts, body }),
};

/** Authenticated request with just a token (no tenant header — for owner/sales routes) */
export function authApi(token: string) {
  return {
    get: (path: string, opts?: RequestOptions) => request('GET', path, { ...opts, token }),
    post: (path: string, body?: unknown, opts?: RequestOptions) => request('POST', path, { ...opts, body, token }),
    put: (path: string, body?: unknown, opts?: RequestOptions) => request('PUT', path, { ...opts, body, token }),
    patch: (path: string, body?: unknown, opts?: RequestOptions) => request('PATCH', path, { ...opts, body, token }),
    delete: (path: string, body?: unknown, opts?: RequestOptions) => request('DELETE', path, { ...opts, body, token }),
  };
}

/** Raw request — full control */
export { request as rawRequest };

// ==================== Assertion Helpers ====================

export function expectStatus(res: { status: number }, expected: number) {
  if (res.status !== expected) {
    throw new Error(
      `Expected status ${expected}, got ${res.status}. Body: ${JSON.stringify(res.data).slice(0, 500)}`
    );
  }
}

export function expectError(res: { status: number; data: any }, status: number, messageContains?: string) {
  expectStatus(res, status);
  if (messageContains && typeof res.data?.error === 'string') {
    if (!res.data.error.toLowerCase().includes(messageContains.toLowerCase())) {
      throw new Error(
        `Expected error to contain "${messageContains}", got "${res.data.error}"`
      );
    }
  }
}

// ==================== Alpha/Beta Tenant Shortcuts ====================

/** Get a tenant API client for tenant alpha with the given role */
export function alpha(role: 'manager' | 'cashier' | 'kitchen' | 'owner') {
  const state = getTestState();
  const tid = state.tenantAlpha.id;
  if (role === 'owner') {
    // Owner routes don't use tenant middleware — they use ownerAuth
    return authApi(state.tenantAlpha.ownerToken);
  }
  const tokenKey = `${role}Token` as keyof typeof state.tenantAlpha;
  return tenantApi(tid, state.tenantAlpha[tokenKey] as string);
}

/** Get a tenant API client for tenant beta with manager role */
export function beta(role: 'manager' | 'owner' = 'manager') {
  const state = getTestState();
  const tid = state.tenantBeta.id;
  if (role === 'owner') {
    return authApi(state.tenantBeta.ownerToken);
  }
  return tenantApi(tid, state.tenantBeta.managerToken);
}
