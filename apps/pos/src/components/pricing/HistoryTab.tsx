import React from 'react';
import { useTranslation } from 'react-i18next';
import { History, Undo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PriceHistoryEntry } from '../../types';
import { formatPrice } from '../../utils/currency';
import SourceBadge from './SourceBadge';

export default function HistoryTab({ history, total, page, source, onPageChange, onSourceChange, onRevert }: {
  history: PriceHistoryEntry[];
  total: number;
  page: number;
  source: string;
  onPageChange: (p: number) => void;
  onSourceChange: (s: string) => void;
  onRevert: (id: number) => void;
}) {
  const { t } = useTranslation('admin');
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={source}
          onChange={e => onSourceChange(e.target.value)}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
        >
          <option value="">{t('pricing.allSources')}</option>
          <option value="manual">{t('pricing.manual')}</option>
          <option value="ai_suggestion">{t('pricing.aiSuggestion')}</option>
          <option value="scheduled_rule">{t('pricing.scheduledRule')}</option>
          <option value="ab_test">{t('pricing.abTest')}</option>
          <option value="revert">{t('pricing.revert')}</option>
        </select>
        <span className="text-neutral-500 text-sm">{total} {t('pricing.entries')}</span>
      </div>

      {history.length === 0 ? (
        <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 text-center">
          <History size={40} className="mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">{t('pricing.noChangesRecorded')}</p>
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('pricing.date')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('pricing.item')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('pricing.priceChange')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('pricing.source')}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('pricing.revenueImpact')}</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('pricing.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className={`border-t border-neutral-800 ${h.reverted_at ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-neutral-400 text-sm whitespace-nowrap">
                    {new Date(h.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{h.item_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-neutral-500">{formatPrice(h.old_price)}</span>
                    <span className="mx-1 text-neutral-600">&rarr;</span>
                    <span className={h.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}>
                      {formatPrice(h.new_price)}
                    </span>
                    <span className={`ml-1 text-xs ${h.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                      ({h.change_percent > 0 ? '+' : ''}{h.change_percent.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3"><SourceBadge source={h.source} /></td>
                  <td className="px-4 py-3 text-sm">
                    {h.revenue_after_daily != null && h.revenue_before_daily != null ? (
                      <span className={(h.revenue_after_daily - h.revenue_before_daily) >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {(h.revenue_after_daily - h.revenue_before_daily) >= 0 ? '+' : ''}
                        {formatPrice(h.revenue_after_daily - h.revenue_before_daily)}{t('pricing.perDay')}
                      </span>
                    ) : (
                      <span className="text-neutral-600">{t('pricing.statusPending')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!h.reverted_at && h.source !== 'revert' && (
                      <button onClick={() => onRevert(h.id)} className="p-1.5 text-neutral-400 hover:text-amber-400 transition-colors" title={t('pricing.revert')}>
                        <Undo2 size={16} />
                      </button>
                    )}
                    {h.reverted_at && <span className="text-xs text-neutral-600">{t('pricing.statusReverted')}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft size={16} /> {t('pricing.prev')}
              </button>
              <span className="text-sm text-neutral-500">{t('pricing.page')} {page} {t('pricing.of')} {totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white disabled:opacity-30"
              >
                {t('pricing.next')} <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
