import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getLiveDashboard } from '../api';
import { LiveDashboardData } from '../types';
import { formatPrice } from '../utils/currency';
import { formatTime } from '../utils/dateFormat';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ArrowLeft, Maximize, RefreshCw } from 'lucide-react';

const COLORS = ['#dc2626', '#16a34a', '#2563eb', '#ca8a04'];

export default function LiveDashboardScreen() {
  const { t } = useTranslation('reports');
  const navigate = useNavigate();
  const [data, setData] = useState<LiveDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const result = await getLiveDashboard();
      setData(result);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch live dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen failed:', err);
    }
  };

  const kpis = data?.kpis || { order_count: 0, revenue: 0, avg_ticket: 0, tips: 0, cash_orders: 0, card_orders: 0, cash_revenue: 0, card_revenue: 0 };

  const paymentPieData = [
    { name: t('dashboard.sections.card'), value: kpis.card_revenue || 0 },
    { name: t('dashboard.sections.cash'), value: kpis.cash_revenue || 0 },
  ].filter(d => d.value > 0);

  const hourlyData = (data?.hourly || []).map(h => ({
    ...h,
    label: `${h.hour}:00`,
  }));

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'pos': return t('dashboard.sections.inStore');
      case 'uber_eats': return t('dashboard.sections.uberEats');
      case 'rappi': return t('dashboard.sections.rappi');
      case 'didi_food': return t('dashboard.sections.didiFood');
      default: return source;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-black tracking-tighter">{t('dashboard.title')}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{formatTime(currentTime)}</div>
            <div className="text-xs text-neutral-500">
              {t('dashboard.updated')} {formatTime(lastUpdate)}
            </div>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <RefreshCw size={20} />
          </button>
          <button onClick={handleFullscreen} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors border border-neutral-700">
            <Maximize size={20} />
          </button>
          <img src="/logo.png" alt="Juanberto's" className="h-10" />
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-xl text-neutral-400 animate-pulse">{t('dashboard.loading')}</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm">{t('dashboard.kpi.revenue')}</p>
              <p className="text-4xl font-bold text-brand-500 mt-1">{formatPrice(kpis.revenue || 0)}</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm">{t('dashboard.kpi.orders')}</p>
              <p className="text-4xl font-bold text-white mt-1">{kpis.order_count}</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm">{t('dashboard.kpi.avgTicket')}</p>
              <p className="text-4xl font-bold text-white mt-1">{formatPrice(kpis.avg_ticket || 0)}</p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm">{t('dashboard.kpi.tips')}</p>
              <p className="text-4xl font-bold text-green-400 mt-1">{formatPrice(kpis.tips || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hourly Chart */}
            <div className="lg:col-span-2 bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-bold mb-4">{t('dashboard.sections.hourlyRevenue')}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                  <XAxis dataKey="label" stroke="#737373" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#737373" />
                  <Tooltip
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }}
                    labelStyle={{ color: '#a3a3a3' }}
                  />
                  <Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Cash/Card Donut */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-bold mb-4">{t('dashboard.sections.paymentMethods')}</h3>
              {paymentPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentPieData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatPrice(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-around text-sm mt-2">
                    <div className="text-center">
                      <p className="text-neutral-400">{t('dashboard.sections.card')}</p>
                      <p className="font-bold text-brand-400">{kpis.card_orders} {t('dashboard.sections.orders')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-neutral-400">{t('dashboard.sections.cash')}</p>
                      <p className="font-bold text-green-400">{kpis.cash_orders} {t('dashboard.sections.orders')}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-neutral-500">
                  {t('dashboard.empty.noPayments')}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Items */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-bold mb-4">{t('dashboard.sections.topItems')}</h3>
              {data?.topItems && data.topItems.length > 0 ? (
                <div className="space-y-3">
                  {data.topItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-neutral-600 w-8">#{i + 1}</span>
                        <span className="font-semibold">{item.item_name}</span>
                      </div>
                      <span className="bg-neutral-800 px-3 py-1 rounded-full font-bold">{t('dashboard.sections.sold', { qty: item.qty })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">{t('dashboard.empty.noOrders')}</p>
              )}
            </div>

            {/* Channel Breakdown */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-bold mb-4">{t('dashboard.sections.orderSources')}</h3>
              {data?.sources && data.sources.length > 0 ? (
                <div className="space-y-3">
                  {data.sources.map((source, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                      <span className="font-semibold">{getSourceLabel(source.source)}</span>
                      <div className="text-right">
                        <p className="font-bold text-brand-400">{formatPrice(source.revenue || 0)}</p>
                        <p className="text-xs text-neutral-400">{source.count} {t('dashboard.sections.orders')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">{t('dashboard.empty.noOrders')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
