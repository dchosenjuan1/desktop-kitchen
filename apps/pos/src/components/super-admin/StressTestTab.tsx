import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Play, Database, AlertTriangle } from 'lucide-react';
import { getTenants, type TenantRecord } from '../../api/superAdmin';
import { generateDemoData, getDemoStatus, deleteDemoData, type DemoStatus } from '../../api/superAdmin';

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-neutral-800 rounded-lg px-3 py-2">
      <p className="text-neutral-500 text-xs">{label}</p>
      <p className="text-white text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function StressTestTab() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Status
  const [status, setStatus] = useState<DemoStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Config
  const [volume, setVolume] = useState<'low' | 'medium' | 'high'>('medium');
  const [dateRange, setDateRange] = useState(30);
  const [includeDelivery, setIncludeDelivery] = useState(true);
  const [includeLoyalty, setIncludeLoyalty] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);
  const [includeFinancials, setIncludeFinancials] = useState(true);

  // Actions
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    getTenants().then(data => {
      setTenants(data);
      setTenantsLoading(false);
    }).catch(() => setTenantsLoading(false));
  }, []);

  const fetchStatus = useCallback(async (tenantId: string) => {
    if (!tenantId) return;
    setStatusLoading(true);
    setError('');
    try {
      setStatus(await getDemoStatus(tenantId));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch status');
    }
    setStatusLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchStatus(selectedTenant);
    } else {
      setStatus(null);
    }
  }, [selectedTenant, fetchStatus]);

  const handleGenerate = async () => {
    setError('');
    setSuccessMsg('');
    setGenerating(true);
    try {
      const result = await generateDemoData({
        tenant_id: selectedTenant,
        volume,
        date_range_days: dateRange,
        include_delivery: includeDelivery,
        include_loyalty: includeLoyalty,
        include_ai: includeAi,
        include_financials: includeFinancials,
      });
      setSuccessMsg(`Generated ${result.summary.orders} orders and related data.`);
      await fetchStatus(selectedTenant);
    } catch (err: any) {
      setError(err.message || 'Failed to generate demo data');
    }
    setGenerating(false);
  };

  const handleDelete = async () => {
    if (confirmDelete !== selectedTenant) return;
    setError('');
    setSuccessMsg('');
    setDeleting(true);
    try {
      const result = await deleteDemoData(selectedTenant);
      setSuccessMsg(`Deleted ${result.deleted.orders || 0} demo orders and all related data.`);
      setShowDeleteConfirm(false);
      setConfirmDelete('');
      await fetchStatus(selectedTenant);
    } catch (err: any) {
      setError(err.message || 'Failed to delete demo data');
    }
    setDeleting(false);
  };

  const volumeOptions: { value: 'low' | 'medium' | 'high'; label: string; count: number }[] = [
    { value: 'low', label: 'Low', count: 50 },
    { value: 'medium', label: 'Medium', count: 150 },
    { value: 'high', label: 'High', count: 300 },
  ];

  const dateRangeOptions = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
  ];

  return (
    <div className="space-y-6">
      {/* Tenant Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <label className="block text-neutral-400 text-sm font-medium mb-2">Select Tenant</label>
        {tenantsLoading ? (
          <p className="text-neutral-500 text-sm">Loading tenants...</p>
        ) : (
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="">Select a tenant to generate or manage demo data</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
            ))}
          </select>
        )}
      </div>

      {/* Error / Success */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-teal-900/50 border border-teal-700 text-teal-200 rounded-lg px-4 py-2.5 text-sm">
          {successMsg}
        </div>
      )}

      {selectedTenant && (
        <>
          {/* Demo Data Status */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Demo Data Status</h3>
              {status?.hasDemo && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-900/30 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 size={14} /> Delete Demo Data
                </button>
              )}
            </div>

            {statusLoading ? (
              <div className="flex items-center gap-2 text-neutral-400 text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading...
              </div>
            ) : status ? (
              status.hasDemo ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <StatBadge label="Orders" value={status.counts.orders} />
                  <StatBadge label="Customers" value={status.counts.customers} />
                  <StatBadge label="Delivery" value={status.counts.delivery_orders} />
                  <StatBadge label="AI Snapshots" value={status.counts.ai_snapshots} />
                  <StatBadge label="Financial" value={status.counts.financial_actuals} />
                </div>
              ) : (
                <p className="text-neutral-500 text-sm">No demo data for this tenant.</p>
              )
            ) : null}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-white font-semibold text-lg">Delete Demo Data</h3>
                <p className="text-neutral-400 text-sm">
                  This will permanently delete all demo-generated orders, loyalty customers, AI analytics, and financial data for this tenant. Real data is unaffected.
                </p>
                <div>
                  <label className="text-neutral-500 text-xs block mb-1">
                    Type <span className="text-red-400 font-mono">{selectedTenant}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmDelete}
                    onChange={e => setConfirmDelete(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                    placeholder={selectedTenant}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setConfirmDelete(''); }}
                    className="px-4 py-2 text-neutral-400 hover:text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={confirmDelete !== selectedTenant || deleting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Delete All Demo Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generate Config */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-5">
            <h3 className="text-white font-semibold text-sm">Generate Demo Data</h3>

            {/* Volume */}
            <div>
              <label className="text-neutral-400 text-xs font-medium block mb-2">Volume</label>
              <div className="flex gap-3">
                {volumeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setVolume(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      volume === opt.value
                        ? 'bg-teal-900/50 border-teal-600 text-teal-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {opt.label} ({opt.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-neutral-400 text-xs font-medium block mb-2">Date Range</label>
              <div className="flex gap-3">
                {dateRangeOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDateRange(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      dateRange === opt.value
                        ? 'bg-teal-900/50 border-teal-600 text-teal-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div>
              <label className="text-neutral-400 text-xs font-medium block mb-2">Include</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Delivery orders', checked: includeDelivery, onChange: setIncludeDelivery },
                  { label: 'Loyalty customers', checked: includeLoyalty, onChange: setIncludeLoyalty },
                  { label: 'AI analytics', checked: includeAi, onChange: setIncludeAi },
                  { label: 'Financial data', checked: includeFinancials, onChange: setIncludeFinancials },
                ].map(toggle => (
                  <label key={toggle.label} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={toggle.checked}
                      onChange={e => toggle.onChange(e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                    />
                    <span className="text-neutral-300 text-sm">{toggle.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || (status?.hasDemo ?? false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating demo data...
                </>
              ) : (
                <>
                  <Play size={16} />
                  Generate Demo Data
                </>
              )}
            </button>
            {status?.hasDemo && (
              <p className="text-neutral-500 text-xs text-center">Delete existing demo data before generating new data.</p>
            )}
          </div>

          {/* Run History */}
          {status && status.runs.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Run History</h3>
              <div className="space-y-2">
                {status.runs.map(run => (
                  <div key={run.id} className="flex items-center justify-between bg-neutral-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Database size={14} className="text-teal-500" />
                      <div>
                        <p className="text-white text-sm">
                          {run.config?.volume ? `${run.config.volume.charAt(0).toUpperCase()}${run.config.volume.slice(1)}` : 'Unknown'} volume
                          {run.config?.date_range_days ? ` · ${run.config.date_range_days} days` : ''}
                          {run.summary?.orders ? ` · ${run.summary.orders} orders` : ''}
                        </p>
                        <p className="text-neutral-500 text-xs">
                          {new Date(run.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
