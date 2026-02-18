import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  AlertCircle,
  Edit2,
  Check,
  X,
  Sparkles,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  getInventory,
  restockItem,
  updateInventory,
  getInventoryForecast,
  recordInventoryCount,
  getInventoryCounts,
  getVarianceReport,
  getShrinkageAlerts,
  acknowledgeShrinkageAlert,
} from '../api';
import {
  InventoryItem,
  InventoryForecast,
  InventoryCount,
  ShrinkageAlert,
  VarianceReport,
} from '../types';
import { formatDate, formatDateTime } from '../utils/dateFormat';

type Tab = 'stock' | 'count' | 'variance' | 'alerts';
type SortField = 'name' | 'quantity' | 'status';

export default function InventoryScreen() {
  const { t } = useTranslation('inventory');
  const [activeTab, setActiveTab] = useState<Tab>('stock');

  // Stock tab state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editThreshold, setEditThreshold] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [showForecasts, setShowForecasts] = useState(false);

  // Count tab state
  const [countItemId, setCountItemId] = useState<string>('');
  const [countedQty, setCountedQty] = useState<string>('');
  const [countNotes, setCountNotes] = useState('');
  const [countHistory, setCountHistory] = useState<InventoryCount[]>([]);
  const [countLoading, setCountLoading] = useState(false);

  // Variance tab state
  const [varianceData, setVarianceData] = useState<VarianceReport[]>([]);
  const [varianceLoading, setVarianceLoading] = useState(false);

  // Alerts tab state
  const [alerts, setAlerts] = useState<ShrinkageAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    getInventoryForecast()
      .then(setForecasts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [items, searchTerm, sortBy, selectedCategory]);

  useEffect(() => {
    if (activeTab === 'count') {
      loadCountHistory();
    } else if (activeTab === 'variance') {
      loadVarianceReport();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    }
  }, [activeTab]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventory();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:fetchInventory'));
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'quantity') {
        return a.quantity - b.quantity;
      } else if (sortBy === 'status') {
        const aLow = a.quantity <= a.low_stock_threshold ? 0 : 1;
        const bLow = b.quantity <= b.low_stock_threshold ? 0 : 1;
        return bLow - aLow;
      }
      return 0;
    });

    setFilteredItems(filtered);
  };

  const handleRestock = async () => {
    if (!restockingId || !restockAmount) return;

    try {
      setActionLoading(true);
      const amount = parseFloat(restockAmount);
      if (isNaN(amount) || amount <= 0) {
        setError(t('inventory.invalidRestockAmount'));
        return;
      }

      await restockItem(restockingId, amount);
      await fetchItems();
      setRestockingId(null);
      setRestockAmount('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.failedRestock'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditThreshold = async (id: number) => {
    if (!editThreshold) return;

    try {
      setActionLoading(true);
      const threshold = parseFloat(editThreshold);
      if (isNaN(threshold) || threshold < 0) {
        setError(t('inventory.invalidThreshold'));
        return;
      }

      await updateInventory(id, { low_stock_threshold: threshold });
      await fetchItems();
      setEditingId(null);
      setEditThreshold('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.failedUpdateThreshold'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (quantity: number, threshold: number) => {
    if (quantity === 0) return <span className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-xs font-medium border border-red-800">{t('inventory.status.outOfStock')}</span>;
    if (quantity <= threshold) return <span className="px-3 py-1 bg-amber-600/20 text-amber-400 rounded-full text-xs font-medium border border-amber-800">{t('inventory.status.lowStock')}</span>;
    return <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-medium border border-green-800">{t('inventory.status.inStock')}</span>;
  };

  // Count tab functions
  const loadCountHistory = async () => {
    try {
      setCountLoading(true);
      const data = await getInventoryCounts();
      setCountHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('inventory.failedLoadCounts'));
    } finally {
      setCountLoading(false);
    }
  };

  const handleRecordCount = async () => {
    if (!countItemId || !countedQty) return;

    try {
      setActionLoading(true);
      setError(null);
      await recordInventoryCount(parseInt(countItemId), { counted_quantity: parseFloat(countedQty), notes: countNotes || undefined });
      setCountItemId('');
      setCountedQty('');
      setCountNotes('');
      await loadCountHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:recordCount'));
    } finally {
      setActionLoading(false);
    }
  };

  // Variance tab functions
  const loadVarianceReport = async () => {
    try {
      setVarianceLoading(true);
      const data = await getVarianceReport();
      setVarianceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:loadVariance'));
    } finally {
      setVarianceLoading(false);
    }
  };

  // Alerts tab functions
  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const data = await getShrinkageAlerts();
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:loadAlerts'));
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      setActionLoading(true);
      await acknowledgeShrinkageAlert(alertId);
      await loadAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:acknowledgeAlert'));
    } finally {
      setActionLoading(false);
    }
  };

  const categories = ['all', ...new Set(items.map((item) => item.category))];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'stock', label: t('inventory.tabs.stock'), icon: <ClipboardList size={18} /> },
    { key: 'count', label: t('inventory.tabs.count'), icon: <Check size={18} /> },
    { key: 'variance', label: t('inventory.tabs.variance'), icon: <BarChart3 size={18} /> },
    { key: 'alerts', label: t('inventory.tabs.alerts'), icon: <AlertTriangle size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <img src="/logo.png" alt="Juanberto's" className="h-8" />
          <h1 className="text-3xl font-black tracking-tighter">{t('inventory.title')}</h1>
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-neutral-800 pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========== STOCK TAB ========== */}
        {activeTab === 'stock' && (
          <>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-neutral-500" size={20} />
                  <input
                    type="text"
                    placeholder={t('inventory.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? t('inventory.allCategories') : cat}
                    </option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortField)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                >
                  <option value="name">{t('inventory.sortByName')}</option>
                  <option value="quantity">{t('inventory.sortByQuantity')}</option>
                  <option value="status">{t('inventory.sortByStatus')}</option>
                </select>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-neutral-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto text-neutral-600 mb-3" size={40} />
                  <p className="text-neutral-400">{t('inventory.noItemsFound')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800 border-b border-neutral-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.itemName')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.currentStock')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.threshold')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.status')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('inventory.columns.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                          <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                          <td className="px-6 py-4">
                            <span className="text-neutral-300">
                              {item.quantity} {item.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {editingId === item.id ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  value={editThreshold}
                                  onChange={(e) => setEditThreshold(e.target.value)}
                                  className="w-20 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                                  placeholder={item.low_stock_threshold.toString()}
                                />
                                <button
                                  onClick={() => handleEditThreshold(item.id)}
                                  disabled={actionLoading}
                                  className="p-1 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditThreshold('');
                                  }}
                                  className="p-1 text-neutral-400 hover:bg-neutral-700 rounded-lg transition-colors"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 items-center">
                                <span className="text-neutral-300">{item.low_stock_threshold}</span>
                                <button
                                  onClick={() => {
                                    setEditingId(item.id);
                                    setEditThreshold(item.low_stock_threshold.toString());
                                  }}
                                  className="p-1 text-neutral-500 hover:bg-neutral-700 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(item.quantity, item.low_stock_threshold)}
                          </td>
                          <td className="px-6 py-4">
                            {restockingId === item.id ? (
                              <div className="flex gap-2 items-center">
                                <button
                                  onClick={() => setRestockAmount(Math.max(0, parseFloat(restockAmount) - 1).toString())}
                                  className="p-1 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors text-white"
                                >
                                  <Minus size={18} />
                                </button>
                                <input
                                  type="number"
                                  value={restockAmount}
                                  onChange={(e) => setRestockAmount(e.target.value)}
                                  className="w-16 px-2 py-1 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center focus:outline-none focus:border-red-600"
                                  placeholder="0"
                                />
                                <button
                                  onClick={() => setRestockAmount(((parseFloat(restockAmount) || 0) + 1).toString())}
                                  className="p-1 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors text-white"
                                >
                                  <Plus size={18} />
                                </button>
                                <button
                                  onClick={() => handleRestock()}
                                  disabled={actionLoading || !restockAmount}
                                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                  <Check size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setRestockingId(null);
                                    setRestockAmount('');
                                  }}
                                  className="px-3 py-1 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setRestockingId(item.id);
                                  setRestockAmount('');
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium min-h-[44px] flex items-center justify-center"
                              >
                                {t('inventory.restock')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Forecast Section */}
            {forecasts.filter(f => f.risk_level === 'critical' || f.risk_level === 'high').length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="text-red-500" size={20} />
                    <h3 className="font-semibold text-white">{t('inventory.aiPredictions')}</h3>
                  </div>
                  <button
                    onClick={() => setShowForecasts(!showForecasts)}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {showForecasts ? t('inventory.hide') : t('inventory.showAll')}
                  </button>
                </div>
                <div className="space-y-2">
                  {forecasts
                    .filter(f => showForecasts || f.risk_level === 'critical' || f.risk_level === 'high')
                    .slice(0, showForecasts ? undefined : 5)
                    .map((f) => (
                      <div key={f.inventory_item_id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{f.name}</p>
                          <p className="text-neutral-500 text-xs">
                            {f.avg_daily_usage > 0
                              ? t('inventory.daysLeft', { days: f.days_until_stockout, usage: f.avg_daily_usage, unit: f.unit })
                              : t('inventory.insufficientData')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            f.risk_level === 'critical' ? 'bg-red-900/30 text-red-400' :
                            f.risk_level === 'high' ? 'bg-orange-900/30 text-orange-400' :
                            f.risk_level === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                            'bg-green-900/30 text-green-400'
                          }`}>
                            {f.risk_level.toUpperCase()}
                          </span>
                          {f.suggested_reorder_qty && (
                            <span className="text-xs text-neutral-500">
                              {t('inventory.reorder', { qty: f.suggested_reorder_qty, unit: f.unit })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {!loading && filteredItems.length > 0 && (
              <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                <h3 className="font-semibold text-white mb-4">{t('inventory.summary.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-sm">{t('inventory.summary.totalItems')}</p>
                    <p className="text-2xl font-bold text-white">{filteredItems.length}</p>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-sm">{t('inventory.summary.lowStock')}</p>
                    <p className="text-2xl font-bold text-amber-400">
                      {filteredItems.filter((i) => i.quantity <= i.low_stock_threshold && i.quantity > 0).length}
                    </p>
                  </div>
                  <div className="p-4 bg-neutral-800 rounded-lg">
                    <p className="text-neutral-400 text-sm">{t('inventory.summary.outOfStock')}</p>
                    <p className="text-2xl font-bold text-red-500">
                      {filteredItems.filter((i) => i.quantity === 0).length}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========== COUNT TAB ========== */}
        {activeTab === 'count' && (
          <>
            {/* Record a Count */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('count.title')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={countItemId}
                  onChange={(e) => setCountItemId(e.target.value)}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                >
                  <option value="">{t('count.selectItem')}</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({t('count.inSystem', { qty: item.quantity, unit: item.unit })})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={countedQty}
                  onChange={(e) => setCountedQty(e.target.value)}
                  placeholder={t('count.countedQuantity')}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
                <input
                  type="text"
                  value={countNotes}
                  onChange={(e) => setCountNotes(e.target.value)}
                  placeholder={t('count.notes')}
                  className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-red-600"
                />
                <button
                  onClick={handleRecordCount}
                  disabled={actionLoading || !countItemId || !countedQty}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {t('count.recordCount')}
                </button>
              </div>
            </div>

            {/* Count History */}
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <h3 className="text-lg font-bold text-white mb-4">{t('count.history')}</h3>
              {countLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-neutral-800 rounded animate-pulse"></div>
                  ))}
                </div>
              ) : countHistory.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto text-neutral-600 mb-3" size={40} />
                  <p className="text-neutral-400">{t('count.noCountsYet')}</p>
                  <p className="text-neutral-500 text-sm mt-1">{t('count.useFormAbove')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-800 border-b border-neutral-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.item')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.counted')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.system')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.variance')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.variancePercent')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.notes')}</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countHistory.map((count) => {
                        const isHigh = Math.abs(count.variance_percent) > 10;
                        return (
                          <tr key={count.id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                            <td className="px-6 py-4 font-medium text-white">{count.item_name}</td>
                            <td className="px-6 py-4 text-neutral-300">{count.counted_quantity}</td>
                            <td className="px-6 py-4 text-neutral-300">{count.system_quantity}</td>
                            <td className="px-6 py-4">
                              <span className={count.variance !== 0 ? (count.variance < 0 ? 'text-red-400' : 'text-amber-400') : 'text-green-400'}>
                                {count.variance > 0 ? '+' : ''}{count.variance}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isHigh ? 'bg-red-900/30 text-red-400' : 'bg-neutral-800 text-neutral-400'
                              }`}>
                                {count.variance_percent > 0 ? '+' : ''}{count.variance_percent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-neutral-500 text-sm">{count.notes || '-'}</td>
                            <td className="px-6 py-4 text-neutral-500 text-sm">
                              {formatDate(new Date(count.created_at))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== VARIANCE TAB ========== */}
        {activeTab === 'variance' && (
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t('variance.title')}</h3>
              <button
                onClick={loadVarianceReport}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                {t('common:buttons.refresh')}
              </button>
            </div>
            {varianceLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-neutral-800 rounded animate-pulse"></div>
                ))}
              </div>
            ) : varianceData.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="mx-auto text-neutral-600 mb-3" size={40} />
                <p className="text-neutral-400">{t('variance.noData')}</p>
                <p className="text-neutral-500 text-sm mt-1">{t('variance.recordCountsHint')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800 border-b border-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('count.columns.item')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.countSessions')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.avgVariance')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.avgVariancePercent')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.totalVariance')}</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">{t('variance.risk')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {varianceData.map((row) => {
                      const avgPct = Math.abs(row.avg_variance_percent);
                      const risk = avgPct > 15 ? 'high' : avgPct > 5 ? 'medium' : 'low';
                      return (
                        <tr key={row.inventory_item_id} className="border-b border-neutral-800 hover:bg-neutral-800/50">
                          <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                          <td className="px-6 py-4 text-neutral-300">{row.count_sessions}</td>
                          <td className="px-6 py-4">
                            <span className={row.avg_variance < 0 ? 'text-red-400' : row.avg_variance > 0 ? 'text-amber-400' : 'text-green-400'}>
                              {row.avg_variance > 0 ? '+' : ''}{row.avg_variance.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={avgPct > 10 ? 'text-red-400' : 'text-neutral-300'}>
                              {row.avg_variance_percent > 0 ? '+' : ''}{row.avg_variance_percent.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-neutral-300">
                            {row.total_variance.toFixed(1)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              risk === 'high' ? 'bg-red-900/30 text-red-400' :
                              risk === 'medium' ? 'bg-amber-900/30 text-amber-400' :
                              'bg-green-900/30 text-green-400'
                            }`}>
                              {risk}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========== ALERTS TAB ========== */}
        {activeTab === 'alerts' && (
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={20} />
                <h3 className="text-lg font-bold text-white">{t('alerts.title')}</h3>
              </div>
              <button
                onClick={loadAlerts}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                {t('common:buttons.refresh')}
              </button>
            </div>
            {alertsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-neutral-800 rounded animate-pulse"></div>
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto text-green-600 mb-3" size={40} />
                <p className="text-neutral-400">{t('alerts.noAlerts')}</p>
                <p className="text-neutral-500 text-sm mt-1">{t('alerts.withinRanges')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      alert.severity === 'critical'
                        ? 'bg-red-900/20 border-red-800'
                        : alert.severity === 'high'
                        ? 'bg-orange-900/20 border-orange-800'
                        : 'bg-amber-900/20 border-amber-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            alert.severity === 'critical' ? 'bg-red-900/30 text-red-400' :
                            alert.severity === 'high' ? 'bg-orange-900/30 text-orange-400' :
                            'bg-amber-900/30 text-amber-400'
                          }`}>
                            {alert.severity}
                          </span>
                          <span className="text-xs text-neutral-500 uppercase">{alert.alert_type}</span>
                        </div>
                        <p className="text-white font-medium">{alert.item_name}</p>
                        <p className="text-neutral-400 text-sm mt-1">{alert.message}</p>
                        {alert.variance_amount !== undefined && (
                          <p className="text-neutral-500 text-xs mt-1">
                            {t('inventory.varianceUnits', { amount: alert.variance_amount })}
                          </p>
                        )}
                        <p className="text-neutral-600 text-xs mt-1">
                          {formatDateTime(new Date(alert.created_at))}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={actionLoading}
                          className="px-3 py-2 bg-neutral-700 text-neutral-300 rounded-lg hover:bg-neutral-600 transition-colors text-sm font-medium disabled:opacity-50 ml-4"
                        >
                          {t('alerts.acknowledge')}
                        </button>
                      )}
                      {alert.acknowledged && (
                        <span className="px-3 py-2 text-green-400 text-xs font-medium ml-4">
                          {t('alerts.acknowledged')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
