import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CloudRain,
  UtensilsCrossed,
  Flame,
  Truck,
  Gauge,
  Play,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  TrendingUp,
  Loader2,
  Trash2,
  ShieldAlert,
  Shield,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import {
  getStressTestTemplates, runStressTest, getStressTestResidual, cleanupStressTestData,
  getChaosStatus, runChaosAgent,
  type ChaosAgentProgress, type ChaosAgentResults,
} from '../api';
import {
  StressTestTemplate,
  StressTestConfig,
  StressTestProgress,
  StressTestResults,
  StressTestResidual,
  StressTestTemplateId,
} from '../types';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  'cloud-rain': <CloudRain size={28} />,
  utensils: <UtensilsCrossed size={28} />,
  flame: <Flame size={28} />,
  truck: <Truck size={28} />,
  gauge: <Gauge size={28} />,
};

const TEMPLATE_COLORS: Record<StressTestTemplateId, string> = {
  slow_day: 'blue',
  lunch_rush: 'brand',
  friday_night: 'orange',
  delivery_blitz: 'purple',
  breaking_point: 'red',
};

function formatMs(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;
  return `${mins}m ${remainSecs}s`;
}

// ─── Chaos Agent Tab ─────────────────────────────────────────

function ChaosAgentTab() {
  const [chaosRunning, setChaosRunning] = useState(false);
  const [chaosProgress, setChaosProgress] = useState<ChaosAgentProgress | null>(null);
  const [chaosResults, setChaosResults] = useState<ChaosAgentResults | null>(null);
  const [chaosError, setChaosError] = useState<string | null>(null);
  const [ordersPerTenant, setOrdersPerTenant] = useState(20);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const chaosLog = useRef<ChaosAgentProgress[]>([]);

  useEffect(() => {
    getChaosStatus().then(s => {
      if (s.running) setChaosRunning(true);
    }).catch(() => {});
  }, []);

  const handleRun = useCallback(async () => {
    setConfirmOpen(false);
    setChaosRunning(true);
    setChaosResults(null);
    setChaosError(null);
    setChaosProgress(null);
    chaosLog.current = [];

    try {
      await runChaosAgent(
        ordersPerTenant,
        (p) => { setChaosProgress(p); chaosLog.current.push(p); },
        (r) => { setChaosResults(r); setChaosRunning(false); },
        (e) => { setChaosError(e); setChaosRunning(false); },
      );
      setChaosRunning(false);
    } catch (err) {
      setChaosError(err instanceof Error ? err.message : 'Chaos agent failed');
      setChaosRunning(false);
    }
  }, [ordersPerTenant]);

  const verdictColor = chaosResults?.verdict === 'PASS' ? 'green' : chaosResults?.verdict === 'WARN' ? 'yellow' : 'red';
  const VerdictIcon = chaosResults?.verdict === 'PASS' ? ShieldCheck : chaosResults?.verdict === 'WARN' ? Shield : ShieldX;

  return (
    <div className="space-y-6">
      {chaosError && !chaosRunning && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="text-red-400 shrink-0" size={20} />
          <p className="text-red-300">{chaosError}</p>
        </div>
      )}

      {/* Config */}
      {!chaosRunning && !chaosResults && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-600/10 rounded-lg">
              <ShieldAlert className="text-red-500" size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Multi-Tenant Chaos Agent</h2>
              <p className="text-neutral-400 text-sm">
                Provisions 3 isolated test tenants, fires concurrent orders through RLS-enforced connections,
                then verifies no data leaked across tenant boundaries.
              </p>
            </div>
          </div>

          <div className="mb-8 max-w-md">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-300">Orders per Tenant</label>
              <span className="text-sm font-mono text-white bg-neutral-800 px-2 py-0.5 rounded">
                {ordersPerTenant}
              </span>
            </div>
            <input
              type="range" min={5} max={50} step={5}
              value={ordersPerTenant}
              onChange={(e) => setOrdersPerTenant(Number(e.target.value))}
              className="w-full accent-red-600"
            />
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>5</span>
              <span>50</span>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Total: {ordersPerTenant * 3} orders across 3 tenants running simultaneously
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setConfirmOpen(true)}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Play size={18} /> Run Chaos Agent
            </button>
            <p className="text-neutral-500 text-sm">
              Creates temporary tenants that are automatically cleaned up after the test.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert className="text-red-500" size={24} />
              <h3 className="text-lg font-bold text-white">Confirm Chaos Test</h3>
            </div>
            <p className="text-neutral-300 text-sm mb-2">
              This will create 3 temporary tenants and fire {ordersPerTenant * 3} orders to test RLS isolation.
            </p>
            <ul className="text-neutral-400 text-sm space-y-1 mb-6">
              <li>- All test tenants and data are automatically cleaned up</li>
              <li>- Existing tenant data is never touched</li>
              <li>- The test may take 30-120 seconds</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 text-neutral-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleRun} className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                Start Chaos Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Running */}
      {chaosRunning && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="animate-spin text-red-500" size={24} />
            <h2 className="text-xl font-bold text-white">Chaos Agent Running</h2>
          </div>
          <div className="mb-4">
            <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-300"
                style={{ width: `${chaosProgress?.percent || 0}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-neutral-400">{chaosProgress?.phase || 'Initializing...'}</span>
              <span className="text-neutral-400">{chaosProgress?.percent || 0}%</span>
            </div>
          </div>
          <div className="bg-neutral-800 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs text-neutral-400 space-y-1">
            {chaosLog.current.slice(-20).map((p, i) => (
              <div key={i} className={p.message.includes('CRITICAL') ? 'text-red-400 font-bold' : ''}>
                [{p.phase}] {p.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {chaosResults && (
        <div className="space-y-6">
          {/* Verdict Banner */}
          <div className={`bg-${verdictColor}-900/20 border border-${verdictColor}-800/50 rounded-lg p-6`}>
            <div className="flex items-center gap-4">
              <VerdictIcon className={`text-${verdictColor}-400`} size={40} />
              <div>
                <h2 className={`text-2xl font-black text-${verdictColor}-400`}>{chaosResults.verdict}</h2>
                <p className="text-neutral-300 text-sm mt-1">
                  {chaosResults.verdict === 'PASS'
                    ? 'Multi-tenant isolation verified — zero breaches detected'
                    : chaosResults.verdict === 'WARN'
                      ? 'Minor anomalies detected — review details below'
                      : 'CRITICAL isolation breach detected — investigate immediately'}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-neutral-400 text-sm">Duration</p>
                <p className="text-white font-bold">{formatDuration(chaosResults.durationMs)}</p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Tenants Tested</p>
              <p className="text-2xl font-bold text-white">{chaosResults.tenantsProvisioned}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-white">{chaosResults.totalOrdersCreated}</p>
              <p className="text-xs text-neutral-500 mt-1">{chaosResults.ordersPerTenant} per tenant</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Isolation Breaches</p>
              <p className={`text-2xl font-bold ${chaosResults.isolationBreaches.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {chaosResults.isolationBreaches.length}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Pool Anomalies</p>
              <p className={`text-2xl font-bold ${chaosResults.connectionAnomalies.length > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {chaosResults.connectionAnomalies.length}
              </p>
            </div>
          </div>

          {/* Per-Tenant Breakdown */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-neutral-300 mb-4">Per-Tenant Results</h3>
            <div className="space-y-3">
              {chaosResults.tenantResults.map((t) => (
                <div key={t.tenantId} className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
                  <div>
                    <p className="text-white font-medium text-sm">{t.tenantId}</p>
                    <p className="text-neutral-500 text-xs">{t.ordersCreated} orders, {t.errors} errors</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono text-sm">{t.avgLatencyMs}ms avg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latency */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-neutral-300 mb-4">Order Creation Latency</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              {(['avg', 'p50', 'p95', 'max'] as const).map((key) => (
                <div key={key}>
                  <p className="text-xs text-neutral-500 uppercase">{key}</p>
                  <p className="text-lg font-bold text-white font-mono">{formatMs(chaosResults.latency[key])}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Breach Details */}
          {chaosResults.isolationBreaches.length > 0 && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-red-300 mb-4 flex items-center gap-2">
                <ShieldX size={16} /> Isolation Breaches
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {chaosResults.isolationBreaches.map((b, i) => (
                  <div key={i} className={`p-3 rounded ${b.severity === 'CRITICAL' ? 'bg-red-900/40 text-red-300' : 'bg-yellow-900/30 text-yellow-300'}`}>
                    <span className="font-bold">[{b.severity || b.type}]</span> {b.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Anomalies */}
          {chaosResults.connectionAnomalies.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-yellow-300 mb-4">Connection Anomalies</h3>
              <div className="space-y-2 font-mono text-xs text-yellow-300">
                {chaosResults.connectionAnomalies.map((a, i) => (
                  <div key={i} className="p-3 bg-yellow-900/30 rounded">{a.message}</div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => { setChaosResults(null); setChaosProgress(null); chaosLog.current = []; }}
            className="px-4 py-2 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg transition-colors"
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────

export default function StressTestScreen() {
  const [activeTab, setActiveTab] = useState<'stress' | 'chaos'>('stress');
  const [templates, setTemplates] = useState<StressTestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<StressTestTemplate | null>(null);
  const [params, setParams] = useState<Record<string, number>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<StressTestProgress | null>(null);
  const [results, setResults] = useState<StressTestResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [residual, setResidual] = useState<StressTestResidual | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const progressLog = useRef<StressTestProgress[]>([]);

  const fetchResidual = useCallback(() => {
    getStressTestResidual()
      .then(setResidual)
      .catch(() => setResidual(null));
  }, []);

  useEffect(() => {
    getStressTestTemplates()
      .then((t) => {
        setTemplates(t);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    fetchResidual();
  }, [fetchResidual]);

  const handleCleanup = useCallback(async () => {
    setCleaning(true);
    try {
      const result = await cleanupStressTestData();
      setResidual({ orderCount: 0, totalRevenue: 0, oldest: null, newest: null });
      setError(null);
      console.log(`[StressTest] Cleaned up ${result.deleted} orders`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clean up');
    } finally {
      setCleaning(false);
    }
  }, []);

  const selectTemplate = useCallback((t: StressTestTemplate) => {
    setSelectedTemplate(t);
    setResults(null);
    setError(null);
    setProgress(null);
    progressLog.current = [];
    const defaults: Record<string, number> = {};
    for (const p of t.params) {
      defaults[p.key] = p.default;
    }
    setParams(defaults);
  }, []);

  const handleRun = useCallback(async () => {
    if (!selectedTemplate) return;
    setConfirmOpen(false);
    setRunning(true);
    setResults(null);
    setError(null);
    setProgress(null);
    progressLog.current = [];

    const config: StressTestConfig = {
      templateId: selectedTemplate.id,
      params,
    };

    try {
      await runStressTest(
        config,
        (p) => {
          setProgress(p);
          progressLog.current.push(p);
        },
        (r) => {
          setResults(r);
          setRunning(false);
          fetchResidual();
        },
        (errMsg) => {
          setError(errMsg);
          setRunning(false);
          fetchResidual();
        },
      );
      // If stream ends without complete event
      if (!results) {
        setRunning(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run stress test');
      setRunning(false);
    }
  }, [selectedTemplate, params]);

  const color = selectedTemplate ? TEMPLATE_COLORS[selectedTemplate.id] : 'brand';

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter">Stress Test</h1>
            <p className="text-neutral-400 text-sm mt-1">Simulate real-world scenarios and find your system's limits</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('stress')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'stress'
                ? 'bg-brand-600/20 text-brand-400'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Zap size={14} className="inline mr-1.5 -mt-0.5" />
            Load Test
          </button>
          <button
            onClick={() => setActiveTab('chaos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'chaos'
                ? 'bg-red-600/20 text-red-400'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <ShieldAlert size={14} className="inline mr-1.5 -mt-0.5" />
            Chaos Agent
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
      {activeTab === 'chaos' ? <ChaosAgentTab /> : <>
        {error && !running && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="text-red-400 shrink-0" size={20} />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Residual Data Banner */}
        {residual && residual.orderCount > 0 && !running && (
          <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-orange-400 shrink-0" size={20} />
                <div>
                  <p className="text-orange-300 font-medium">
                    {residual.orderCount} leftover stress test order{residual.orderCount !== 1 ? 's' : ''} found
                  </p>
                  <p className="text-orange-400/70 text-sm mt-0.5">
                    ${Number(residual.totalRevenue).toFixed(2)} in test revenue
                    {residual.newest && ` \u00B7 last run ${new Date(residual.newest).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCleanup}
                disabled={cleaning}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {cleaning ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {cleaning ? 'Cleaning...' : 'Delete Test Data'}
              </button>
            </div>
          </div>
        )}

        {/* Template Selection */}
        {!selectedTemplate && !loading && (
          <>
            <h2 className="text-xl font-bold text-white mb-4">Choose a Scenario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => {
                const c = TEMPLATE_COLORS[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    className="text-left bg-neutral-900 p-6 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-all"
                  >
                    <div className={`flex items-center justify-center w-12 h-12 bg-${c}-600/10 rounded-lg mb-4`}>
                      <span className={`text-${c}-500`}>
                        {TEMPLATE_ICONS[t.icon] || <Gauge size={28} />}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{t.name}</h3>
                    <p className="text-neutral-400 text-sm">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        )}

        {/* Configuration Panel */}
        {selectedTemplate && !running && !results && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-neutral-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={16} /> Back to scenarios
            </button>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`flex items-center justify-center w-12 h-12 bg-${color}-600/10 rounded-lg`}>
                  <span className={`text-${color}-500`}>
                    {TEMPLATE_ICONS[selectedTemplate.icon]}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedTemplate.name}</h2>
                  <p className="text-neutral-400 text-sm">{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {selectedTemplate.params.map((p) => (
                  <div key={p.key}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-neutral-300">{p.label}</label>
                      <span className="text-sm font-mono text-white bg-neutral-800 px-2 py-0.5 rounded">
                        {params[p.key]}{p.unit ? ` ${p.unit}` : ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[p.key]}
                      onChange={(e) => setParams({ ...params, [p.key]: Number(e.target.value) })}
                      className="w-full accent-brand-600"
                    />
                    <div className="flex justify-between text-xs text-neutral-500 mt-1">
                      <span>{p.min}</span>
                      <span>{p.max}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="px-6 py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-2"
                >
                  <Play size={18} /> Run Stress Test
                </button>
                <p className="text-neutral-500 text-sm">
                  This creates temporary orders in your database that are automatically cleaned up after the test.
                </p>
              </div>
            </div>

            {/* Confirmation Modal */}
            {confirmOpen && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-orange-500" size={24} />
                    <h3 className="text-lg font-bold text-white">Confirm Stress Test</h3>
                  </div>
                  <p className="text-neutral-300 text-sm mb-2">
                    This will create temporary orders in your database to measure system performance.
                  </p>
                  <ul className="text-neutral-400 text-sm space-y-1 mb-6">
                    <li>- All test data is automatically cleaned up</li>
                    <li>- The test may take 30-90 seconds</li>
                    <li>- Real orders won't be affected</li>
                  </ul>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setConfirmOpen(false)}
                      className="px-4 py-2 text-neutral-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRun}
                      className="px-6 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors"
                    >
                      Start Test
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Running State */}
        {running && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <Loader2 className="animate-spin text-brand-500" size={24} />
                <h2 className="text-xl font-bold text-white">
                  Running: {selectedTemplate?.name}
                </h2>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress?.percent || 0}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-neutral-400">{progress?.phase || 'Initializing...'}</span>
                  <span className="text-neutral-400">{progress?.percent || 0}%</span>
                </div>
              </div>

              {/* Live stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Orders Created</p>
                  <p className="text-lg font-bold text-white">{progress?.ordersCreated || 0}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Kitchen Processed</p>
                  <p className="text-lg font-bold text-white">{progress?.ordersProcessed || 0}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Last Latency</p>
                  <p className="text-lg font-bold text-white">{formatMs(progress?.currentLatencyMs || 0)}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-500">Errors</p>
                  <p className={`text-lg font-bold ${(progress?.errorsCount || 0) > 0 ? 'text-red-400' : 'text-white'}`}>
                    {progress?.errorsCount || 0}
                  </p>
                </div>
              </div>

              {/* Message log */}
              <div className="bg-neutral-800 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs text-neutral-400 space-y-1">
                {progressLog.current.slice(-15).map((p, i) => (
                  <div key={i}>{p.message}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="text-green-500" size={24} />
                Results: {results.templateName}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setResults(null);
                    setProgress(null);
                    progressLog.current = [];
                  }}
                  className="px-4 py-2 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg transition-colors"
                >
                  Adjust & Re-run
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setResults(null);
                    setProgress(null);
                    progressLog.current = [];
                  }}
                  className="px-4 py-2 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg transition-colors"
                >
                  Try Another Scenario
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="text-neutral-500" size={16} />
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Duration</p>
                </div>
                <p className="text-2xl font-bold text-white">{formatDuration(results.durationMs)}</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="text-neutral-500" size={16} />
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Total Orders</p>
                </div>
                <p className="text-2xl font-bold text-white">{results.totalOrders}</p>
                <p className="text-xs text-neutral-500 mt-1">
                  {results.posOrders} POS / {results.deliveryOrders} delivery
                </p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-neutral-500" size={16} />
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Throughput</p>
                </div>
                <p className="text-2xl font-bold text-white">{results.throughputPerMinute}</p>
                <p className="text-xs text-neutral-500 mt-1">orders/min</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="text-neutral-500" size={16} />
                  <p className="text-xs text-neutral-500 uppercase tracking-wider">Error Rate</p>
                </div>
                <p className={`text-2xl font-bold ${results.errorRate > 5 ? 'text-red-400' : results.errorRate > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {results.errorRate}%
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {results.ordersFailed} failed / {results.totalOrders} total
                </p>
              </div>
            </div>

            {/* Latency breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-neutral-300 mb-4">Order Creation Latency</h3>
                <div className="space-y-3">
                  {(['avg', 'p50', 'p95', 'p99', 'max'] as const).map((key) => {
                    const val = results.orderCreationLatency[key];
                    const maxWidth = results.orderCreationLatency.max || 1;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-neutral-500 w-8 text-right font-mono uppercase">{key}</span>
                        <div className="flex-1 h-5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${val > 1000 ? 'bg-red-600' : val > 500 ? 'bg-yellow-600' : 'bg-brand-600'}`}
                            style={{ width: `${Math.max(2, (val / maxWidth) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono text-white w-16 text-right">{formatMs(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-neutral-300 mb-4">Kitchen Transition Latency</h3>
                <div className="space-y-3">
                  {(['avg', 'p50', 'p95', 'p99', 'max'] as const).map((key) => {
                    const val = results.kitchenTransitionLatency[key];
                    const maxWidth = results.kitchenTransitionLatency.max || 1;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-neutral-500 w-8 text-right font-mono uppercase">{key}</span>
                        <div className="flex-1 h-5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${val > 500 ? 'bg-red-600' : val > 200 ? 'bg-yellow-600' : 'bg-brand-600'}`}
                            style={{ width: `${Math.max(2, (val / maxWidth) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono text-white w-16 text-right">{formatMs(val)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Breaking Point Chart */}
            {results.breakingPointBatches && results.breakingPointBatches.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-neutral-300 mb-4">Breaking Point Progression</h3>
                <div className="flex items-end gap-2 h-40">
                  {results.breakingPointBatches.map((batch, i) => {
                    const maxLatency = Math.max(...results.breakingPointBatches!.map(b => b.avgLatencyMs));
                    const heightPct = maxLatency > 0 ? (batch.avgLatencyMs / maxLatency) * 100 : 0;
                    const isOverThreshold = batch.avgLatencyMs > (params.latencyThresholdMs || 2000);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-neutral-500 font-mono">{formatMs(batch.avgLatencyMs)}</span>
                        <div className="w-full flex items-end" style={{ height: '100px' }}>
                          <div
                            className={`w-full rounded-t ${isOverThreshold ? 'bg-red-600' : batch.errorRate > 0.05 ? 'bg-yellow-600' : 'bg-brand-600'}`}
                            style={{ height: `${Math.max(4, heightPct)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-500">{batch.batchSize}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-500 text-center mt-2">Concurrent orders per batch</p>
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-neutral-300 mb-4">Recommendations</h3>
                <div className="space-y-3">
                  {results.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="w-5 h-5 bg-brand-600/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-brand-400 text-xs font-bold">{i + 1}</span>
                      </div>
                      <p className="text-neutral-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peak Kitchen Queue */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-neutral-300 mb-2">Peak Kitchen Queue</h3>
              <p className="text-3xl font-bold text-white">{results.peakKitchenQueue} orders</p>
              <p className="text-xs text-neutral-500 mt-1">Maximum concurrent orders in kitchen at any point during the test</p>
            </div>
          </div>
        )}
      </>}
      </div>
    </div>
  );
}
