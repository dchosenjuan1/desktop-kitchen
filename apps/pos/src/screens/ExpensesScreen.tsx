import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Camera,
  Download,
  Pencil,
  Trash2,
  Receipt,
  DollarSign,
  Loader2,
} from 'lucide-react';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  exportExpenses,
  type Expense,
} from '../api';
import { formatPrice } from '../utils/currency';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal';
import ReceiptScanModal from '../components/expenses/ReceiptScanModal';

const CATEGORY_LABELS: Record<string, string> = {
  food_cost: 'Food & Ingredients',
  supplies: 'Cleaning Supplies',
  utilities: 'Utilities',
  rent: 'Rent',
  marketing: 'Marketing',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  food_cost: 'bg-orange-500/20 text-orange-400',
  supplies: 'bg-blue-500/20 text-blue-400',
  utilities: 'bg-yellow-500/20 text-yellow-400',
  rent: 'bg-purple-500/20 text-purple-400',
  marketing: 'bg-pink-500/20 text-pink-400',
  other: 'bg-neutral-500/20 text-neutral-400',
};

function getMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

const ExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(getMonthRange().from);
  const [dateTo, setDateTo] = useState(getMonthRange().to);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [scanInitialData, setScanInitialData] = useState<Partial<Expense> | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenses({ from: dateFrom, to: dateTo });
      setExpenses(data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleSave = async (data: Partial<Expense>) => {
    setSaving(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, data);
      } else {
        await createExpense(data);
      }
      setShowForm(false);
      setEditingExpense(null);
      setScanInitialData(undefined);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to save expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportExpenses({ from: dateFrom, to: dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${dateFrom}-${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleScanComplete = (data: Partial<Expense> & { receipt_image_url?: string }) => {
    setShowScan(false);
    setScanInitialData(data);
    setEditingExpense(null);
    setShowForm(true);
  };

  // Summary calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount) + Number(e.tax_amount || 0), 0);
  const categoryBreakdown = expenses.reduce<Record<string, number>>((acc, e) => {
    const key = e.category;
    acc[key] = (acc[key] || 0) + Number(e.amount) + Number(e.tax_amount || 0);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="p-2 text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold">Expenses</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowScan(true)}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-white rounded-lg border border-neutral-700 hover:bg-neutral-700 transition-colors text-sm font-medium"
            >
              <Camera size={16} />
              Scan Receipt
            </button>
            <button
              onClick={() => {
                setEditingExpense(null);
                setScanInitialData(undefined);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Add Expense
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Date Range + Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-400">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-400">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || expenses.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 text-white rounded-lg border border-neutral-700 hover:bg-neutral-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-brand-500" />
              <span className="text-sm text-neutral-400">Total Expenses</span>
            </div>
            <p className="text-2xl font-bold">{formatPrice(totalExpenses)}</p>
          </div>
          {Object.entries(categoryBreakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat, total]) => (
              <div key={cat} className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.other}`}>
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <p className="text-2xl font-bold">{formatPrice(total)}</p>
              </div>
            ))}
        </div>

        {/* Expenses Table */}
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-neutral-400">
              <Loader2 size={24} className="animate-spin mr-2" />
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <Receipt size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No expenses found</p>
              <p className="text-sm">Add your first expense or scan a receipt</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-800 text-left">
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400">Date</th>
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400">Category</th>
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400">Vendor</th>
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400">Description</th>
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400 text-right">Amount</th>
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400 text-right">Tax</th>
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400">Payment</th>
                    <th className="px-4 py-3 text-sm font-medium text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <tr key={expense.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {typeof expense.expense_date === 'string'
                          ? expense.expense_date.slice(0, 10)
                          : expense.expense_date}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other}`}>
                          {CATEGORY_LABELS[expense.category] || expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{expense.vendor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-neutral-400 max-w-[200px] truncate">
                        {expense.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatPrice(Number(expense.amount))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-neutral-400">
                        {formatPrice(Number(expense.tax_amount || 0))}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize">
                        {expense.payment_method || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingExpense(expense);
                              setScanInitialData(undefined);
                              setShowForm(true);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <ExpenseFormModal
          expense={editingExpense}
          initialData={scanInitialData}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingExpense(null);
            setScanInitialData(undefined);
          }}
          saving={saving}
        />
      )}

      {showScan && (
        <ReceiptScanModal
          onParsed={handleScanComplete}
          onClose={() => setShowScan(false)}
        />
      )}
    </div>
  );
};

export default ExpensesScreen;
