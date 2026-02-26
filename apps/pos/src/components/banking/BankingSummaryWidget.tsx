import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, CreditCard, ArrowRight, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getBankingSummary, getBankTransactions, type BankingSummary } from '../../api';
import ConnectBankButton from './ConnectBankButton';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function buildCashFlowData(
  transactions: Array<{ transaction_date: string; transaction_type: string | null; amount: number }>
): Array<{ date: string; inflow: number; outflow: number }> {
  const byDate = new Map<string, { inflow: number; outflow: number }>();

  // Build last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    byDate.set(key, { inflow: 0, outflow: 0 });
  }

  for (const tx of transactions) {
    const entry = byDate.get(tx.transaction_date);
    if (!entry) continue;
    if (tx.transaction_type === 'INFLOW') {
      entry.inflow += Number(tx.amount) || 0;
    } else {
      entry.outflow += Number(tx.amount) || 0;
    }
  }

  return Array.from(byDate.entries()).map(([date, vals]) => ({
    date: new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
    inflow: Math.round(vals.inflow * 100) / 100,
    outflow: Math.round(vals.outflow * 100) / 100,
  }));
}

const BankingSummaryWidget: React.FC = () => {
  const [summary, setSummary] = useState<BankingSummary | null>(null);
  const [cashFlowData, setCashFlowData] = useState<Array<{ date: string; inflow: number; outflow: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, txData] = await Promise.all([
        getBankingSummary(),
        getBankTransactions({
          startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          limit: 500,
        }),
      ]);
      setSummary(summaryData);
      setCashFlowData(buildCashFlowData(txData.transactions));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      if (msg.includes('PLAN_UPGRADE_REQUIRED')) {
        setError('upgrade');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Plan-gated: don't render widget
  if (error === 'upgrade') return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-16 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="h-8 w-40 bg-neutral-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse mb-4" />
        <div className="h-32 bg-neutral-800 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center">
        <p className="text-neutral-400 text-sm">{error}</p>
        <button onClick={load} className="text-brand-400 text-sm mt-1 hover:underline">Retry</button>
      </div>
    );
  }

  // Empty state: no connections
  const accountCount = Object.values(summary?.accountsByType || {}).reduce((s, n) => s + n, 0);
  if (!summary || accountCount === 0) {
    return (
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
        <h3 className="text-white font-bold mb-4">Bank Accounts</h3>
        <ConnectBankButton variant="card" onSuccess={load} />
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">Bank Accounts</h3>
        <Link
          to="/admin/banking"
          className="text-sm text-brand-400 hover:text-brand-300 inline-flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight size={14} />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-0.5">
            <Landmark size={12} /> Total Balance
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(summary.totalBalance)}
          </p>
        </div>
        {summary.totalCreditAvailable > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-neutral-400 text-xs mb-0.5">
              <CreditCard size={12} /> Credit Available
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.totalCreditAvailable)}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-500 mb-3">
        {accountCount} account{accountCount !== 1 ? 's' : ''} connected
        {summary.lastSyncedAt && (
          <span className="ml-2 inline-flex items-center gap-1">
            <RefreshCw size={10} /> {new Date(summary.lastSyncedAt).toLocaleString('es-MX', { hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </p>

      {/* Cash Flow Chart */}
      {cashFlowData.length > 0 && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowData}>
              <defs>
                <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#737373' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#a3a3a3' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Area
                type="monotone"
                dataKey="inflow"
                stroke="#22c55e"
                fill="url(#inflowGrad)"
                strokeWidth={1.5}
                name="Inflow"
              />
              <Area
                type="monotone"
                dataKey="outflow"
                stroke="#ef4444"
                fill="url(#outflowGrad)"
                strokeWidth={1.5}
                name="Outflow"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default BankingSummaryWidget;
