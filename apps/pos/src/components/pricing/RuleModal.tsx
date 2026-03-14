import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { PricingRule, MenuItem, MenuCategory } from '../../types';
import { formatPrice } from '../../utils/currency';

export default function RuleModal({ rule, categories, menuItems, onChange, onSave, onClose }: {
  rule: Partial<PricingRule>;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  onChange: (r: Partial<PricingRule>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');

  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{rule.id ? t('pricing.editRule') : t('pricing.createRule')}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.name')}</label>
            <input
              value={rule.name || ''}
              onChange={e => onChange({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              placeholder={t('pricing.namePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.type')}</label>
            <select
              value={rule.rule_type || 'happy_hour'}
              onChange={e => onChange({ ...rule, rule_type: e.target.value as any })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              <option value="happy_hour">{t('pricing.ruleTypes.happy_hour')}</option>
              <option value="day_of_week">{t('pricing.ruleTypes.day_of_week')}</option>
              <option value="seasonal">{t('pricing.ruleTypes.seasonal')}</option>
              <option value="demand_based">{t('pricing.ruleTypes.demand_based')}</option>
              <option value="custom">{t('pricing.ruleTypes.custom')}</option>
            </select>
          </div>

          {/* Conditions based on type */}
          {(rule.rule_type === 'happy_hour' || rule.rule_type === 'day_of_week') && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.hoursLabel')}</label>
              <input
                value={rule.conditions?.hours || ''}
                onChange={e => onChange({ ...rule, conditions: { ...rule.conditions, hours: e.target.value } })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                placeholder={t('pricing.hoursPlaceholder')}
              />
            </div>
          )}

          {rule.rule_type === 'day_of_week' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.days')}</label>
              <div className="flex gap-2">
                {dayKeys.map((dayKey, i) => {
                  const days = rule.conditions?.days || [];
                  const active = days.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => onChange({
                        ...rule,
                        conditions: { ...rule.conditions, days: active ? days.filter((d: number) => d !== i) : [...days, i] }
                      })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'bg-brand-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                      {t(`pricing.dayNames.${dayKey}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {rule.rule_type === 'seasonal' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.startDate')}</label>
                <input
                  type="date"
                  value={rule.conditions?.date_range?.[0] || ''}
                  onChange={e => onChange({ ...rule, conditions: { ...rule.conditions, date_range: [e.target.value, rule.conditions?.date_range?.[1] || ''] } })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.endDate')}</label>
                <input
                  type="date"
                  value={rule.conditions?.date_range?.[1] || ''}
                  onChange={e => onChange({ ...rule, conditions: { ...rule.conditions, date_range: [rule.conditions?.date_range?.[0] || '', e.target.value] } })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.adjustmentType')}</label>
              <select
                value={rule.adjustment_type || 'percent'}
                onChange={e => onChange({ ...rule, adjustment_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              >
                <option value="percent">{t('pricing.percentage')}</option>
                <option value="fixed">{t('pricing.fixedMxn')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.value')}</label>
              <input
                type="number"
                value={rule.adjustment_value ?? 0}
                onChange={e => onChange({ ...rule, adjustment_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                placeholder={t('pricing.valuePlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.appliesTo')}</label>
            <select
              value={rule.applies_to?.scope || 'all'}
              onChange={e => onChange({ ...rule, applies_to: { scope: e.target.value as any, ids: e.target.value === 'all' ? undefined : [] } })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              <option value="all">{t('pricing.allItems')}</option>
              <option value="categories">{t('pricing.specificCategories')}</option>
              <option value="items">{t('pricing.specificItems')}</option>
            </select>
          </div>

          {rule.applies_to?.scope === 'categories' && (
            <div className="flex flex-wrap gap-2">
              {categories.map(c => {
                const selected = (rule.applies_to?.ids || []).includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      const ids = rule.applies_to?.ids || [];
                      onChange({ ...rule, applies_to: { scope: 'categories', ids: selected ? ids.filter(x => x !== c.id) : [...ids, c.id] } });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selected ? 'bg-brand-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}

          {rule.applies_to?.scope === 'items' && (
            <select
              value=""
              onChange={e => {
                const id = parseInt(e.target.value);
                if (id) {
                  const ids = rule.applies_to?.ids || [];
                  if (!ids.includes(id)) onChange({ ...rule, applies_to: { scope: 'items', ids: [...ids, id] } });
                }
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            >
              <option value="">{t('pricing.addItem')}</option>
              {menuItems.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>{m.name} - {formatPrice(m.price)}</option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.priority')}</label>
              <input
                type="number"
                value={rule.priority ?? 0}
                onChange={e => onChange({ ...rule, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.auto_apply || false}
                  onChange={e => onChange({ ...rule, auto_apply: e.target.checked })}
                  className="accent-brand-600"
                />
                {t('pricing.autoApply')}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">{t('pricing.descriptionOptional')}</label>
            <input
              value={rule.description || ''}
              onChange={e => onChange({ ...rule, description: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              placeholder={t('pricing.descriptionPlaceholder')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors">
            {t('pricing.cancel')}
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors">
            {rule.id ? t('pricing.updateRule') : t('pricing.createRule')}
          </button>
        </div>
      </div>
    </div>
  );
}
