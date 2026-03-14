import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { getRevenue, type MonthlyData } from '../../api/superAdmin';

export default function RevenueTab() {
  const { t } = useTranslation('superAdmin');
  const [data, setData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRevenue(12).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-neutral-400 text-center py-12">{t('revenue.loading')}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-5">
        <h3 className="text-white font-semibold mb-4">{t('revenue.monthlyRevenueOrders')}</h3>
        {data.length === 0 ? (
          <div className="text-neutral-500 text-center py-8">{t('revenue.noData')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" tick={{ fill: '#999', fontSize: 11 }} />
              <YAxis yAxisId="rev" orientation="left" tick={{ fill: '#999', fontSize: 11 }} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fill: '#999', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
              <Legend />
              <Bar yAxisId="rev" dataKey="revenue" name={t('revenue.revenueLabel')} fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="orders" dataKey="order_count" name={t('revenue.ordersLabel')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
