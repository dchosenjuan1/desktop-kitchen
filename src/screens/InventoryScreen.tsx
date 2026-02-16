import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { getInventory, restockItem, updateInventory, getInventoryForecast } from '../api';
import { InventoryItem, InventoryForecast } from '../types';

type SortField = 'name' | 'quantity' | 'status';

export default function InventoryScreen() {
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

  useEffect(() => {
    fetchItems();
    getInventoryForecast()
      .then(setForecasts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    filterAndSortItems();
  }, [items, searchTerm, sortBy, selectedCategory]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInventory();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
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
        setError('Invalid restock amount');
        return;
      }

      await restockItem(restockingId, amount);
      await fetchItems();
      setRestockingId(null);
      setRestockAmount('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restock item');
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
        setError('Invalid threshold value');
        return;
      }

      await updateInventory(id, { low_stock_threshold: threshold });
      await fetchItems();
      setEditingId(null);
      setEditThreshold('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update threshold');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (quantity: number, threshold: number) => {
    if (quantity === 0) return <span className="px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-xs font-medium border border-red-800">Out of Stock</span>;
    if (quantity <= threshold) return <span className="px-3 py-1 bg-amber-600/20 text-amber-400 rounded-full text-xs font-medium border border-amber-800">Low Stock</span>;
    return <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-medium border border-green-800">In Stock</span>;
  };

  const categories = ['all', ...new Set(items.map((item) => item.category))];

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
          <h1 className="text-3xl font-black tracking-tighter">Inventory</h1>
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

        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-neutral-500" size={20} />
              <input
                type="text"
                placeholder="Search items..."
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
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-red-600"
            >
              <option value="name">Sort by Name</option>
              <option value="quantity">Sort by Quantity</option>
              <option value="status">Sort by Status</option>
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
              <p className="text-neutral-400">No items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800 border-b border-neutral-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">Item Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">Current Stock</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">Threshold</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-300">Actions</th>
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
                            Restock
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
                <h3 className="font-semibold text-white">AI Stockout Predictions</h3>
              </div>
              <button
                onClick={() => setShowForecasts(!showForecasts)}
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                {showForecasts ? 'Hide' : 'Show All'}
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
                          ? `~${f.days_until_stockout} days left | ${f.avg_daily_usage} ${f.unit}/day`
                          : 'Insufficient data'}
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
                          Reorder: {f.suggested_reorder_qty} {f.unit}
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
            <h3 className="font-semibold text-white mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-neutral-800 rounded-lg">
                <p className="text-neutral-400 text-sm">Total Items</p>
                <p className="text-2xl font-bold text-white">{filteredItems.length}</p>
              </div>
              <div className="p-4 bg-neutral-800 rounded-lg">
                <p className="text-neutral-400 text-sm">Low Stock</p>
                <p className="text-2xl font-bold text-amber-400">
                  {filteredItems.filter((i) => i.quantity <= i.low_stock_threshold && i.quantity > 0).length}
                </p>
              </div>
              <div className="p-4 bg-neutral-800 rounded-lg">
                <p className="text-neutral-400 text-sm">Out of Stock</p>
                <p className="text-2xl font-bold text-red-500">
                  {filteredItems.filter((i) => i.quantity === 0).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
