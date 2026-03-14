import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlaskConical, Plus } from 'lucide-react';
import { PricingExperiment, MenuItem } from '../../types';
import { formatPrice } from '../../utils/currency';

export default function ExperimentsTab({ experiments, menuItems, onUpdate, onApplyWinner, onCreate }: {
  experiments: PricingExperiment[];
  menuItems: MenuItem[];
  onUpdate: (id: number, data: any) => void;
  onApplyWinner: (id: number) => void;
  onCreate: () => void;
}) {
  const { t } = useTranslation('admin');

  const statusColors: Record<string, string> = {
    draft: 'bg-neutral-700 text-neutral-400',
    running: 'bg-green-900/40 text-green-400',
    paused: 'bg-amber-900/40 text-amber-400',
    completed: 'bg-blue-900/40 text-blue-400',
    cancelled: 'bg-red-900/40 text-red-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FlaskConical size={20} className="text-purple-500" />
          {t('pricing.abExperiments')}
        </h3>
        <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors">
          <Plus size={16} /> {t('pricing.newExperiment')}
        </button>
      </div>

      {experiments.length === 0 ? (
        <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 text-center">
          <FlaskConical size={40} className="mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">{t('pricing.noExperimentsYet')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map(exp => (
            <div key={exp.id} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-bold">{exp.name}</h4>
                  <p className="text-neutral-500 text-sm">{exp.item_name} &middot; {exp.split_percent}/{100 - exp.split_percent} split</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[exp.status]}`}>
                  {exp.status}
                </span>
              </div>

              {/* Variant Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-lg border ${exp.results?.winner === 'a' ? 'border-green-600 bg-green-900/10' : 'border-neutral-700 bg-neutral-800'}`}>
                  <p className="text-sm text-neutral-400 mb-1">{t('pricing.variantA')}</p>
                  <p className="text-xl font-bold text-white">{formatPrice(exp.variant_a_price)}</p>
                  {exp.results?.variant_a && (
                    <div className="mt-2 text-xs text-neutral-500">
                      <p>{exp.results.variant_a.orders} {t('pricing.ordersLabel')}</p>
                      <p>{formatPrice(exp.results.variant_a.revenue)} {t('pricing.revenueLabel')}</p>
                    </div>
                  )}
                  {exp.results?.winner === 'a' && <p className="text-green-400 text-xs font-bold mt-1">{t('pricing.winner')}</p>}
                </div>
                <div className={`p-4 rounded-lg border ${exp.results?.winner === 'b' ? 'border-green-600 bg-green-900/10' : 'border-neutral-700 bg-neutral-800'}`}>
                  <p className="text-sm text-neutral-400 mb-1">{t('pricing.variantB')}</p>
                  <p className="text-xl font-bold text-white">{formatPrice(exp.variant_b_price)}</p>
                  {exp.results?.variant_b && (
                    <div className="mt-2 text-xs text-neutral-500">
                      <p>{exp.results.variant_b.orders} {t('pricing.ordersLabel')}</p>
                      <p>{formatPrice(exp.results.variant_b.revenue)} {t('pricing.revenueLabel')}</p>
                    </div>
                  )}
                  {exp.results?.winner === 'b' && <p className="text-green-400 text-xs font-bold mt-1">{t('pricing.winner')}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {exp.status === 'draft' && (
                  <button onClick={() => onUpdate(exp.id, { status: 'running' })} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    {t('pricing.start')}
                  </button>
                )}
                {exp.status === 'running' && (
                  <button onClick={() => onUpdate(exp.id, { status: 'paused' })} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                    {t('pricing.pause')}
                  </button>
                )}
                {exp.status === 'paused' && (
                  <button onClick={() => onUpdate(exp.id, { status: 'running' })} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    {t('pricing.resume')}
                  </button>
                )}
                {exp.results?.winner && exp.status !== 'completed' && (
                  <button onClick={() => onApplyWinner(exp.id)} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                    {t('pricing.applyWinner')}
                  </button>
                )}
                {(exp.status === 'running' || exp.status === 'paused') && (
                  <button onClick={() => onUpdate(exp.id, { status: 'cancelled' })} className="px-3 py-1.5 bg-neutral-700 text-neutral-300 rounded-lg text-sm hover:bg-neutral-600 transition-colors">
                    {t('pricing.cancel')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
