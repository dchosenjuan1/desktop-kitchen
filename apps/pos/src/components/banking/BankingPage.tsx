import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Search, ChevronLeft, ChevronRight,
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  Landmark, PiggyBank, CreditCard, Wallet, TrendingUp,
} from 'lucide-react';
import FeatureGate from '../FeatureGate';
import BankConnectionCard from './BankConnectionCard';
import ConnectBankButton from './ConnectBankButton';
import DeliveryReconciliation from './DeliveryReconciliation';
import { usePlan } from '../../context/PlanContext';
import {
  getBankConnections, getBankAccounts, getBankTransactions, syncBankConnection, deleteBankConnection,
  type BankConnection, type BankAccount, type BankTransaction,
} from '../../api';

function formatCurrency(amount: number | null, currency = 'MXN'): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const TX_TYPE_ICONS: Record<string, React.ReactNode> = {
  INFLOW: <ArrowDownCircle size={14} className="text-green-400" />,
  OUTFLOW: <ArrowUpCircle size={14} className="text-red-400" />,
  TRANSFER: <ArrowLeftRight size={14} className="text-blue-400" />,
};

const ACCT_TYPE_ICONS: Record<string, React.ReactNode> = {
  checking: <Landmark size={14} className="text-blue-400" />,
  savings: <PiggyBank size={14} className="text-green-400" />,
  credit_card: <CreditCard size={14} className="text-amber-400" />,
  loan: <Wallet size={14} className="text-red-400" />,
  investment: <TrendingUp size={14} className="text-purple-400" />,
};

const PAGE_SIZE = 50;

