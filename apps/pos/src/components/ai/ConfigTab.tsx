import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload } from 'lucide-react';
import { AIConfig, CategoryRole } from '../../types';

interface ConfigTabProps {
  config: AIConfig;
  categoryRoles: CategoryRole[];
  saving: boolean;
  onConfigUpdate: (key: string, value: string) => void;
  onRoleUpdate: (categoryId: number, role: string) => void;
  onExport: () => void;
  onImport: () => void;
}

export default function ConfigTab({ config, categoryRoles, saving, onConfigUpdate, onRoleUpdate, onExport, onImport }: ConfigTabProps) {
  const { t } = useTranslation('reports');

  return (
    <div className="space-y-6">
      {/* Export/Import */}
      <div className="flex gap-3">
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          <Download size={16} /> {t('ai.config.exportConfig')}
        </button>
        <button
          onClick={onImport}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
        >
          <Upload size={16} /> {t('ai.config.importConfig')}
        </button>
      </div>

      {/* Category Role Mapping */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <h3 className="text-lg font-bold text-white mb-4">{t('ai.config.categoryRoleMapping')}</h3>
        <div className="space-y-3">
          {categoryRoles.map((cr) => (
            <div key={cr.category_id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
              <span className="text-white font-medium">{cr.category_name}</span>
              <select
                value={cr.role}
                onChange={(e) => onRoleUpdate(cr.category_id, e.target.value)}
                className="px-3 py-1 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
              >
                <option value="main">{t('ai.config.roles.main')}</option>
                <option value="side">{t('ai.config.roles.side')}</option>
                <option value="drink">{t('ai.config.roles.drink')}</option>
                <option value="combo">{t('ai.config.roles.combo')}</option>
                <option value="dessert">{t('ai.config.roles.dessert')}</option>
                <option value="addon">{t('ai.config.roles.addon')}</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Config Key-Value Editor */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <h3 className="text-lg font-bold text-white mb-4">{t('ai.config.aiSettings')}</h3>
        <div className="space-y-3">
          {Object.entries(config).filter(([key]) => key !== 'grok_max_calls_per_hour' && key !== 'grok_model').map(([key, entry]) => (
            <div key={key} className="flex items-center gap-4 p-3 bg-neutral-800 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{key}</p>
                {entry.description && (
                  <p className="text-neutral-500 text-xs truncate">{entry.description}</p>
                )}
              </div>
              {entry.value === '0' || entry.value === '1' ? (
                <button
                  onClick={() => onConfigUpdate(key, entry.value === '1' ? '0' : '1')}
                  disabled={saving}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    entry.value === '1'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                  }`}
                >
                  {entry.value === '1' ? t('ai.config.on') : t('ai.config.off')}
                </button>
              ) : (
                <input
                  type="text"
                  defaultValue={entry.value}
                  onBlur={(e) => {
                    if (e.target.value !== entry.value) {
                      onConfigUpdate(key, e.target.value);
                    }
                  }}
                  className="w-48 px-3 py-1.5 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-600"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
