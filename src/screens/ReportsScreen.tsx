import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Download,
  AlertCircle,
  X
} from 'lucide-react';
import {
  getSalesReport,
  getTopItems,
  getEmployeePerformance,
  getHourlyReport,
  getCashCardBreakdown,
  getCOGSReport,
  getCategoryMargins,
  getContributionMargin,
  getDeliveryMargins,
  getChannelComparison,
  getPaymentFees,
  getRefundSummary,
  getFinancialProjection,
  updateFinancialTargets,
  updateFinancialActual,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/currency';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  SalesReport,
  TopItemsReport,
  EmployeePerformanceReport,
  HourlyReport,
  CashCardBreakdown,
  COGSReport,
  CategoryMargins,
  ContributionMarginReport,
  PaymentFeeSummary,
  RefundSummary,
  FinancialProjection,
} from '../types';

type Period = 'today' | 'week' | 'month';
type Tab = 'overview' | 'cashcard' | 'cogs' | 'categories' | 'margin' | 'delivery' | 'fees' | 'refunds' | 'financials';

const COLORS = ['#dc2626', '#16a34a', '#2563eb', '#ca8a04', '#7c3aed', '#ea580c'];

export default function ReportsScreen() {
  const { t } = useTranslation('reports');
  const { currentEmployee } = useAuth();
  const [period, setPeriod] = useState<Period>('today');
  const [tab, setTab] = useState<Tab>('overview');
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [topItems, setTopItems] = useState<TopItemsReport[]>([]);
  const [employeePerf, setEmployeePerf] = useState<EmployeePerformanceReport[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyReport[]>([]);
  const [cashCard, setCashCard] = useState<CashCardBreakdown | null>(null);
  const [cogsData, setCogsData] = useState<COGSReport | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryMargins | null>(null);
  const [marginData, setMarginData] = useState<ContributionMarginReport | null>(null);
  const [deliveryData, setDeliveryData] = useState<any>(null);
  const [channelData, setChannelData] = useState<any>(null);
  const [feesData, setFeesData] = useState<PaymentFeeSummary | null>(null);
  const [refundData, setRefundData] = useState<RefundSummary | null>(null);
  const [financialData, setFinancialData] = useState<FinancialProjection | null>(null);
  const [financialMonth, setFinancialMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDraft, setTargetDraft] = useState<Record<string, number>>({});
  const [actualDraft, setActualDraft] = useState<Record<string, string>>({});
  const [savingTargets, setSavingTargets] = useState(false);
  const [savingActual, setSavingActual] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canEditFinancials = currentEmployee && ['admin', 'manager'].includes(currentEmployee.role);

  useEffect(() => {
    fetchReportData();
  }, [period, tab, financialMonth]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (tab === 'overview') {
        const [sales, items, perf, hourly] = await Promise.all([
          getSalesReport(period),
          getTopItems(period, 10),
          getEmployeePerformance(period),
          getHourlyReport(),
        ]);
        setSalesData(sales);
        setTopItems(items);
        setEmployeePerf(perf);
        setHourlyData(hourly);
      } else if (tab === 'cashcard') {
        const data = await getCashCardBreakdown(period);
        setCashCard(data);
      } else if (tab === 'cogs') {
        const data = await getCOGSReport(period);
        setCogsData(data);
      } else if (tab === 'categories') {
        const data = await getCategoryMargins(period);
        setCategoryData(data);
      } else if (tab === 'margin') {
        const data = await getContributionMargin(period);
        setMarginData(data);
      } else if (tab === 'delivery') {
        const [del, chan] = await Promise.all([
          getDeliveryMargins(period),
          getChannelComparison(period),
        ]);
        setDeliveryData(del);
        setChannelData(chan);
      } else if (tab === 'fees') {
        const data = await getPaymentFees(period);
        setFeesData(data);
      } else if (tab === 'refunds') {
        const data = await getRefundSummary();
        setRefundData(data);
      } else if (tab === 'financials') {
        const data = await getFinancialProjection(financialMonth);
        setFinancialData(data);
        // Reset editing states on load
        setEditingTargets(false);
        setTargetDraft({});
        setActualDraft({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.fetchReports'));
    } finally {
      setLoading(false);
    }
  };

  const generateCSV = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Period', period],
      ['Total Revenue', salesData?.total_revenue || 0],
      ['Order Count', salesData?.order_count || 0],
      ['Avg Ticket', salesData?.avg_ticket || 0],
      ['Total Tips', salesData?.tip_total || 0],
    ];

    let csv = headers.join(',') + '\n';
    rows.forEach((row) => {
      csv += row.map((cell) => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleEditTargets = () => {
    if (!financialData) return;
    const draft: Record<string, number> = {};
    for (const row of financialData.rows) {
      draft[row.category] = row.target_percent;
    }
    setTargetDraft(draft);
    setEditingTargets(true);
  };

  const handleSaveTargets = async () => {
    setSavingTargets(true);
    try {
      const targets = Object.entries(targetDraft).map(([category, target_percent]) => ({
        category,
        target_percent,
      }));
      await updateFinancialTargets(targets);
      setEditingTargets(false);
      await fetchReportData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveTargets'));
    } finally {
      setSavingTargets(false);
    }
  };

  const handleSaveActual = async (category: string) => {
    const val = parseFloat(actualDraft[category]);
    if (isNaN(val)) return;
    setSavingActual(category);
    try {
      await updateFinancialActual({ period: financialMonth, category, amount: val });
      setActualDraft(prev => { const n = { ...prev }; delete n[category]; return n; });
      await fetchReportData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.saveActual'));
    } finally {
      setSavingActual(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case 'today': return t('sales.periods.today');
      case 'week': return t('sales.periods.week');
      case 'month': return t('sales.periods.month');
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: t('sales.tabs.overview') },
    { key: 'cashcard', label: t('sales.tabs.cashCard') },
    { key: 'cogs', label: t('sales.tabs.cogs') },
    { key: 'categories', label: t('sales.tabs.categories') },
    { key: 'margin', label: t('sales.tabs.margin') },
    { key: 'delivery', label: t('sales.tabs.delivery') },
    { key: 'fees', label: t('sales.tabs.fees') },
    { key: 'refunds', label: t('sales.tabs.refunds') },
    { key: 'financials', label: t('sales.tabs.financials') },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <img src="/logo.png" alt="Juanberto's" className="h-8" />
            <h1 className="text-3xl font-black tracking-tighter">{t('sales.title')}</h1>
          </div>
          <button
            onClick={generateCSV}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <Download size={20} />
            {t('sales.exportCsv')}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Period Selector */}
        <div className="flex gap-3 mb-4">
          {(['today', 'week', 'month'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors min-h-[44px] ${
                period === p
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                tab === tabItem.key
                  ? 'bg-neutral-700 text-white'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-neutral-900 rounded-lg border border-neutral-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm font-medium">{t('sales.kpi.totalRevenue')}</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">{formatCurrency(salesData?.total_revenue || 0)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm font-medium">{t('sales.kpi.orderCount')}</p>
                    <p className="text-3xl font-bold text-white mt-2">{salesData?.order_count || 0}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm font-medium">{t('sales.kpi.avgTicket')}</p>
                    <p className="text-3xl font-bold text-white mt-2">{formatCurrency(salesData?.avg_ticket || 0)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm font-medium">{t('sales.kpi.totalTips')}</p>
                    <p className="text-3xl font-bold text-white mt-2">{formatCurrency(salesData?.tip_total || 0)}</p>
                  </div>
                </div>

                {hourlyData.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.overview.hourlySales')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                        <XAxis dataKey="hour" stroke="#737373" />
                        <YAxis stroke="#737373" />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }} labelStyle={{ color: '#a3a3a3' }} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#dc2626" name={t('sales.chartLegend.revenue')} />
                        <Bar dataKey="orders" fill="#737373" name={t('sales.chartLegend.orders')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {topItems.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.overview.topSelling')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topItems} layout="vertical" margin={{ left: 200, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                        <XAxis type="number" stroke="#737373" />
                        <YAxis type="category" dataKey="item_name" width={190} tick={{ fontSize: 12, fill: '#a3a3a3' }} stroke="#737373" />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }} labelStyle={{ color: '#a3a3a3' }} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#dc2626" name={t('sales.chartLegend.revenue')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {employeePerf.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.overview.employeePerformance')}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-neutral-800 border-b border-neutral-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('sales.overview.columns.employee')}</th>
                            <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.overview.columns.orders')}</th>
                            <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.overview.columns.totalSales')}</th>
                            <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.overview.columns.avgTicket')}</th>
                            <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.overview.columns.tips')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employeePerf.map((emp) => (
                            <tr key={emp.employee_id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                              <td className="px-6 py-4 font-medium text-white">{emp.employee_name}</td>
                              <td className="px-6 py-4 text-right text-neutral-300">{emp.orders_processed}</td>
                              <td className="px-6 py-4 text-right text-neutral-300">{formatCurrency(emp.total_sales)}</td>
                              <td className="px-6 py-4 text-right text-neutral-300">{formatCurrency(emp.avg_ticket)}</td>
                              <td className="px-6 py-4 text-right font-medium text-green-400">{formatCurrency(emp.tips_received)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cash/Card Tab */}
            {tab === 'cashcard' && cashCard && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.kpi.totalOrders')}</p>
                    <p className="text-3xl font-bold text-white mt-2">{cashCard.total_orders}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.kpi.totalRevenue')}</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">{formatCurrency(cashCard.total_revenue)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.cashCard.paymentSplit')}</p>
                    <div className="mt-2">
                      {cashCard.breakdown.map((b, i) => (
                        <p key={i} className="text-lg font-bold text-white">
                          {b.payment_method === 'card' ? t('sales.cashCard.card') : t('sales.cashCard.cash')}: {b.percentage}%
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.cashCard.revenueByMethod')}</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={cashCard.breakdown.map(b => ({ name: b.payment_method === 'card' ? t('sales.cashCard.card') : t('sales.cashCard.cash'), value: b.total || 0 }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {cashCard.breakdown.map((_, i) => (
                            <Cell key={i} fill={COLORS[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.cashCard.breakdownDetails')}</h3>
                    <div className="space-y-4">
                      {cashCard.breakdown.map((b, i) => (
                        <div key={i} className="p-4 bg-neutral-800 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-lg font-bold text-white">{b.payment_method === 'card' ? t('sales.cashCard.card') : t('sales.cashCard.cash')}</span>
                            <span className="text-lg font-bold text-red-400">{formatCurrency(b.total || 0)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-neutral-400">
                            <span>{t('sales.cashCard.ordersCount', { count: b.count, percent: b.percentage })}</span>
                            <span>{t('sales.cashCard.tips')} {formatCurrency(b.tips || 0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* COGS Tab */}
            {tab === 'cogs' && cogsData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.kpi.totalRevenue')}</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">{formatCurrency(cogsData.totals.total_revenue)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.cogs.totalCogs')}</p>
                    <p className="text-3xl font-bold text-amber-500 mt-2">{formatCurrency(cogsData.totals.total_cogs)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.cogs.grossMargin')}</p>
                    <p className="text-3xl font-bold text-green-400 mt-2">{formatCurrency(cogsData.totals.total_margin)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.cogs.marginPercent')}</p>
                    <p className="text-3xl font-bold text-white mt-2">{cogsData.totals.overall_margin_percent}%</p>
                  </div>
                </div>

                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-xl font-bold text-white mb-4">{t('sales.cogs.perItemCogs')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-800 border-b border-neutral-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('sales.cogs.columns.item')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.cogs.columns.qty')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.cogs.columns.revenue')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.cogs.columns.cogs')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.cogs.columns.margin')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.cogs.columns.marginPercent')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cogsData.items.map((item, i) => (
                          <tr key={i} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                            <td className="px-4 py-3 font-medium text-white">{item.item_name}</td>
                            <td className="px-4 py-3 text-right text-neutral-300">{item.quantity_sold}</td>
                            <td className="px-4 py-3 text-right text-neutral-300">{formatCurrency(item.revenue)}</td>
                            <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(item.cogs)}</td>
                            <td className="px-4 py-3 text-right text-green-400">{formatCurrency(item.margin)}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold ${item.margin_percent >= 60 ? 'text-green-400' : item.margin_percent >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                {item.margin_percent}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Category Margins Tab */}
            {tab === 'categories' && categoryData && (
              <div className="space-y-6">
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-xl font-bold text-white mb-4">{t('sales.categories.revenueVsCogs')}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryData.categories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                      <XAxis dataKey="category_name" stroke="#737373" />
                      <YAxis stroke="#737373" />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#dc2626" name={t('sales.chartLegend.revenue')} />
                      <Bar dataKey="cogs" fill="#d97706" name={t('sales.chartLegend.cogs')} />
                      <Bar dataKey="margin" fill="#16a34a" name={t('sales.chartLegend.margin')} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-xl font-bold text-white mb-4">{t('sales.categories.categoryDetails')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryData.categories.map((cat, i) => (
                      <div key={i} className="bg-neutral-800 p-4 rounded-lg">
                        <h4 className="text-lg font-bold text-white mb-3">{cat.category_name}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-neutral-400">{t('sales.categories.revenue')}</span><span className="text-white font-bold">{formatCurrency(cat.revenue)}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-400">{t('sales.categories.cogs')}</span><span className="text-amber-400 font-bold">{formatCurrency(cat.cogs)}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-400">{t('sales.categories.margin')}</span><span className="text-green-400 font-bold">{formatCurrency(cat.margin)}</span></div>
                          <div className="flex justify-between"><span className="text-neutral-400">{t('sales.categories.marginPercent')}</span>
                            <span className={`font-bold ${cat.margin_percent >= 60 ? 'text-green-400' : cat.margin_percent >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                              {cat.margin_percent}%
                            </span>
                          </div>
                          <div className="flex justify-between"><span className="text-neutral-400">{t('sales.categories.itemsSold')}</span><span className="text-white">{cat.quantity_sold}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Contribution Margin Tab */}
            {tab === 'margin' && marginData && (
              <div className="space-y-6">
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-xl font-bold text-white mb-4">{t('sales.margin.dailyContribution')}</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={marginData.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                      <XAxis dataKey="date" stroke="#737373" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#737373" />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} name={t('sales.chartLegend.revenue')} />
                      <Line type="monotone" dataKey="cogs" stroke="#d97706" strokeWidth={2} name={t('sales.chartLegend.cogs')} />
                      <Line type="monotone" dataKey="contribution_margin" stroke="#16a34a" strokeWidth={3} name={t('sales.chartLegend.contributionMargin')} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-xl font-bold text-white mb-4">{t('sales.margin.dailyBreakdown')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-800 border-b border-neutral-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('sales.margin.date')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.overview.columns.orders')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.chartLegend.revenue')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.chartLegend.cogs')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.chartLegend.margin')}</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marginData.data.map((day, i) => (
                          <tr key={i} className="border-b border-neutral-800">
                            <td className="px-4 py-3 text-white">{day.date}</td>
                            <td className="px-4 py-3 text-right text-neutral-300">{day.orders}</td>
                            <td className="px-4 py-3 text-right text-neutral-300">{formatCurrency(day.revenue)}</td>
                            <td className="px-4 py-3 text-right text-amber-400">{formatCurrency(day.cogs)}</td>
                            <td className="px-4 py-3 text-right text-green-400">{formatCurrency(day.contribution_margin)}</td>
                            <td className="px-4 py-3 text-right font-bold text-white">{day.margin_percent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Tab */}
            {tab === 'delivery' && (
              <div className="space-y-6">
                {channelData?.channels && channelData.channels.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.deliveryTab.channelComparison')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={channelData.channels.map((c: any) => ({
                        ...c,
                        channel: c.channel === 'pos' ? 'In-Store' : c.channel === 'uber_eats' ? 'Uber Eats' : c.channel === 'rappi' ? 'Rappi' : c.channel === 'didi_food' ? 'DiDi Food' : c.channel,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                        <XAxis dataKey="channel" stroke="#737373" />
                        <YAxis stroke="#737373" />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#dc2626" name={t('sales.chartLegend.revenue')} />
                        <Bar dataKey="order_count" fill="#737373" name={t('sales.chartLegend.orders')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {deliveryData?.platforms && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.deliveryTab.platformMargins')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {deliveryData.platforms.map((p: any, i: number) => (
                        <div key={i} className="bg-neutral-800 p-4 rounded-lg">
                          <h4 className="text-lg font-bold text-white mb-2">{p.display_name}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-neutral-400">{t('sales.overview.columns.orders')}</span><span className="text-white">{p.order_count || 0}</span></div>
                            <div className="flex justify-between"><span className="text-neutral-400">{t('sales.chartLegend.revenue')}</span><span className="text-white">{formatCurrency(p.revenue || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-neutral-400">{t('sales.deliveryTab.commissionWithPercent', { percent: p.commission_percent })}</span><span className="text-red-400">{formatCurrency(p.total_commission || 0)}</span></div>
                            <div className="flex justify-between"><span className="text-neutral-400">{t('sales.deliveryTab.netRevenue')}</span><span className="text-green-400 font-bold">{formatCurrency(p.net_revenue || 0)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!deliveryData?.platforms || deliveryData.platforms.every((p: any) => !p.order_count)) && (
                  <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
                    <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                    <p className="text-neutral-400">{t('sales.deliveryTab.noDeliveryOrders')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Fees Tab */}
            {tab === 'fees' && feesData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.kpi.totalRevenue')}</p>
                    <p className="text-2xl font-bold text-white">{formatPrice(feesData.total_revenue || 0)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.fees.totalFees')}</p>
                    <p className="text-2xl font-bold text-red-400">{formatPrice(feesData.total_fees || 0)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.fees.netRevenue')}</p>
                    <p className="text-2xl font-bold text-green-400">{formatPrice(feesData.net_revenue || 0)}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.fees.feePercent')}</p>
                    <p className="text-2xl font-bold text-amber-400">{(feesData.fee_percent || 0).toFixed(2)}%</p>
                  </div>
                </div>

                {feesData.daily && feesData.daily.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-4">{t('sales.fees.dailyFeeBreakdown')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={feesData.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#16a34a" name={t('sales.fees.chartRevenue')} />
                        <Bar dataKey="fees" fill="#dc2626" name={t('sales.fees.chartFees')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Refunds Tab */}
            {tab === 'refunds' && refundData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.refunds.totalRefunds')}</p>
                    <p className="text-2xl font-bold text-white">{refundData.total_refunds}</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">{t('sales.refunds.totalRefunded')}</p>
                    <p className="text-2xl font-bold text-red-400">{formatPrice(refundData.total_refunded_amount || 0)}</p>
                  </div>
                </div>

                {refundData.by_reason && refundData.by_reason.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-4">{t('sales.refunds.byReason')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={refundData.by_reason}
                          dataKey="count"
                          nameKey="reason"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(entry: any) => entry.reason}
                        >
                          {refundData.by_reason.map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {refundData.by_employee && refundData.by_employee.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-4">{t('sales.refunds.byEmployee')}</h3>
                    <div className="space-y-2">
                      {refundData.by_employee.map((emp: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-white font-medium">{emp.employee_name}</span>
                          <div className="text-right">
                            <span className="text-neutral-400 text-sm mr-3">{t('sales.refunds.refundsCount', { count: emp.count })}</span>
                            <span className="text-red-400 font-bold">{formatPrice(emp.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {refundData.daily && refundData.daily.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-4">{t('sales.refunds.dailyTrend')}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={refundData.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 12 }} />
                        <YAxis stroke="#888" />
                        <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="amount" stroke="#dc2626" strokeWidth={2} name={t('sales.refunds.amount')} />
                        <Line type="monotone" dataKey="count" stroke="#ca8a04" strokeWidth={2} name={t('sales.refunds.count')} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Financials Tab */}
            {tab === 'financials' && (
              <div className="space-y-6">
                {/* Controls */}
                <div className="flex flex-wrap items-center gap-4">
                  <input
                    type="month"
                    value={financialMonth}
                    onChange={(e) => setFinancialMonth(e.target.value)}
                    className="bg-neutral-800 text-white border border-neutral-700 rounded-lg px-4 py-2 min-h-[44px]"
                  />
                  {canEditFinancials && !editingTargets && (
                    <button
                      onClick={handleEditTargets}
                      className="px-4 py-2 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors min-h-[44px]"
                    >
                      {t('sales.financials.editTargets')}
                    </button>
                  )}
                  {editingTargets && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveTargets}
                        disabled={savingTargets}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-h-[44px] disabled:opacity-50"
                      >
                        {savingTargets ? t('sales.financials.saving') : t('sales.financials.saveTargets')}
                      </button>
                      <button
                        onClick={() => setEditingTargets(false)}
                        className="px-4 py-2 bg-neutral-800 text-neutral-300 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors min-h-[44px]"
                      >
                        {t('common:buttons.cancel')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Summary Cards */}
                {financialData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                      <p className="text-neutral-400 text-sm">{t('sales.financials.revenueSubtotal')}</p>
                      <p className="text-3xl font-bold text-red-500 mt-2">{formatPrice(financialData.revenue)}</p>
                    </div>
                    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                      <p className="text-neutral-400 text-sm">{t('sales.financials.netProfitActual')}</p>
                      <p className={`text-3xl font-bold mt-2 ${financialData.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPrice(financialData.net_profit)}
                      </p>
                    </div>
                    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                      <p className="text-neutral-400 text-sm">{t('sales.financials.netProfitTarget')}</p>
                      <p className="text-3xl font-bold text-white mt-2">{formatPrice(financialData.target_net_profit)}</p>
                    </div>
                  </div>
                )}

                {/* Financial Table */}
                {financialData && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-xl font-bold text-white mb-4">{t('sales.financials.planVsActuals')} {financialData.month}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-neutral-800 border-b border-neutral-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">{t('sales.financials.columns.category')}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.financials.columns.targetPercent')}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.financials.columns.targetDollar')}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.financials.columns.actualDollar')}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.financials.columns.diffDollar')}</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">{t('sales.financials.columns.diffPercent')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialData.rows.map((row) => {
                            const isOver = row.diff_amount > 0;
                            const diffColor = row.diff_amount === 0 ? 'text-neutral-400' : isOver ? 'text-red-400' : 'text-green-400';
                            return (
                              <tr key={row.category} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                                <td className="px-4 py-3 font-medium text-white">
                                  {row.label}
                                  {row.auto_calculated && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-900/50 text-blue-300 rounded">{t('sales.financials.auto')}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-neutral-300">
                                  {editingTargets ? (
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      max="100"
                                      value={targetDraft[row.category] ?? row.target_percent}
                                      onChange={(e) => setTargetDraft(prev => ({ ...prev, [row.category]: parseFloat(e.target.value) || 0 }))}
                                      className="w-20 bg-neutral-700 text-white border border-neutral-600 rounded px-2 py-1 text-right text-sm"
                                    />
                                  ) : (
                                    `${row.target_percent}%`
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-neutral-300">{formatPrice(row.target_amount)}</td>
                                <td className="px-4 py-3 text-right">
                                  {canEditFinancials ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={actualDraft[row.category] ?? row.actual_amount}
                                        onChange={(e) => setActualDraft(prev => ({ ...prev, [row.category]: e.target.value }))}
                                        className="w-28 bg-neutral-700 text-white border border-neutral-600 rounded px-2 py-1 text-right text-sm"
                                      />
                                      {actualDraft[row.category] !== undefined && (
                                        <button
                                          onClick={() => handleSaveActual(row.category)}
                                          disabled={savingActual === row.category}
                                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                        >
                                          {savingActual === row.category ? '...' : t('common:buttons.save')}
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-neutral-300">{formatPrice(row.actual_amount)}</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${diffColor}`}>
                                  {row.diff_amount > 0 ? '+' : ''}{formatPrice(row.diff_amount)}
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${diffColor}`}>
                                  {row.diff_percent > 0 ? '+' : ''}{row.diff_percent.toFixed(2)}%
                                </td>
                              </tr>
                            );
                          })}
                          {/* Net Profit Summary Row */}
                          <tr className="bg-neutral-800 border-t-2 border-neutral-600">
                            <td className="px-4 py-4 font-bold text-white text-lg">{t('sales.financials.netProfit')}</td>
                            <td className="px-4 py-4 text-right font-bold text-white">
                              {(100 - financialData.rows.reduce((s, r) => s + r.target_percent, 0)).toFixed(1)}%
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-white">{formatPrice(financialData.target_net_profit)}</td>
                            <td className="px-4 py-4 text-right font-bold text-white">{formatPrice(financialData.net_profit)}</td>
                            <td className={`px-4 py-4 text-right font-bold ${financialData.net_profit - financialData.target_net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {financialData.net_profit - financialData.target_net_profit > 0 ? '+' : ''}
                              {formatPrice(Math.round((financialData.net_profit - financialData.target_net_profit) * 100) / 100)}
                            </td>
                            <td className="px-4 py-4"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!financialData && !loading && (
                  <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
                    <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                    <p className="text-neutral-400">{t('sales.financials.noFinancialData')}</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'overview' && topItems.length === 0 && employeePerf.length === 0 && (
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
                <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                <p className="text-neutral-400">{t('sales.noData')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
