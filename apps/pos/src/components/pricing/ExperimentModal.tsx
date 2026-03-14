import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { MenuItem } from '../../types';
import { formatPrice } from '../../utils/currency';

export default function ExperimentModal({ menuItems, onSave, onClose }: {
  menuItems: MenuItem[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const [name, setName] = useState('');
  const [itemId, setItemId] = useState<number>(0);
  const [variantB, setVariantB] = useState('');
  const [split, setSplit] = useState(50);

  const selectedItem = menuItems.find(m => m.id === itemId);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{t('pricing.newAbExperiment')}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.experimentName')}</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white" placeholder={t('pricing.experimentNamePlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.menuItem')}</label>
            <select value={itemId} onChange={e => setItemId(parseInt(e.target.value))} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white">
              <option value={0}>{t('pricing.selectItem')}</option>
              {menuItems.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>{m.name} ({formatPrice(m.price)})</option>
              ))}
            </select>
          </div>
          {selectedItem && (
            <>
              <div className="p-3 bg-neutral-800 rounded-lg text-sm">
                <span className="text-neutral-400">{t('pricing.variantACurrent')} </span>
                <span className="text-white font-bold">{formatPrice(selectedItem.price)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.variantBPrice')}</label>
                <input type="number" value={variantB} onChange={e => setVariantB(e.target.value)} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white" placeholder={t('pricing.variantBPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.trafficSplit')} ({split}/{100 - split})</label>
                <input type="range" min="10" max="90" value={split} onChange={e => setSplit(parseInt(e.target.value))} className="w-full accent-brand-600" />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors">{t('pricing.cancel')}</button>
          <button
            onClick={() => onSave({ name, menu_item_id: itemId, variant_a_price: selectedItem?.price, variant_b_price: parseFloat(variantB), split_percent: split })}
            disabled={!name || !itemId || !variantB}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {t('pricing.createExperiment')}
          </button>
        </div>
      </div>
    </div>
  );
}
