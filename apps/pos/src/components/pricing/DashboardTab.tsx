import React from 'react';
import { useTranslation } from 'react-i18next';
import { PricingDashboard } from '../../types';
import { formatPrice } from '../../utils/currency';
import SourceBadge from './SourceBadge';

function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
      <p className="text-neutral-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

export default function DashboardTab({ dashboard }: { dashboard: PricingDashboard }) {
  const { t } = useTranslation('admin');

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label={t('pricing.activeRules')} value={dashboard.activeRulesCount} color="text-brand-500" />
        <KPICard label={t('pricing.changes7d')} value={dashboard.recentChanges.length} color="text-amber-500" />
        <KPICard label={t('pricing.revenueImpact')} value={formatPrice(dashboard.totalRevenueImpact)} color={dashboard.totalRevenueImpact >= 0 ? 'text-green-500' : 'text-red-500'} />
        <KPICard label={t('pricing.runningExperiments')} value={dashboard.runningExperiments} color="text-purple-500" />
      </div>

      {/* Revenue Chart */}
      {dashboard.chartData.length > 0 && (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <h3 className="text-lg font-bold text-white mb-4">{t('pricing.revenueChart')}</h3>
          <div className="flex items-end gap-1 h-40">
            {dashboard.chartData.map((d, i) => {
              const maxRev = Math.max(...dashboard.chartData.map(x => x.revenue), 1);
              const height = (d.revenue / maxRev) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {d.changes > 0 && (
                    <span className="text-[10px] text-amber-400 font-bold">{d.changes}</span>
                  )}
                  <div
                    className={`w-full rounded-t ${d.changes > 0 ? 'bg-amber-500/60' : 'bg-brand-600/40'}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${d.date}: ${formatPrice(d.revenue)}${d.changes ? ` (${d.changes} changes)` : ''}`}
                  />
                  {i % 2 === 0 && (
                    <span className="text-[9px] text-neutral-600 truncate w-full text-center">
                      {d.date.slice(5)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600/40" /> {t('pricing.revenue')}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/60" /> {t('pricing.priceChangeDay')}</span>
          </div>
        </div>
      )}

      {/* Recent Changes */}
      {dashboard.recentChanges.length > 0 && (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <h3 className="text-lg font-bold text-white mb-4">{t('pricing.recentPriceChanges')}</h3>
          <div className="space-y-2">
            {dashboard.recentChanges.slice(0, 5).map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                <div>
                  <span className="text-white font-medium">{entry.item_name}</span>
                  <span className="mx-2 text-neutral-600">&rarr;</span>
                  <span className="text-neutral-400">{formatPrice(entry.old_price)}</span>
                  <span className="mx-1 text-neutral-600">&rarr;</span>
                  <span className={entry.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}>{formatPrice(entry.new_price)}</span>
                </div>
                <SourceBadge source={entry.source} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
