import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('superAdmin');
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
      setError(err.message || t('stressTest.failedFetchStatus'));
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
      setSuccessMsg(t('stressTest.generatedSuccess', { count: result.summary.orders }));
      await fetchStatus(selectedTenant);
    } catch (err: any) {
      setError(err.message || t('stressTest.failedGenerate'));
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
      setSuccessMsg(t('stressTest.deletedSuccess', { count: result.deleted.orders || 0 }));
      setShowDeleteConfirm(false);
      setConfirmDelete('');
      await fetchStatus(selectedTenant);
    } catch (err: any) {
      setError(err.message || t('stressTest.failedDelete'));
    }
    setDeleting(false);
  };

  const volumeOptions: { value: 'low' | 'medium' | 'high'; label: string; count: number }[] = [
    { value: 'low', label: t('stressTest.volumeLow'), count: 50 },
    { value: 'medium', label: t('stressTest.volumeMedium'), count: 150 },
    { value: 'high', label: t('stressTest.volumeHigh'), count: 300 },
  ];

  const dateRangeOptions = [
    { value: 7, label: t('stressTest.days', { count: 7 }) },
    { value: 14, label: t('stressTest.days', { count: 14 }) },
    { value: 30, label: t('stressTest.days', { count: 30 }) },
  ];

  return (
    <div className="space-y-6">
      {/* Tenant Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <label className="block text-neutral-400 text-sm font-medium mb-2">{t('stressTest.selectTenant')}</label>
        {tenantsLoading ? (
          <p className="text-neutral-500 text-sm">{t('stressTest.loadingTenants')}</p>
        ) : (
          <select
            value={selectedTenant}
            onChange={e => setSelectedTenant(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="">{t('stressTest.selectPlaceholder')}</option>
            {tenants.map(tn => (
              <option key={tn.id} value={tn.id}>{tn.name} ({tn.id})</option>
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
              <h3 className="text-white font-semibold text-sm">{t('stressTest.demoDataStatus')}</h3>
              {status?.hasDemo && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-900/30 rounded-lg text-xs font-medium transition-colors"
                >
                  <Trash2 size={14} /> {t('stressTest.deleteDemoData')}
                </button>
              )}
            </div>

            {statusLoading ? (
              <div className="flex items-center gap-2 text-neutral-400 text-sm">
                <Loader2 size={14} className="animate-spin" /> {t('stressTest.loading')}
              </div>
            ) : status ? (
              status.hasDemo ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <StatBadge label={t('stressTest.stats.orders')} value={status.counts.orders} />
                  <StatBadge label={t('stressTest.stats.customers')} value={status.counts.customers} />
                  <StatBadge label={t('stressTest.stats.delivery')} value={status.counts.delivery_orders} />
                  <StatBadge label={t('stressTest.stats.aiSnapshots')} value={status.counts.ai_snapshots} />
                  <StatBadge label={t('stressTest.stats.financial')} value={status.counts.financial_actuals} />
                </div>
              ) : (
                <p className="text-neutral-500 text-sm">{t('stressTest.noDemo')}</p>
              )
            ) : null}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-white font-semibold text-lg">{t('stressTest.deleteTitle')}</h3>
                <p className="text-neutral-400 text-sm">
                  {t('stressTest.deleteDescription')}
                </p>
                <div>
                  <label className="text-neutral-500 text-xs block mb-1">
                    {t('stressTest.typeToConfirm')} <span className="text-red-400 font-mono">{selectedTenant}</span> {t('stressTest.toConfirm')}
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
                    {t('stressTest.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={confirmDelete !== selectedTenant || deleting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {t('stressTest.deleteAll')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Generate Config */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-5">
            <h3 className="text-white font-semibold text-sm">{t('stressTest.generateTitle')}</h3>

            {/* Volume */}
            <div>
              <label className="text-neutral-400 text-xs font-medium block mb-2">{t('stressTest.volume')}</label>
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
              <label className="text-neutral-400 text-xs font-medium block mb-2">{t('stressTest.dateRange')}</label>
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
              <label className="text-neutral-400 text-xs font-medium block mb-2">{t('stressTest.include')}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: t('stressTest.deliveryOrders'), checked: includeDelivery, onChange: setIncludeDelivery },
                  { label: t('stressTest.loyaltyCustomers'), checked: includeLoyalty, onChange: setIncludeLoyalty },
                  { label: t('stressTest.aiAnalytics'), checked: includeAi, onChange: setIncludeAi },
                  { label: t('stressTest.financialData'), checked: includeFinancials, onChange: setIncludeFinancials },
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
                  {t('stressTest.generating')}
                </>
              ) : (
                <>
                  <Play size={16} />
                  {t('stressTest.generateButton')}
                </>
              )}
            </button>
            {status?.hasDemo && (
              <p className="text-neutral-500 text-xs text-center">{t('stressTest.deleteBeforeGenerate')}</p>
            )}
          </div>

          {/* Run History */}
          {status && status.runs.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-white font-semibold text-sm mb-3">{t('stressTest.runHistory')}</h3>
              <div className="space-y-2">
                {status.runs.map(run => (
                  <div key={run.id} className="flex items-center justify-between bg-neutral-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Database size={14} className="text-teal-500" />
                      <div>
                        <p className="text-white text-sm">
                          {run.config?.volume ? `${run.config.volume.charAt(0).toUpperCase()}${run.config.volume.slice(1)}` : t('stressTest.unknown')} {t('stressTest.volumeLabel')}
                          {run.config?.date_range_days ? ` · ${t('stressTest.daysLabel', { count: run.config.date_range_days })}` : ''}
                          {run.summary?.orders ? ` · ${t('stressTest.ordersLabel', { count: run.summary.orders })}` : ''}
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
