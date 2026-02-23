import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Shield, Users, DollarSign, ShoppingCart, Activity,
  Server, Cpu, HardDrive, Search, ChevronRight,
  RefreshCw, LogOut, X, TrendingUp, TrendingDown,
  Plus, Pencil, Sprout, KeyRound, Download, Trash2, Loader2,
} from 'lucide-react';
import {
  getOverview, getSignups, getRevenue, getChurn, getHealth, getActivity,
  getTenants, getTenantDeepDive, patchTenant, seedTenant, verifySecret,
  type OverviewData, type MonthlyData, type HealthData, type ActivityData,
  type TenantRecord, type DeepDiveData,
} from '../api/superAdmin';
import {
  CreateTenantModal, EditTenantModal, ResetPasswordModal, DeleteTenantModal,
  downloadTenantExport,
} from '../components/admin/TenantManagement';

const PLAN_COLORS: Record<string, string> = {
  trial: '#6b7280',
  starter: '#3b82f6',
  pro: '#0d9488',
};

const PIE_COLORS = ['#6b7280', '#3b82f6', '#0d9488'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

// ==================== Login Gate ====================

function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    sessionStorage.setItem('admin_secret', secret);
    const ok = await verifySecret();
    if (ok) {
      onAuth();
    } else {
      sessionStorage.removeItem('admin_secret');
      setError('Invalid admin secret');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-teal-500" size={28} />
          <h1 className="text-2xl font-black text-white">Super Admin</h1>
        </div>
        <p className="text-neutral-400 text-sm">Enter the admin secret to access the platform dashboard.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Admin Secret"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !secret}
          className="w-full py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

// ==================== KPI Card ====================

function KPICard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className="text-teal-500" />
        <span className="text-neutral-400 text-sm">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-neutral-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ==================== Tabs ====================

type TabId = 'overview' | 'tenants' | 'revenue' | 'health';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'health', label: 'Health' },
];

// ==================== Overview Tab ====================

