import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, Calendar,
} from 'lucide-react';
import { getBankReconciliation, type ReconciliationResult, type ReconciliationItem } from '../../api';

function formatCurrency(amount: number | null): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string; label: string }> = {
  matched: {
    icon: <CheckCircle2 size={16} />,
    bg: 'bg-green-600/20',
    text: 'text-green-400',
    label: 'Matched',
  },
  partial: {
    icon: <AlertTriangle size={16} />,
    bg: 'bg-amber-600/20',
    text: 'text-amber-400',
    label: 'Partial',
  },
  missing: {
    icon: <XCircle size={16} />,
    bg: 'bg-red-600/20',
    text: 'text-red-400',
    label: 'Missing',
  },
};

const DeliveryReconciliation: React.FC = () => {
  const [data, setData] = useState<ReconciliationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getBankReconciliation(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
        <div className="h-5 w-48 bg-neutral-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-neutral-800 rounded animate-pulse" />
          ))}
        </div>
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

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center">
        <p className="text-neutral-400">No delivery platform payouts to reconcile for this period.</p>
        <p className="text-neutral-500 text-sm mt-1">Connect a bank and process delivery orders to see reconciliation.</p>
      </div>
    );
  }

  const { items, summary } = data;

  return (
    <div className="space-y-4">
      {/* Date Filter */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">From</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-neutral-800 text-white rounded-lg pl-8 pr-3 py-2 border border-neutral-700 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-neutral-500 mb-1">Total Expected</p>
          <p className="text-xl font-bold text-white">{formatCurrency(summary.totalExpected)}</p>
        </div>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-green-400 mb-1">Confirmed Received</p>
          <p className="text-xl font-bold text-green-400">{formatCurrency(summary.totalConfirmed + summary.totalPartial)}</p>
        </div>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-red-400 mb-1">Unconfirmed</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(summary.totalUnconfirmed)}</p>
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-neutral-400 border-b border-neutral-800">
                <th className="text-left p-3">Platform</th>
                <th className="text-right p-3">Expected Payout</th>
                <th className="text-right p-3">Bank Deposit</th>
                <th className="text-right p-3">Difference</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: ReconciliationItem) => {
                const cfg = STATUS_CONFIG[item.status];
                return (
                  <tr key={item.platformId} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                    <td className="p-3">
                      <span className="text-white font-medium">{item.displayName}</span>
                      <span className="text-neutral-500 text-xs ml-2">{item.orderCount} orders</span>
                      {item.matchedDate && (
                        <p className="text-neutral-600 text-xs mt-0.5">
                          Deposit: {new Date(item.matchedDate + 'T12:00:00').toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-right text-white font-medium">
                      {formatCurrency(item.expectedPayout)}
                    </td>
                    <td className="p-3 text-right">
                      {item.depositAmount != null ? (
                        <span className="text-white font-medium">{formatCurrency(item.depositAmount)}</span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {item.difference != null ? (
                        <span className={item.difference >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {item.difference >= 0 ? '+' : ''}{formatCurrency(item.difference)}
                        </span>
                      ) : (
                        <span className="text-neutral-600">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveryReconciliation;
