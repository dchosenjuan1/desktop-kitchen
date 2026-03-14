import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, X } from 'lucide-react';
import { PricingGuardrails, MenuItem } from '../../types';

export default function GuardrailsTab({ guardrails, menuItems, dirty, onChange, onSave }: {
  guardrails: PricingGuardrails | null;
  menuItems: MenuItem[];
  dirty: boolean;
  onChange: (g: PricingGuardrails) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation('admin');

  if (!guardrails) return null;

  const update = (field: string, value: any) => {
    onChange({ ...guardrails, [field]: value } as PricingGuardrails);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-brand-500" />
          {t('pricing.guardrails')}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-neutral-500 text-sm">{t('pricing.changesToday')} {guardrails.today_changes || 0}/{guardrails.max_daily_changes}</span>
          <button
            onClick={onSave}
            disabled={!dirty}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {dirty ? t('pricing.saveChanges') : t('pricing.saved')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Max Discount */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">{t('pricing.maxDiscount')}</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="-50"
              max="0"
              value={guardrails.min_change_percent}
              onChange={e => update('min_change_percent', parseFloat(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="text-white font-bold w-16 text-right">{guardrails.min_change_percent}%</span>
          </div>
        </div>

        {/* Max Markup */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">{t('pricing.maxMarkup')}</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="50"
              value={guardrails.max_change_percent}
              onChange={e => update('max_change_percent', parseFloat(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="text-white font-bold w-16 text-right">+{guardrails.max_change_percent}%</span>
          </div>
        </div>

        {/* Max Daily Changes */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">{t('pricing.maxDailyChanges')}</label>
          <input
            type="number"
            value={guardrails.max_daily_changes}
            onChange={e => update('max_daily_changes', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
          />
        </div>

        {/* Approval Threshold */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">{t('pricing.requireApprovalAbove')}</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="50"
              value={guardrails.require_approval_above}
              onChange={e => update('require_approval_above', parseFloat(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="text-white font-bold w-16 text-right">{guardrails.require_approval_above}%</span>
          </div>
        </div>

        {/* Cooldown Hours */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">{t('pricing.cooldownHours')}</label>
          <input
            type="number"
            value={guardrails.cooldown_hours}
            onChange={e => update('cooldown_hours', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
          />
        </div>

        {/* Notification Email */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">{t('pricing.notificationEmail')}</label>
          <input
            type="email"
            value={guardrails.notification_email || ''}
            onChange={e => update('notification_email', e.target.value)}
            placeholder={t('pricing.emailPlaceholder')}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-600"
          />
        </div>
      </div>

      {/* Protected Items */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <label className="block text-sm font-medium text-neutral-300 mb-3">{t('pricing.protectedItems')}</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(guardrails.protected_item_ids || []).map(id => {
            const item = menuItems.find(m => m.id === id);
            return (
              <span key={id} className="flex items-center gap-1 px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full text-sm text-white">
                {item?.name || `#${id}`}
                <button onClick={() => update('protected_item_ids', guardrails.protected_item_ids.filter(x => x !== id))} className="text-neutral-400 hover:text-red-400">
                  <X size={14} />
                </button>
              </span>
            );
          })}
        </div>
        <select
          value=""
          onChange={e => {
            const id = parseInt(e.target.value);
            if (id && !(guardrails.protected_item_ids || []).includes(id)) {
              update('protected_item_ids', [...(guardrails.protected_item_ids || []), id]);
            }
          }}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
        >
          <option value="">{t('pricing.addItem')}</option>
          {menuItems.filter(m => m.active && !(guardrails.protected_item_ids || []).includes(m.id)).map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