const BankingPage: React.FC = () => {
  const { t } = useTranslation('admin');
  const { isFeatureLocked } = usePlan();
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(0);

  const [loadingConns, setLoadingConns] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);

  // Filters
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [filterEndDate, setFilterEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadConnections = useCallback(async () => {
    setLoadingConns(true);
    try {
      const data = await getBankConnections();
      setConnections(data);
    } catch {
      // handled by empty state
    } finally {
      setLoadingConns(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const data = await getBankAccounts();
      setAccounts(data);
    } catch {
      // handled by empty state
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const loadTransactions = useCallback(async (page = 0) => {
    setLoadingTx(true);
    try {
      const { transactions: txs, totalCount } = await getBankTransactions({
        accountId: filterAccountId || undefined,
        startDate: filterStartDate,
        endDate: filterEndDate,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setTransactions(txs);
      setTxTotal(totalCount);
      setTxPage(page);
    } catch {
      setTransactions([]);
      setTxTotal(0);
    } finally {
      setLoadingTx(false);
    }
  }, [filterAccountId, filterStartDate, filterEndDate]);

  const loadAll = useCallback(() => {
    loadConnections();
    loadAccounts();
    loadTransactions(0);
  }, [loadConnections, loadAccounts, loadTransactions]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSync = async (connectionId: string) => {
    await syncBankConnection(connectionId);
    loadAll();
  };

  const handleDisconnect = async (connectionId: string) => {
    await deleteBankConnection(connectionId);
    loadAll();
  };

  const handleFilterChange = () => {
    loadTransactions(0);
  };

  // Apply local search filter on top of server results
  const filteredTx = searchTerm
    ? transactions.filter(tx =>
        (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.merchant_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : transactions;

  const totalPages = Math.ceil(txTotal / PAGE_SIZE);

  return (
    <FeatureGate feature="banking" featureLabel="Bank account connectivity">
      <div className="min-h-screen bg-neutral-950">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
              </Link>
              <h1 className="text-3xl font-black tracking-tighter">{t('banking.title')}</h1>
            </div>
            <ConnectBankButton onSuccess={loadAll} />
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-6 space-y-8">
          {/* ── Connections ── */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">{t('banking.connections')}</h2>
            {loadingConns ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-28 bg-neutral-900 rounded-lg border border-neutral-800 animate-pulse" />
                ))}
              </div>
            ) : connections.length === 0 ? (
              <ConnectBankButton variant="card" onSuccess={loadAll} />
            ) : (
              <div className="space-y-3">
                {connections.map(conn => (
                  <BankConnectionCard
                    key={conn.id}
                    connection={conn}
                    accounts={accounts}
                    onSync={handleSync}
                    onDisconnect={handleDisconnect}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Accounts Table ── */}
          {accounts.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">{t('banking.allAccounts')}</h2>
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-neutral-400 border-b border-neutral-800">
                        <th className="text-left p-3">{t('banking.account')}</th>
                        <th className="text-left p-3">{t('banking.type')}</th>
                        <th className="text-left p-3">{t('banking.institution')}</th>
                        <th className="text-right p-3">{t('banking.balance')}</th>
                        <th className="text-right p-3">{t('banking.available')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(loadingAccounts ? [] : accounts).map(acct => (
                        <tr key={acct.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                          <td className="p-3">
                            <span className="text-white font-medium">{acct.name}</span>
                            {acct.last_four && (
                              <span className="text-neutral-500 ml-1.5 text-xs">****{acct.last_four}</span>
                            )}
                            {acct.is_primary && (
                              <span className="ml-2 px-1.5 py-0.5 bg-brand-600/20 text-brand-400 rounded text-xs font-medium">
                                {t('banking.primary')}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1.5 text-neutral-300 capitalize">
                              {ACCT_TYPE_ICONS[acct.type || 'other']}
                              {(acct.type || 'other').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-neutral-400">{acct.institution_name || '-'}</td>
                          <td className="p-3 text-right text-white font-medium">
                            {formatCurrency(acct.balance_current, acct.currency)}
                          </td>
                          <td className="p-3 text-right text-neutral-400">
                            {formatCurrency(acct.balance_available, acct.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {loadingAccounts && (
                  <div className="p-6">
                    <div className="h-10 bg-neutral-800 rounded animate-pulse" />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Payout Reconciliation ── */}
          {connections.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-white mb-3">{t('banking.payoutReconciliation')}</h2>
              {isFeatureLocked('bankReconciliation') ? (
                <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center">
                  <p className="text-neutral-400">{t('banking.payoutReconciliationPlanMsg')}</p>
                  <p className="text-neutral-500 text-sm mt-1">{t('banking.payoutReconciliationDesc')}</p>
                </div>
              ) : (
                <DeliveryReconciliation />
              )}
            </section>
          )}

          {/* ── Transactions ── */}
          <section>
            <h2 className="text-lg font-bold text-white mb-3">{t('banking.transactions')}</h2>

            {/* Filters */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 mb-3">
              <div className="flex flex-wrap items-end gap-3">
                {/* Account Filter */}
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs text-neutral-500 mb-1">{t('banking.account')}</label>
                  <select
                    value={filterAccountId}
                    onChange={e => { setFilterAccountId(e.target.value); }}
                    className="w-full bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">{t('banking.allAccounts')}</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name}{a.last_four ? ` ****${a.last_four}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">{t('banking.from')}</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                    className="bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">{t('banking.to')}</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                    className="bg-neutral-800 text-white rounded-lg px-3 py-2 border border-neutral-700 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {/* Apply */}
                <button
                  onClick={handleFilterChange}
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                >
                  {t('common:buttons.apply')}
                </button>

                {/* Search */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs text-neutral-500 mb-1">{t('banking.search')}</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder={t('banking.searchPlaceholder')}
                      className="w-full bg-neutral-800 text-white rounded-lg pl-8 pr-3 py-2 border border-neutral-700 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
              {loadingTx ? (
                <div className="space-y-0">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-12 border-b border-neutral-800/50 animate-pulse bg-neutral-800/30" />
                  ))}
                </div>
              ) : filteredTx.length === 0 ? (
                <div className="p-12 text-center">
                  <Landmark size={40} className="mx-auto text-neutral-600 mb-3" />
                  <p className="text-neutral-400">{t('banking.noTransactions')}</p>
                  <p className="text-neutral-500 text-sm mt-1">
                    {connections.length === 0 ? t('banking.connectToSee') : t('banking.adjustFilters')}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-neutral-400 border-b border-neutral-800">
                          <th className="text-left p-3 w-28">{t('banking.date')}</th>
                          <th className="text-left p-3">{t('banking.description')}</th>
                          <th className="text-left p-3">{t('banking.category')}</th>
                          <th className="text-right p-3">{t('banking.amount')}</th>
                          <th className="text-left p-3">{t('banking.account')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTx.map(tx => (
                          <tr key={tx.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                            <td className="p-3 text-neutral-400 whitespace-nowrap">
                              {formatDate(tx.transaction_date)}
                            </td>
                            <td className="p-3">
                              <span className="text-white">{tx.description || tx.merchant_name || '-'}</span>
                              {tx.merchant_name && tx.description && tx.merchant_name !== tx.description && (
                                <span className="text-neutral-500 text-xs ml-1.5">{tx.merchant_name}</span>
                              )}
                              {tx.status === 'pending' && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-amber-600/20 text-amber-400 rounded text-xs font-medium">
                                  {t('banking.pending')}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {tx.category ? (
                                <span className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-xs font-medium">
                                  {tx.category}
                                </span>
                              ) : (
                                <span className="text-neutral-600 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                {TX_TYPE_ICONS[tx.transaction_type || 'OUTFLOW']}
                                <span className={
                                  tx.transaction_type === 'INFLOW' ? 'text-green-400' :
                                  tx.transaction_type === 'TRANSFER' ? 'text-blue-400' :
                                  'text-red-400'
                                }>
                                  {tx.transaction_type === 'INFLOW' ? '+' : tx.transaction_type === 'TRANSFER' ? '' : '-'}
                                  {formatCurrency(tx.amount, tx.currency)}
                                </span>
                              </span>
                            </td>
                            <td className="p-3 text-neutral-400 whitespace-nowrap">
                              {tx.account_name}
                              {tx.last_four && (
                                <span className="text-neutral-600 ml-1">****{tx.last_four}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800">
                      <span className="text-sm text-neutral-500">
                        {txTotal} {txTotal !== 1 ? t('banking.transactions_plural') : t('banking.transaction')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadTransactions(txPage - 1)}
                          disabled={txPage === 0}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm text-neutral-400">
                          {t('banking.page')} {txPage + 1} / {totalPages}
                        </span>
                        <button
                          onClick={() => loadTransactions(txPage + 1)}
                          disabled={txPage >= totalPages - 1}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </FeatureGate>
  );
};

export default BankingPage;
