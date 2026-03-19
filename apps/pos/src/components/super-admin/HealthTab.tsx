import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, Server, Cpu, HardDrive, RefreshCw, Database,
  Wifi, WifiOff, AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Bell,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  getDetailedHealth, getMetricsHistory, getAlerts, acknowledgeAlert,
  type DetailedHealthData, type MetricsSnapshot, type PlatformAlert, type ServiceStatus,
} from '../../api/superAdmin';
import { KPICard, formatUptime } from './shared';

// ==================== Sub-components ====================

function GaugeBar({ pct, label, subLabel }: { pct: number; label: string; subLabel?: string }) {
  const color = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#0d9488';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-neutral-800 rounded-full h-3">
        <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      {subLabel && <p className="text-neutral-500 text-xs mt-1">{subLabel}</p>}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ok: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
    unconfigured: 'bg-neutral-600',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || colors.unconfigured}`} />;
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-teal-500" />
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ==================== Connection Pools Section ====================

function PoolsSection({ health, t }: { health: DetailedHealthData; t: any }) {
  const { tenant, admin } = health.pools;

  const renderPool = (pool: typeof tenant, label: string) => {
    const utilPct = pool.max > 0 ? Math.round((pool.active / pool.max) * 100) : 0;
    const successRate = pool.totalReserves > 0
      ? Math.round((pool.successes / pool.totalReserves) * 10000) / 100
      : 100;

    return (
      <div className="space-y-3">
        <GaugeBar pct={utilPct} label={`${label} — ${pool.active} / ${pool.max}`} />
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-neutral-500">{t('health.successRate')}</span>
            <p className="text-white font-medium">{successRate}%</p>
          </div>
          <div>
            <span className="text-neutral-500">{t('health.avgWait')}</span>
            <p className="text-white font-medium">{pool.avgWaitMs}ms</p>
          </div>
          <div>
            <span className="text-neutral-500">{t('health.peak')}</span>
            <p className="text-white font-medium">{pool.peakActive}</p>
          </div>
          <div>
            <span className="text-neutral-500">{t('health.failures')}</span>
            <p className={`font-medium ${pool.failures > 0 ? 'text-red-400' : 'text-white'}`}>{pool.failures}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SectionCard title={t('health.connectionPools')} icon={Database}>
      <div className="space-y-5">
        {renderPool(tenant, t('health.tenantPool'))}
        <hr className="border-neutral-800" />
        {renderPool(admin, t('health.adminPool'))}
      </div>
    </SectionCard>
  );
}

// ==================== External Services Section ====================

function ServicesSection({ health, t }: { health: DetailedHealthData; t: any }) {
  const services = health.services;
  const allServices: Array<{ name: string; check: ServiceStatus }> = [
    { name: 'Postgres', check: services.postgres },
    { name: 'Stripe', check: services.stripe },
    { name: 'Twilio', check: services.twilio },
    { name: 'Grok AI', check: services.grok },
    ...Object.entries(services.dns || {}).map(([domain, check]) => ({ name: `DNS: ${domain}`, check })),
  ];

  return (
    <SectionCard title={t('health.externalServices')} icon={Wifi}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allServices.map(({ name, check }) => (
          <div key={name} className="flex items-center justify-between bg-neutral-800/50 rounded px-3 py-2">
            <div className="flex items-center gap-2">
              <StatusDot status={check.status} />
              <span className="text-sm text-neutral-300">{name}</span>
            </div>
            <span className="text-xs text-neutral-500">
              {check.status === 'unconfigured' ? 'N/A' : `${check.latency_ms}ms`}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ==================== AI Scheduler Section ====================

function SchedulerSection({ health, t }: { health: DetailedHealthData; t: any }) {
  const { running, jobs } = health.scheduler;

  function formatInterval(ms: number) {
    if (ms >= 86400000) return `${Math.round(ms / 86400000)}d`;
    if (ms >= 3600000) return `${Math.round(ms / 3600000)}h`;
    if (ms >= 60000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 1000)}s`;
  }

  function timeAgo(iso: string | null) {
    if (!iso) return t('health.never');
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    return `${Math.round(diff / 3600000)}h ago`;
  }

  return (
    <SectionCard title={t('health.aiScheduler')} icon={Clock}>
      <div className="flex items-center gap-2 mb-3">
        <StatusDot status={running ? 'ok' : 'down'} />
        <span className="text-sm text-neutral-300">{running ? t('health.schedulerRunning') : t('health.schedulerStopped')}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-neutral-500 border-b border-neutral-800">
              <th className="text-left py-1.5 pr-3">{t('health.jobName')}</th>
              <th className="text-left py-1.5 pr-3">{t('health.interval')}</th>
              <th className="text-left py-1.5 pr-3">{t('health.lastRun')}</th>
              <th className="text-right py-1.5 pr-3">{t('health.runs')}</th>
              <th className="text-center py-1.5">{t('health.status')}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.name} className="border-b border-neutral-800/50">
                <td className="py-1.5 pr-3 text-neutral-300 font-mono">{job.name}</td>
                <td className="py-1.5 pr-3 text-neutral-400">{formatInterval(job.intervalMs)}</td>
                <td className="py-1.5 pr-3 text-neutral-400">{timeAgo(job.lastRun)}</td>
                <td className="py-1.5 pr-3 text-right text-neutral-300">{job.runCount}</td>
                <td className="py-1.5 text-center">
                  {job.lastError
                    ? <span className="text-red-400" title={job.lastError}><XCircle size={14} /></span>
                    : <span className="text-green-500"><CheckCircle size={14} /></span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ==================== Error Rate Section ====================

function ErrorRateSection({ health, history, t }: { health: DetailedHealthData; history: MetricsSnapshot[]; t: any }) {
  const [showErrors, setShowErrors] = useState(false);
  const { requests } = health;

  const chartData = history.map(s => ({
    time: new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    errors: s.requests.totalErrors,
    requests: s.requests.totalRequests,
    errorRate: s.requests.errorRate,
  }));

  return (
    <SectionCard title={t('health.errorRate')} icon={AlertTriangle}>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <span className="text-neutral-500 text-xs">{t('health.totalRequests')}</span>
          <p className="text-lg font-bold text-white">{requests.totalRequests.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-neutral-500 text-xs">{t('health.totalErrors')}</span>
          <p className={`text-lg font-bold ${requests.totalErrors > 0 ? 'text-red-400' : 'text-white'}`}>{requests.totalErrors}</p>
        </div>
        <div>
          <span className="text-neutral-500 text-xs">{t('health.currentErrorRate')}</span>
          <p className={`text-lg font-bold ${requests.errorRate > 5 ? 'text-red-400' : requests.errorRate > 1 ? 'text-yellow-400' : 'text-green-400'}`}>{requests.errorRate}%</p>
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#6b7280' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '6px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="errorRate" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Error %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <button
        onClick={() => setShowErrors(!showErrors)}
        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {t('health.recentErrors')} ({requests.recentErrors.length})
      </button>

      {showErrors && (
        <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
          {requests.recentErrors.length === 0 && (
            <p className="text-neutral-500 text-xs">{t('health.noErrors')}</p>
          )}
          {requests.recentErrors.map((err, i) => (
            <div key={i} className="text-xs bg-neutral-800/50 rounded px-2 py-1.5 flex gap-2">
              <span className={`font-mono font-bold ${err.status >= 500 ? 'text-red-400' : 'text-yellow-400'}`}>{err.status}</span>
              <span className="text-neutral-400">{err.method}</span>
              <span className="text-neutral-300 truncate flex-1">{err.path}</span>
              <span className="text-neutral-500">{err.tenant}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ==================== Request Latency Section ====================

function LatencySection({ health, t }: { health: DetailedHealthData; t: any }) {
  const buckets = health.requests.latencyBuckets;
  const chartData = Object.entries(buckets).map(([name, count]) => ({
    name,
    count,
  }));

  const colors: Record<string, string> = {
    '<50ms': '#10b981',
    '50-200ms': '#0d9488',
    '200-500ms': '#f59e0b',
    '500-1000ms': '#f97316',
    '>1000ms': '#ef4444',
  };

  return (
    <SectionCard title={t('health.requestLatency')} icon={Activity}>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
            <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '6px', fontSize: '12px' }} />
            <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <rect key={entry.name} fill={colors[entry.name] || '#0d9488'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

// ==================== Alerts Section ====================

function AlertsSection({ alerts, onAcknowledge, t }: { alerts: PlatformAlert[]; onAcknowledge: (id: number) => void; t: any }) {
  if (alerts.length === 0) return null;

  return (
    <SectionCard title={t('health.alerts')} icon={Bell}>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`flex items-start justify-between gap-3 rounded px-3 py-2 text-sm ${
              alert.acknowledged ? 'bg-neutral-800/30 opacity-60' : 'bg-neutral-800/50'
            }`}
          >
            <div className="flex items-start gap-2 min-w-0">
              {alert.severity === 'critical'
                ? <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                : <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
              }
              <div className="min-w-0">
                <p className="text-neutral-200 font-medium truncate">{alert.title}</p>
                <p className="text-neutral-500 text-xs truncate">{alert.message}</p>
                <p className="text-neutral-600 text-xs">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
            </div>
            {!alert.acknowledged && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="text-xs text-teal-400 hover:text-teal-300 shrink-0"
              >
                {t('health.acknowledge')}
              </button>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ==================== Main HealthTab ====================

export default function HealthTab() {
  const { t } = useTranslation('superAdmin');
  const [health, setHealth] = useState<DetailedHealthData | null>(null);
  const [history, setHistory] = useState<MetricsSnapshot[]>([]);
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    Promise.all([
      getDetailedHealth(),
      getMetricsHistory(60),
      getAlerts(20),
    ]).then(([h, hist, al]) => {
      setHealth(h);
      setHistory(hist);
      setAlerts(al);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 30000);
    return () => clearInterval(iv);
  }, [refresh]);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    } catch {}
  };

  if (loading && !health) return <div className="text-neutral-400 text-center py-12">{t('health.loading')}</div>;
  if (!health) return null;

  const memPct = Math.round((health.memory.heap_used_mb / health.memory.heap_total_mb) * 100);
  const osPct = Math.round(((health.os.total_mem_mb - health.os.free_mem_mb) / health.os.total_mem_mb) * 100);

  const unackedAlerts = alerts.filter(a => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        {unackedAlerts.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-medium">
              {unackedAlerts.length} unacknowledged alert{unackedAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        <div className="ml-auto">
          <button onClick={refresh} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
            <RefreshCw size={14} /> {t('health.refresh')}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <AlertsSection alerts={alerts} onAcknowledge={handleAcknowledge} t={t} />
      )}

      {/* System Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Activity} label={t('health.kpi.uptime')} value={formatUptime(health.uptime_seconds)} />
        <KPICard icon={Server} label={t('health.kpi.node')} value={health.node_version} sub={health.platform} />
        <KPICard icon={Cpu} label={t('health.kpi.cpus')} value={health.os.cpus} sub={`Load: ${health.os.load_avg.map(l => l.toFixed(2)).join(', ')}`} />
        <KPICard icon={HardDrive} label={t('health.kpi.postgres')} value={health.postgres_version.split(' ').slice(0, 2).join(' ')} />
      </div>

      {/* Memory Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">{t('health.heapMemory')}</h3>
          <GaugeBar pct={memPct} label={`${health.memory.heap_used_mb} / ${health.memory.heap_total_mb} MB`} subLabel={t('health.rss', { value: health.memory.rss_mb })} />
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">{t('health.osMemory')}</h3>
          <GaugeBar pct={osPct} label={`${health.os.total_mem_mb - health.os.free_mem_mb} / ${health.os.total_mem_mb} MB`} />
        </div>
      </div>

      {/* Connection Pools + External Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PoolsSection health={health} t={t} />
        <ServicesSection health={health} t={t} />
      </div>

      {/* AI Scheduler */}
      <SchedulerSection health={health} t={t} />

      {/* Error Rate + Request Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorRateSection health={health} history={history} t={t} />
        <LatencySection health={health} t={t} />
      </div>
    </div>
  );
}
