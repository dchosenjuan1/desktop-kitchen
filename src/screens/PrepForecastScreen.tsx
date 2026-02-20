import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import { getPrepForecast } from '../api';
import { PrepForecast } from '../types';

export default function PrepForecastScreen() {
  const { t } = useTranslation('inventory');

  const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    restock_needed: { bg: 'bg-brand-900/20 border-brand-800', text: 'text-brand-400', label: t('prepForecast.status.restockNeeded') },
    prep_extra: { bg: 'bg-amber-900/20 border-amber-800', text: 'text-amber-400', label: t('prepForecast.status.prepExtra') },
    sufficient: { bg: 'bg-green-900/20 border-green-800', text: 'text-green-400', label: t('prepForecast.status.sufficient') },
  };

  const [forecast, setForecast] = useState<PrepForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadForecast();
  }, [selectedDate]);

  const loadForecast = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPrepForecast(selectedDate);
      setForecast(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.failedLoadForecast'));
    } finally {
      setLoading(false);
    }
  };

  const restockCount = forecast?.items.filter((i) => i.prep_action === 'restock_needed').length || 0;
  const prepExtraCount = forecast?.items.filter((i) => i.prep_action === 'prep_extra').length || 0;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <Calendar className="text-brand-500" size={28} />
          <h1 className="text-3xl font-black tracking-tighter">{t('prepForecast.title')}</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Date Picker & Summary */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-white">{t('prepForecast.date')}</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white focus:outline-none focus:border-brand-600"
            />
          </div>
          {forecast && (
            <div className="flex gap-4 ml-auto">
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2">
                <p className="text-neutral-400 text-xs">{t('prepForecast.day')}</p>
                <p className="text-white font-bold">{forecast.day_of_week}</p>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2">
                <p className="text-neutral-400 text-xs">{t('prepForecast.estOrders')}</p>
                <p className="text-white font-bold">{forecast.estimated_orders}</p>
              </div>
              <div className="bg-brand-900/30 border border-brand-800 rounded-lg px-4 py-2">
                <p className="text-brand-400 text-xs">{t('prepForecast.needRestock')}</p>
                <p className="text-brand-400 font-bold">{restockCount}</p>
              </div>
              <div className="bg-amber-900/30 border border-amber-800 rounded-lg px-4 py-2">
                <p className="text-amber-400 text-xs">{t('prepForecast.prepExtra')}</p>
                <p className="text-amber-400 font-bold">{prepExtraCount}</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-brand-900/30 border border-brand-800 rounded-lg p-4 mb-6">
            <p className="text-brand-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center text-neutral-400 py-12">{t('prepForecast.loading')}</div>
        ) : !forecast || forecast.items.length === 0 ? (
          <div className="text-center text-neutral-500 py-12">
            <Package size={48} className="mx-auto mb-3 opacity-50" />
            <p>{t('prepForecast.noData')}</p>
            <p className="text-sm mt-1">{t('prepForecast.linkHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {forecast.items.map((item) => {
              const style = ACTION_STYLES[item.prep_action] || ACTION_STYLES.sufficient;
              return (
                <div
                  key={item.inventory_item_id}
                  className={`${style.bg} border rounded-lg p-4 transition-colors`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {item.prep_action === 'restock_needed' && <AlertTriangle size={20} className="text-brand-400" />}
                      {item.prep_action === 'prep_extra' && <Package size={20} className="text-amber-400" />}
                      {item.prep_action === 'sufficient' && <CheckCircle size={20} className="text-green-400" />}
                      <div>
                        <p className="text-white font-bold">{item.item_name}</p>
                        <p className="text-neutral-400 text-xs">{item.unit}</p>
                      </div>
                    </div>
                    <span className={`${style.text} text-xs font-bold uppercase`}>{style.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                    <div>
                      <p className="text-neutral-500">{t('prepForecast.columns.needed')}</p>
                      <p className="text-white font-bold">{item.expected_quantity_needed}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">{t('prepForecast.columns.inStock')}</p>
                      <p className="text-white font-bold">{item.current_stock}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">{t('prepForecast.columns.deficit')}</p>
                      <p className={`font-bold ${item.deficit > 0 ? 'text-brand-400' : 'text-green-400'}`}>
                        {item.deficit > 0 ? `-${item.deficit}` : t('prepForecast.ok')}
                      </p>
                    </div>
                  </div>
                  {item.menu_items_using.length > 0 && (
                    <div className="mt-2 text-xs text-neutral-500">
                      {t('prepForecast.columns.usedBy')} {item.menu_items_using.map((m) => m.menu_item_name).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