function OverviewTab() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [signups, setSignups] = useState<MonthlyData[]>([]);
  const [churn, setChurn] = useState<MonthlyData[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getOverview(), getSignups(), getChurn(), getActivity()])
      .then(([o, s, c, a]) => { setOverview(o); setSignups(s); setChurn(c); setActivity(a); })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !overview) {
    return <div className="text-neutral-400 text-center py-12">Loading overview...</div>;
  }

  const pieData = [
    { name: 'Trial', value: overview.plan_breakdown.trial },
    { name: 'Starter', value: overview.plan_breakdown.starter },
    { name: 'Pro', value: overview.plan_breakdown.pro },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Total Tenants" value={overview.total_tenants} sub={`${overview.active_tenants} active`} />
        <KPICard icon={DollarSign} label="MRR" value={formatCurrency(overview.mrr)} />
        <KPICard icon={ShoppingCart} label="Total Orders" value={overview.total_orders.toLocaleString()} />
        <KPICard icon={Activity} label="Platform Revenue" value={formatCurrency(overview.total_revenue)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Signup Trend */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">Monthly Signups</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={signups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" tick={{ fill: '#999', fontSize: 11 }} />
              <YAxis tick={{ fill: '#999', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
              <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Churn */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">Monthly Churn</h3>
          {churn.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-neutral-500 text-sm">No cancellations recorded</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={churn}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="month" tick={{ fill: '#999', fontSize: 11 }} />
                <YAxis tick={{ fill: '#999', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Activity */}
      {activity && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityList title="Most Active (30d)" icon={TrendingUp} tenants={activity.most_active} />
          <ActivityList title="Least Active (30d)" icon={TrendingDown} tenants={activity.least_active} />
        </div>
      )}
    </div>
  );
}

function ActivityList({ title, icon: Icon, tenants }: { title: string; icon: any; tenants: any[] }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-teal-500" />
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <div className="space-y-2">
        {tenants.map(t => (
          <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-neutral-800 last:border-0">
            <div>
              <span className="text-white text-sm">{t.name}</span>
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${PLAN_COLORS[t.plan] ? '' : ''}`}
                style={{ backgroundColor: `${PLAN_COLORS[t.plan]}20`, color: PLAN_COLORS[t.plan] }}>
                {t.plan}
              </span>
            </div>
            <span className="text-neutral-400 text-sm">{t.order_count} orders</span>
          </div>
        ))}
        {tenants.length === 0 && <p className="text-neutral-500 text-sm">No data</p>}
      </div>
    </div>
  );
}

// ==================== Tenants Tab ====================

function TenantsTab() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deepDive, setDeepDive] = useState<DeepDiveData | null>(null);
  const [ddLoading, setDdLoading] = useState(false);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantRecord | null>(null);
  const [resetPwTenant, setResetPwTenant] = useState<TenantRecord | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<TenantRecord | null>(null);
  const [seedingId, setSeedingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTenants({ search: search || undefined, plan: planFilter || undefined });
      setTenants(data);
    } catch {}
    setLoading(false);
  }, [search, planFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const openDeepDive = async (id: string) => {
    setSelectedId(id);
    setDdLoading(true);
    try {
      setDeepDive(await getTenantDeepDive(id));
    } catch {}
    setDdLoading(false);
  };

  const [actionError, setActionError] = useState('');

  const handlePlanChange = async (id: string, plan: string) => {
    setActionError('');
    try {
      await patchTenant(id, { plan });
      fetchTenants();
      if (selectedId === id && deepDive) {
        setDeepDive({ ...deepDive, tenant: { ...deepDive.tenant, plan } });
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update plan');
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    setActionError('');
    try {
      await patchTenant(id, { active: !active });
      fetchTenants();
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle status');
    }
  };

  const handleSeed = async (id: string) => {
    if (!confirm(`Seed demo data for tenant "${id}"?`)) return;
    setSeedingId(id);
    try {
      await seedTenant(id);
      fetchTenants();
      if (selectedId === id) openDeepDive(id);
    } catch {}
    setSeedingId(null);
  };

  const handleExport = async (id: string, name: string) => {
    setExportingId(id);
    try {
      await downloadTenantExport(id, name);
    } catch {}
    setExportingId(null);
  };

  // Find tenant record for deep-dive actions
  const ddTenant = deepDive?.tenant ?? tenants.find(t => t.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-200 ml-3">
            <X size={16} />
          </button>
        </div>
      )}
      {/* Filters + Create button */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tenants..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-teal-500 text-sm"
          />
        </div>
        <select
          value={planFilter}
          onChange={e => setPlanFilter(e.target.value)}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="">All plans</option>
          <option value="trial">Trial</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-semibold transition-colors"
        >
          <Plus size={16} /> Create Tenant
        </button>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="text-neutral-400 text-center py-8">Loading tenants...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="text-left text-neutral-400 font-medium px-4 py-3">Name</th>
                    <th className="text-left text-neutral-400 font-medium px-4 py-3">Plan</th>
                    <th className="text-left text-neutral-400 font-medium px-4 py-3">Status</th>
                    <th className="text-right text-neutral-400 font-medium px-4 py-3">Orders</th>
                    <th className="text-right text-neutral-400 font-medium px-4 py-3">Employees</th>
                    <th className="text-center text-neutral-400 font-medium px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr
                      key={t.id}
                      onClick={() => openDeepDive(t.id)}
                      className={`border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer transition-colors ${selectedId === t.id ? 'bg-neutral-800/70' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{t.name}</div>
                        <div className="text-neutral-500 text-xs">{t.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={t.plan}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); handlePlanChange(t.id, e.target.value); }}
                          className="bg-neutral-700 border-none rounded px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          <option value="trial">Trial</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {t.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-300">{t.order_count}</td>
                      <td className="px-4 py-3 text-right text-neutral-300">{t.employee_count}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleSeed(t.id)}
                            disabled={seedingId === t.id}
                            title="Seed demo data"
                            className="p-1.5 rounded text-neutral-400 hover:text-teal-400 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                          >
                            {seedingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Sprout size={14} />}
                          </button>
                          <button
                            onClick={() => setEditingTenant(t)}
                            title="Edit"
                            className="p-1.5 rounded text-neutral-400 hover:text-teal-400 hover:bg-neutral-800 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(t.id, t.active)}
                            className={`text-xs px-2 py-1 rounded ${t.active ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'} transition-colors`}
                          >
                            {t.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tenants.length === 0 && (
                <div className="text-neutral-500 text-center py-8">No tenants found</div>
              )}
            </div>
          )}
        </div>

        {/* Deep Dive Panel */}
        {selectedId && (
          <div className="w-80 bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Tenant Details</h3>
              <button onClick={() => { setSelectedId(null); setDeepDive(null); }} className="text-neutral-500 hover:text-neutral-300">
                <X size={18} />
              </button>
            </div>
            {ddLoading || !deepDive ? (
              <div className="text-neutral-400 text-sm">Loading...</div>
            ) : (
              <>
                <div>
                  <p className="text-white font-medium">{deepDive.tenant.name}</p>
                  <p className="text-neutral-500 text-xs">{deepDive.tenant.owner_email}</p>
                  <p className="text-neutral-500 text-xs mt-1">Joined {new Date(deepDive.tenant.created_at).toLocaleDateString()}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Orders (all)" value={deepDive.stats.total_orders} />
                  <Stat label="Revenue (all)" value={formatCurrency(deepDive.stats.total_revenue)} />
                  <Stat label="Orders (30d)" value={deepDive.stats.orders_30d} />
                  <Stat label="Revenue (30d)" value={formatCurrency(deepDive.stats.revenue_30d)} />
                  <Stat label="Employees" value={deepDive.stats.employee_count} />
                  <Stat label="Menu Items" value={deepDive.stats.menu_item_count} />
                  <Stat label="Categories" value={deepDive.stats.category_count} />
                  <Stat label="Customers" value={deepDive.stats.customer_count} />
                </div>
                {deepDive.stats.last_order_at && (
                  <p className="text-neutral-500 text-xs">Last order: {new Date(deepDive.stats.last_order_at).toLocaleString()}</p>
                )}

                {/* Actions */}
                <div className="border-t border-neutral-800 pt-4 space-y-2">
                  <p className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-2">Actions</p>
                  {ddTenant && (
                    <>
                      <ActionButton icon={Pencil} label="Edit Details" onClick={() => setEditingTenant(ddTenant)} />
                      <ActionButton icon={Sprout} label="Seed Demo Data" loading={seedingId === selectedId} onClick={() => handleSeed(selectedId!)} />
                      <ActionButton icon={KeyRound} label="Reset Password" onClick={() => setResetPwTenant(ddTenant)} />
                      <ActionButton icon={Download} label="Export Data" loading={exportingId === selectedId} onClick={() => handleExport(selectedId!, deepDive.tenant.name)} />
                      <ActionButton icon={Trash2} label="Delete Tenant" variant="danger" onClick={() => setDeletingTenant(ddTenant)} />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateTenantModal onClose={() => setShowCreate(false)} onSuccess={fetchTenants} />
      )}
      {editingTenant && (
        <EditTenantModal tenant={editingTenant} onClose={() => setEditingTenant(null)} onSuccess={() => { fetchTenants(); if (selectedId) openDeepDive(selectedId); }} />
      )}
      {resetPwTenant && (
        <ResetPasswordModal tenant={resetPwTenant} onClose={() => setResetPwTenant(null)} />
      )}
      {deletingTenant && (
        <DeleteTenantModal tenant={deletingTenant} onClose={() => setDeletingTenant(null)} onSuccess={() => { fetchTenants(); setSelectedId(null); setDeepDive(null); }} />
      )}
    </div>
  );
}

function ActionButton({ icon: Icon, label, variant, loading, onClick }: {
  icon: any; label: string; variant?: 'danger'; loading?: boolean; onClick: () => void;
}) {
  const colors = variant === 'danger'
    ? 'text-red-400 hover:bg-red-900/30'
    : 'text-neutral-300 hover:bg-neutral-800';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${colors}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-neutral-800 rounded p-2.5">
      <p className="text-neutral-500 text-xs">{label}</p>
      <p className="text-white text-sm font-semibold">{value}</p>
    </div>
  );
}

// ==================== Revenue Tab ====================

function RevenueTab() {
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRevenue(12).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-neutral-400 text-center py-12">Loading revenue data...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <h3 className="text-white font-semibold mb-4">Monthly Revenue & Orders</h3>
        {data.length === 0 ? (
          <div className="text-neutral-500 text-center py-8">No revenue data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" tick={{ fill: '#999', fontSize: 11 }} />
              <YAxis yAxisId="rev" orientation="left" tick={{ fill: '#999', fontSize: 11 }} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fill: '#999', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
              <Legend />
              <Bar yAxisId="rev" dataKey="revenue" name="Revenue ($)" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="orders" dataKey="order_count" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ==================== Health Tab ====================

function HealthTab() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 30000);
    return () => clearInterval(iv);
  }, [refresh]);

  if (loading && !health) return <div className="text-neutral-400 text-center py-12">Loading health data...</div>;
  if (!health) return null;

  const memPct = Math.round((health.memory.heap_used_mb / health.memory.heap_total_mb) * 100);
  const osPct = Math.round(((health.os.total_mem_mb - health.os.free_mem_mb) / health.os.total_mem_mb) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={refresh} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Uptime" value={formatUptime(health.uptime_seconds)} />
        <KPICard icon={Server} label="Node" value={health.node_version} sub={health.platform} />
        <KPICard icon={Cpu} label="CPUs" value={health.os.cpus} />
        <KPICard icon={HardDrive} label="Postgres" value={health.postgres_version.split(' ').slice(0, 2).join(' ')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">Heap Memory</h3>
          <GaugeBar pct={memPct} label={`${health.memory.heap_used_mb} / ${health.memory.heap_total_mb} MB`} />
          <p className="text-neutral-500 text-xs mt-2">RSS: {health.memory.rss_mb} MB</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">OS Memory</h3>
          <GaugeBar pct={osPct} label={`${health.os.total_mem_mb - health.os.free_mem_mb} / ${health.os.total_mem_mb} MB`} />
        </div>
      </div>
    </div>
  );
}

function GaugeBar({ pct, label }: { pct: number; label: string }) {
  const color = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#0d9488';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-neutral-800 rounded-full h-3">
        <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ==================== Main Dashboard ====================

export default function SuperAdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');

  // Check if already authed from session
  useEffect(() => {
    if (sessionStorage.getItem('admin_secret')) {
      verifySecret().then(ok => setAuthed(ok));
    }
  }, []);

  if (!authed) {
    return <LoginGate onAuth={() => setAuthed(true)} />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_secret');
    setAuthed(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-teal-500" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">Desktop Kitchen</h1>
            <span className="text-neutral-500 text-sm font-medium">Super Admin</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex gap-1 px-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-teal-400 border-teal-500'
                  : 'text-neutral-400 border-transparent hover:text-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'tenants' && <TenantsTab />}
        {tab === 'revenue' && <RevenueTab />}
        {tab === 'health' && <HealthTab />}
      </div>
    </div>
  );
}
