/**
 * Super-Admin API client.
 * All requests use x-admin-secret from sessionStorage for auth.
 */

const API_BASE = '/admin';

function getSecret(): string {
  return sessionStorage.getItem('admin_secret') || '';
}

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-secret': getSecret(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let msg = `API Error: ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ==================== Analytics ====================

export interface OverviewData {
  total_tenants: number;
  active_tenants: number;
  plan_breakdown: { trial: number; starter: number; pro: number; ghost_kitchen: number };
  mrr: number;
  total_orders: number;
  total_revenue: number;
}

export interface MonthlyData {
  month: string;
  count?: number;
  order_count?: number;
  revenue?: number;
}

export interface HealthData {
  uptime_seconds: number;
  node_version: string;
  platform: string;
  memory: { rss_mb: number; heap_used_mb: number; heap_total_mb: number };
  os: { total_mem_mb: number; free_mem_mb: number; cpus: number };
  postgres_version: string;
}

export interface ActivityData {
  most_active: TenantActivity[];
  least_active: TenantActivity[];
}

export interface TenantActivity {
  id: string;
  name: string;
  plan: string;
  order_count: number;
  revenue: number;
}

export interface TenantRecord {
  id: string;
  name: string;
  subdomain: string;
  owner_email: string;
  plan: string;
  active: boolean;
  subscription_status: string | null;
  created_at: string;
  order_count: number;
  employee_count: number;
  [key: string]: any;
}

export interface DeepDiveData {
  tenant: TenantRecord;
  stats: {
    total_orders: number;
    total_revenue: number;
    orders_30d: number;
    revenue_30d: number;
    employee_count: number;
    menu_item_count: number;
    category_count: number;
    customer_count: number;
    last_order_at: string | null;
  };
}

export function getOverview() {
  return adminRequest<OverviewData>('/analytics/overview');
}

export function getSignups(months = 12) {
  return adminRequest<MonthlyData[]>(`/analytics/signups?months=${months}`);
}

export function getRevenue(months = 12) {
  return adminRequest<MonthlyData[]>(`/analytics/revenue?months=${months}`);
}

export function getChurn(months = 12) {
  return adminRequest<MonthlyData[]>(`/analytics/churn?months=${months}`);
}

export function getHealth() {
  return adminRequest<HealthData>('/analytics/health');
}

export function getActivity() {
  return adminRequest<ActivityData>('/analytics/activity');
}

// ==================== Tenants ====================

export function getTenants(params?: { search?: string; plan?: string; status?: string; sort?: string; order?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.plan) qs.set('plan', params.plan);
  if (params?.status) qs.set('status', params.status);
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.order) qs.set('order', params.order);
  const s = qs.toString();
  return adminRequest<TenantRecord[]>(`/tenants${s ? `?${s}` : ''}`);
}

export function getTenantDeepDive(id: string) {
  return adminRequest<DeepDiveData>(`/tenants/${id}/deep-dive`);
}

export function patchTenant(id: string, data: Record<string, any>) {
  return adminRequest<TenantRecord>(`/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ==================== Tenant Management ====================

export interface CreateTenantPayload {
  id: string;
  name: string;
  owner_email: string;
  owner_password: string;
  subdomain?: string;
  plan?: string;
  branding_json?: { primaryColor?: string };
}

export interface CreateTenantResponse extends TenantRecord {
  pin: string;
}

export function createTenant(data: CreateTenantPayload) {
  return adminRequest<CreateTenantResponse>('/tenants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function seedTenant(id: string) {
  return adminRequest<{ message: string }>(`/tenants/${id}/seed`, {
    method: 'POST',
  });
}

export function resetTenantPassword(id: string, new_password: string) {
  return adminRequest<{ message: string }>(`/tenants/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ new_password }),
  });
}

export async function exportTenantData(id: string): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE}/tenants/${id}/export`, {
    headers: {
      'x-admin-secret': getSecret(),
    },
  });
  if (!res.ok) {
    let msg = `API Error: ${res.status}`;
    try { const data = await res.json(); msg = data.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function deleteTenant(id: string, confirm: string) {
  return adminRequest<{ message: string }>(`/tenants/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirm }),
  });
}

// ==================== Employee PIN Management ====================

export interface TenantEmployee {
  id: number;
  name: string;
  role: string;
  active: boolean;
  created_at: string;
}

export function getTenantEmployees(tenantId: string) {
  return adminRequest<TenantEmployee[]>(`/tenants/${tenantId}/employees`);
}

export function updateEmployeePin(tenantId: string, empId: number, pin: string) {
  return adminRequest<{ message: string }>(`/tenants/${tenantId}/employees/${empId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ pin }),
  });
}

/**
 * Verify admin secret by making a lightweight request.
 * Returns true if valid, false otherwise.
 */
export async function verifySecret(): Promise<boolean> {
  try {
    await adminRequest('/analytics/health');
    return true;
  } catch {
    return false;
  }
}

// ==================== Demo Data / Stress Test ====================

export interface DemoDataConfig {
  tenant_id: string;
  volume?: 'low' | 'medium' | 'high';
  date_range_days?: number;
  include_delivery?: boolean;
  include_loyalty?: boolean;
  include_ai?: boolean;
  include_financials?: boolean;
}

export interface DemoDataSummary {
  orders: number;
  order_items: number;
  order_item_modifiers: number;
  order_payments: number;
  delivery_orders: number;
  loyalty_customers: number;
  stamp_cards: number;
  stamp_events: number;
  referral_events: number;
  ai_hourly_snapshots: number;
  ai_item_pairs: number;
  ai_inventory_velocity: number;
  financial_actuals: number;
}

export interface DemoRun {
  id: string;
  config: Record<string, any>;
  summary: DemoDataSummary | null;
  created_at: string;
}

export interface DemoStatus {
  hasDemo: boolean;
  runs: DemoRun[];
  counts: {
    orders: number;
    customers: number;
    delivery_orders: number;
    ai_snapshots: number;
    financial_actuals: number;
  };
}

export function generateDemoData(config: DemoDataConfig) {
  return adminRequest<{ run_id: string; summary: DemoDataSummary }>('/stress-test/generate', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export function getDemoStatus(tenantId: string) {
  return adminRequest<DemoStatus>(`/stress-test/status/${tenantId}`);
}

export function deleteDemoData(tenantId: string) {
  return adminRequest<{ deleted: Record<string, number> }>(`/stress-test/${tenantId}`, {
    method: 'DELETE',
  });
}
