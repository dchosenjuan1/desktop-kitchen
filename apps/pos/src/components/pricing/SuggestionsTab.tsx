import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Clock, RefreshCw } from 'lucide-react';
import { GrokPricingSuggestion } from '../../types';
import { formatPrice } from '../../utils/currency';

function SuggestionCard({ suggestion: s, onApply, onDismiss }: {
  suggestion: GrokPricingSuggestion;
  onApply: (s: GrokPricingSuggestion) => void;
  onDismiss: (s: GrokPricingSuggestion) => void;
}) {
  const { t } = useTranslation('admin');
  const confidenceColor = s.confidence >= 80 ? 'bg-green-600' : s.confidence >= 60 ? 'bg-amber-600' : 'bg-red-600';

  return (
    <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-white">{s.item_name}</p>
          {s.source === 'grok' && s.confidence != null && (
            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${confidenceColor}`}>
              {s.confidence}{t('pricing.confidence')}
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          s.source === 'grok' ? 'bg-purple-900/40 text-purple-400' : 'bg-neutral-700 text-neutral-400'
        }`}>
          {s.source === 'grok' ? t('pricing.aiSource') : t('pricing.heuristicSource')}
        </span>
      </div>

      <div className="flex items-center gap-2 my-2">
        <span className="text-neutral-500">{formatPrice(s.current_price)}</span>
        <span className="text-neutral-600">&rarr;</span>
        <span className={s.type === 'markup' ? 'text-amber-400 font-bold' : 'text-green-400 font-bold'}>
          {formatPrice(s.suggested_price)}
        </span>
        <span className={`text-xs ${s.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}`}>
          ({s.change_percent > 0 ? '+' : ''}{s.change_percent.toFixed(1)}%)
        </span>
      </div>

      {s.reasoning && <p className="text-neutral-400 text-xs mb-2">{s.reasoning}</p>}
      {!s.reasoning && s.reason && <p className="text-neutral-400 text-xs mb-2">{s.reason}</p>}

      {s.projected_weekly_revenue_change != null && s.projected_weekly_revenue_change !== 0 && (
        <p className="text-xs text-neutral-500 mb-3">
          Projected weekly impact: <span className={s.projected_weekly_revenue_change > 0 ? 'text-green-400' : 'text-red-400'}>
            {s.projected_weekly_revenue_change > 0 ? '+' : ''}{formatPrice(s.projected_weekly_revenue_change)}
          </span>
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={() => onApply(s)} className="flex-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          {t('pricing.apply')}
        </button>
        <button onClick={() => onDismiss(s)} className="px-3 py-1.5 bg-neutral-700 text-neutral-300 rounded-lg text-sm hover:bg-neutral-600 transition-colors">
          {t('pricing.dismiss')}
        </button>
      </div>
    </div>
  );
}

export default function SuggestionsTab({ heuristic, grok, analyzing, onAnalyze, onApply, onDismiss }: {
  heuristic: GrokPricingSuggestion[];
  grok: GrokPricingSuggestion[];
  analyzing: boolean;
  onAnalyze: () => void;
  onApply: (s: GrokPricingSuggestion) => void;
  onDismiss: (s: GrokPricingSuggestion) => void;
}) {
  const { t } = useTranslation('admin');

  return (
    <div className="space-y-6">
      {/* Grok Analysis */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-brand-500" />
            {t('pricing.aiRecommendations')}
          </h3>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {analyzing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {analyzing ? t('pricing.analyzing') : t('pricing.analyzePrices')}
          </button>
        </div>

        {grok.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grok.map(s => (
              <SuggestionCard key={s.id} suggestion={s} onApply={onApply} onDismiss={onDismiss} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm text-center py-4">
            {t('pricing.analyzeHint')}
          </p>
        )}
      </div>

      {/* Heuristic Suggestions */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={20} className="text-amber-500" />
          {t('pricing.realTimeSuggestions')}
        </h3>
        {heuristic.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heuristic.map(s => (
              <SuggestionCard key={s.id} suggestion={s} onApply={onApply} onDismiss={onDismiss} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm text-center py-4">
            {t('pricing.noRealTimeSuggestions')}
          </p>
        )}
      </div>
    </div>
  );
}
