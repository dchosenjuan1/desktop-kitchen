import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  BarChart3,
  Package,
  DollarSign,
  Settings,
  Download,
  Upload,
  RefreshCw,
} from 'lucide-react';
import {
  getAIInsights,
  getAIAnalytics,
  getAIConfig,
  updateAIConfig,
  getPricingSuggestions,
  getInventoryForecast,
  getCategoryRoles,
  updateCategoryRole,
  applyPricingSuggestion,
  exportAIConfig,
  importAIConfig,
} from '../api';
import {
  AIInsights,
  AIAnalytics,
  AIConfig,
  PricingSuggestion,
  InventoryForecast,
  CategoryRole,
} from '../types';
import { formatPrice } from '../utils/currency';

type Tab = 'dashboard' | 'upsell' | 'inventory' | 'pricing' | 'config';

export default function AIConfigScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [pricingSuggestions, setPricingSuggestions] = useState<PricingSuggestion[]>([]);
  const [forecasts, setForecasts] = useState<InventoryForecast[]>([]);
  const [categoryRoles, setCategoryRoles] = useState<CategoryRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'dashboard') {
        const [insightsData, analyticsData] = await Promise.all([
          getAIInsights(),
          getAIAnalytics(),
        ]);
        setInsights(insightsData);
        setAnalytics(analyticsData);
      } else if (activeTab === 'pricing') {
        const data = await getPricingSuggestions();
        setPricingSuggestions(data);
      } else if (activeTab === 'inventory') {
        const data = await getInventoryForecast();
        setForecasts(data);
      } else if (activeTab === 'config') {
        const [configData, rolesData] = await Promise.all([
          getAIConfig(),
          getCategoryRoles(),
        ]);
        setConfig(configData);
        setCategoryRoles(rolesData);
      } else if (activeTab === 'upsell') {
        const analyticsData = await getAIAnalytics();
        setAnalytics(analyticsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async (key: string, value: string) => {
    try {
      setSaving(true);
      await updateAIConfig({ key, value });
      setConfig((prev) =>
        prev ? { ...prev, [key]: { ...prev[key], value } } : prev
      );
    } catch (err) {
      setError('Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPricing = async (suggestion: PricingSuggestion) => {
    try {
      await applyPricingSuggestion(suggestion.id, suggestion.menu_item_id, suggestion.suggested_price);
      setPricingSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    } catch (err) {
      setError('Failed to apply pricing');
    }
  };

  const handleRoleUpdate = async (categoryId: number, role: string) => {
    try {
      await updateCategoryRole(categoryId, role);
      setCategoryRoles((prev) =>
        prev.map((r) => (r.category_id === categoryId ? { ...r, role } : r))
      );
    } catch (err) {
      setError('Failed to update role');
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAIConfig();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-config.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export config');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importAIConfig(data);
        fetchData();
      } catch (err) {
        setError('Failed to import config');
      }
    };
    input.click();
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Sparkles size={18} /> },
    { id: 'upsell', label: 'Upsell', icon: <BarChart3 size={18} /> },
    { id: 'inventory', label: 'Inventory AI', icon: <Package size={18} /> },
    { id: 'pricing', label: 'Pricing', icon: <DollarSign size={18} /> },
    { id: 'config', label: 'Config', icon: <Settings size={18} /> },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-400 bg-red-900/30 border-red-800';
      case 'high': return 'text-orange-400 bg-orange-900/30 border-orange-800';
      case 'medium': return 'text-amber-400 bg-amber-900/30 border-amber-800';
      case 'low': return 'text-green-400 bg-green-900/30 border-green-800';
      default: return 'text-neutral-400 bg-neutral-800 border-neutral-700';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <Sparkles className="text-red-500" size={28} />
          <h1 className="text-3xl font-black tracking-tighter">AI Intelligence</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-neutral-950 text-red-500 border-t-2 border-red-500'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 animate-pulse">
                <div className="h-20 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && insights && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">Suggestion Acceptance</p>
                    <p className="text-3xl font-bold text-red-500 mt-2">{insights.suggestions.acceptanceRate}%</p>
                    <p className="text-neutral-500 text-xs mt-1">{insights.suggestions.totalEvents} total events</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">Items to Push</p>
                    <p className="text-3xl font-bold text-green-500 mt-2">{insights.inventory.pushItems}</p>
                    <p className="text-neutral-500 text-xs mt-1">Good stock alternatives</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">Items to Avoid</p>
                    <p className="text-3xl font-bold text-amber-500 mt-2">{insights.inventory.avoidItems}</p>
                    <p className="text-neutral-500 text-xs mt-1">Low ingredient items</p>
                  </div>
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <p className="text-neutral-400 text-sm">Claude API</p>
                    <p className="text-3xl font-bold text-white mt-2">
                      {insights.claudeStats.enabled ? 'Active' : 'Off'}
                    </p>
                    <p className="text-neutral-500 text-xs mt-1">
                      {insights.claudeStats.callsThisHour}/{insights.claudeStats.maxCallsPerHour} calls/hr
                    </p>
                  </div>
                </div>

                {/* AI Revenue */}
                {analytics && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-4">AI-Driven Revenue</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-neutral-800 rounded-lg">
                        <p className="text-neutral-400 text-sm">AI-Suggested Items Sold</p>
                        <p className="text-2xl font-bold text-white">{analytics.aiRevenue.itemsSold}</p>
                      </div>
                      <div className="p-4 bg-neutral-800 rounded-lg">
                        <p className="text-neutral-400 text-sm">Revenue from AI Suggestions</p>
                        <p className="text-2xl font-bold text-red-500">{formatPrice(analytics.aiRevenue.revenue)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Item Pairs */}
                {insights.topItemPairs.length > 0 && (
                  <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-4">Frequently Ordered Together</h3>
                    <div className="space-y-2">
                      {insights.topItemPairs.slice(0, 5).map((pair, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                          <span className="text-white">
                            {pair.item_a_name} + {pair.item_b_name}
                          </span>
                          <span className="text-neutral-400 text-sm">{pair.pair_count}x together</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduler Status */}
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-lg font-bold text-white mb-4">Background Jobs</h3>
                  <div className="space-y-2">
                    {insights.aiStatus.scheduler.jobs.map((job, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{job.name}</p>
                          <p className="text-neutral-500 text-xs">
                            Every {Math.round(job.intervalMs / 60000)}min | Runs: {job.runCount}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          job.lastRun ? 'bg-green-900/30 text-green-400' : 'bg-neutral-700 text-neutral-400'
                        }`}>
                          {job.lastRun ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upsell Tab */}
            {activeTab === 'upsell' && analytics && (
              <div className="space-y-6">
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-lg font-bold text-white mb-4">Suggestion Performance</h3>
                  {analytics.byType.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-neutral-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Rule</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Action</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.byType.map((row, i) => (
                            <tr key={i} className="border-b border-neutral-800">
                              <td className="px-4 py-3 text-white">{row.suggestion_type}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  row.action === 'accepted' ? 'bg-green-900/30 text-green-400' : 'bg-neutral-700 text-neutral-400'
                                }`}>
                                  {row.action}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-neutral-300">{row.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-center py-8">No suggestion data yet. Suggestions will appear as cashiers interact with the POS.</p>
                  )}
                </div>
              </div>
            )}

            {/* Inventory AI Tab */}
            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Inventory Forecast</h3>
                    <button onClick={fetchData} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400">
                      <RefreshCw size={18} />
                    </button>
                  </div>
                  {forecasts.length > 0 ? (
                    <div className="space-y-3">
                      {forecasts.map((f) => (
                        <div key={f.inventory_item_id} className={`p-4 rounded-lg border ${getRiskColor(f.risk_level)}`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white">{f.name}</p>
                              <p className="text-sm text-neutral-400">
                                {f.current_quantity} {f.unit} | Avg {f.avg_daily_usage}/{f.unit}/day
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(f.risk_level)}`}>
                                {f.risk_level.toUpperCase()}
                              </span>
                              {f.days_until_stockout !== null && (
                                <p className="text-sm text-neutral-400 mt-1">
                                  ~{f.days_until_stockout} days left
                                </p>
                              )}
                            </div>
                          </div>
                          {f.suggested_reorder_qty && (
                            <p className="text-xs text-neutral-500 mt-2">
                              Suggested reorder: {f.suggested_reorder_qty} {f.unit}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-center py-8">Not enough data for forecasts yet. Continue taking orders to build velocity data.</p>
                  )}
                </div>
              </div>
            )}

            {/* Pricing Tab */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-lg font-bold text-white mb-4">Dynamic Pricing Suggestions</h3>
                  {pricingSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      {pricingSuggestions.map((s) => (
                        <div key={s.id} className="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-white">{s.item_name}</p>
                              <p className="text-sm text-neutral-400">{s.reason}</p>
                              <p className="text-sm mt-1">
                                <span className="text-neutral-500">{formatPrice(s.current_price)}</span>
                                <span className="mx-2 text-neutral-600">&rarr;</span>
                                <span className={s.type === 'markup' ? 'text-amber-400' : 'text-green-400'}>
                                  {formatPrice(s.suggested_price)}
                                </span>
                                <span className={`ml-2 text-xs ${s.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                                  ({s.change_percent > 0 ? '+' : ''}{s.change_percent}%)
                                </span>
                              </p>
                            </div>
                            <button
                              onClick={() => handleApplyPricing(s)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 text-center py-8">
                      No pricing suggestions right now. Enable dynamic pricing in Config and suggestions will appear during rush/slow periods.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && config && (
              <div className="space-y-6">
                {/* Export/Import */}
                <div className="flex gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <Download size={16} /> Export Config
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <Upload size={16} /> Import Config
                  </button>
                </div>

                {/* Category Role Mapping */}
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-lg font-bold text-white mb-4">Category Role Mapping</h3>
                  <div className="space-y-3">
                    {categoryRoles.map((cr) => (
                      <div key={cr.category_id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                        <span className="text-white font-medium">{cr.category_name}</span>
                        <select
                          value={cr.role}
                          onChange={(e) => handleRoleUpdate(cr.category_id, e.target.value)}
                          className="px-3 py-1 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm"
                        >
                          <option value="main">Main</option>
                          <option value="side">Side</option>
                          <option value="drink">Drink</option>
                          <option value="combo">Combo</option>
                          <option value="dessert">Dessert</option>
                          <option value="addon">Add-on</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Config Key-Value Editor */}
                <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
                  <h3 className="text-lg font-bold text-white mb-4">AI Settings</h3>
                  <div className="space-y-3">
                    {Object.entries(config).map(([key, entry]) => (
                      <div key={key} className="flex items-center gap-4 p-3 bg-neutral-800 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{key}</p>
                          {entry.description && (
                            <p className="text-neutral-500 text-xs truncate">{entry.description}</p>
                          )}
                        </div>
                        {entry.value === '0' || entry.value === '1' ? (
                          <button
                            onClick={() => handleConfigUpdate(key, entry.value === '1' ? '0' : '1')}
                            disabled={saving}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              entry.value === '1'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                            }`}
                          >
                            {entry.value === '1' ? 'ON' : 'OFF'}
                          </button>
                        ) : (
                          <input
                            type="text"
                            defaultValue={entry.value}
                            onBlur={(e) => {
                              if (e.target.value !== entry.value) {
                                handleConfigUpdate(key, e.target.value);
                              }
                            }}
                            className="w-48 px-3 py-1.5 bg-neutral-700 border border-neutral-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-600"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
