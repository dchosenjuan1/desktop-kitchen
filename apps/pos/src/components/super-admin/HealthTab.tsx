import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Server, Cpu, HardDrive, RefreshCw } from 'lucide-react';
import { getHealth, type HealthData } from '../../api/superAdmin';
import { KPICard, formatUptime } from './shared';

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

export default function HealthTab() {
  const { t } = useTranslation('superAdmin');
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

  if (loading && !health) return <div className="text-neutral-400 text-center py-12">{t('health.loading')}</div>;
  if (!health) return null;

  const memPct = Math.round((health.memory.heap_used_mb / health.memory.heap_total_mb) * 100);
  const osPct = Math.round(((health.os.total_mem_mb - health.os.free_mem_mb) / health.os.total_mem_mb) * 100);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={refresh} className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
          <RefreshCw size={14} /> {t('health.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Activity} label={t('health.kpi.uptime')} value={formatUptime(health.uptime_seconds)} />
        <KPICard icon={Server} label={t('health.kpi.node')} value={health.node_version} sub={health.platform} />
        <KPICard icon={Cpu} label={t('health.kpi.cpus')} value={health.os.cpus} />
        <KPICard icon={HardDrive} label={t('health.kpi.postgres')} value={health.postgres_version.split(' ').slice(0, 2).join(' ')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">{t('health.heapMemory')}</h3>
          <GaugeBar pct={memPct} label={`${health.memory.heap_used_mb} / ${health.memory.heap_total_mb} MB`} />
          <p className="text-neutral-500 text-xs mt-2">{t('health.rss', { value: health.memory.rss_mb })}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-4">{t('health.osMemory')}</h3>
          <GaugeBar pct={osPct} label={`${health.os.total_mem_mb - health.os.free_mem_mb} / ${health.os.total_mem_mb} MB`} />
        </div>
      </div>
    </div>
  );
}
