import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  getHourlyReport
} from '../api';
import { formatPrice } from '../utils/currency';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  SalesReport,
  TopItemsReport,
  EmployeePerformanceReport,
  HourlyReport
} from '../types';

type Period = 'today' | 'week' | 'month';

export default function ReportsScreen() {
  const [period, setPeriod] = useState<Period>('today');
  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [topItems, setTopItems] = useState<TopItemsReport[]>([]);
  const [employeePerf, setEmployeePerf] = useState<EmployeePerformanceReport[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
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
      [''],
      ['Top Items'],
      ['Item', 'Quantity Sold', 'Revenue'],
      ...topItems.map((item) => [
        item.item_name,
        item.quantity_sold,
        item.revenue,
      ]),
      [''],
      ['Employee Performance'],
      ['Employee', 'Orders Processed', 'Total Sales', 'Avg Ticket', 'Tips Received'],
      ...employeePerf.map((emp) => [
        emp.employee_name,
        emp.orders_processed,
        emp.total_sales,
        emp.avg_ticket,
        emp.tips_received,
      ]),
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const getPeriodLabel = (p: Period) => {
    switch (p) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <img src="/logo.png" alt="Juanberto's" className="h-8" />
            <h1 className="text-3xl font-black tracking-tighter">Sales Reports</h1>
          </div>
          <button
            onClick={generateCSV}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 min-h-[44px]"
          >
            <Download size={20} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="flex gap-3 mb-6">
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

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-neutral-900 rounded-lg border border-neutral-800 animate-pulse"
              ></div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-red-500 mt-2">
                  {formatCurrency(salesData?.total_revenue || 0)}
                </p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Order Count</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {salesData?.order_count || 0}
                </p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Avg Ticket</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {formatCurrency(salesData?.avg_ticket || 0)}
                </p>
              </div>
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <p className="text-neutral-400 text-sm font-medium">Total Tips</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {formatCurrency(salesData?.tip_total || 0)}
                </p>
              </div>
            </div>

            {hourlyData.length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-xl font-bold text-white mb-4">
                  Hourly Sales Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                    <XAxis
                      dataKey="hour"
                      label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                      stroke="#737373"
                    />
                    <YAxis stroke="#737373" />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }}
                      labelStyle={{ color: '#a3a3a3' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#dc2626" name="Revenue" />
                    <Bar dataKey="orders" fill="#737373" name="Orders" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {topItems.length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-xl font-bold text-white mb-4">
                  Top Selling Items
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={topItems}
                    layout="vertical"
                    margin={{ left: 200, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                    <XAxis type="number" stroke="#737373" />
                    <YAxis
                      type="category"
                      dataKey="item_name"
                      width={190}
                      tick={{ fontSize: 12, fill: '#a3a3a3' }}
                      stroke="#737373"
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }}
                      labelStyle={{ color: '#a3a3a3' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#dc2626" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {employeePerf.length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="text-xl font-bold text-white mb-4">
                  Employee Performance
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800 border-b border-neutral-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">
                          Orders
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">
                          Total Sales
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">
                          Avg Ticket
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-300">
                          Tips
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeePerf.map((emp) => (
                        <tr key={emp.employee_id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                          <td className="px-6 py-4 font-medium text-white">
                            {emp.employee_name}
                          </td>
                          <td className="px-6 py-4 text-right text-neutral-300">
                            {emp.orders_processed}
                          </td>
                          <td className="px-6 py-4 text-right text-neutral-300">
                            {formatCurrency(emp.total_sales)}
                          </td>
                          <td className="px-6 py-4 text-right text-neutral-300">
                            {formatCurrency(emp.avg_ticket)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-green-400">
                            {formatCurrency(emp.tips_received)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {topItems.length === 0 && employeePerf.length === 0 && (
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-12 text-center">
                <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                <p className="text-neutral-400">No data available for this period</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
