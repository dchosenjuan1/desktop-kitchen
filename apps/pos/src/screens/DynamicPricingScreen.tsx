import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  Sparkles,
  Clock,
  History,
  Shield,
  FlaskConical,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Undo2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import {
  getPricingDashboard,
  getEnhancedPricingSuggestions,
  triggerPricingAnalysis,
  applyEnhancedPricingSuggestion,
  dismissPricingSuggestion,
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  previewPricingRule,
  getPricingGuardrails,
  updatePricingGuardrails,
  getPriceHistory,
  revertPriceChange,
  getPricingExperiments,
  createPricingExperiment,
  updatePricingExperiment,
  applyExperimentWinner,
  getMenuItems,
  getCategories,
} from '../api';
import {
  PricingDashboard,
  PricingRule,
  PriceHistoryEntry,
  PricingGuardrails,
  PricingExperiment,
  GrokPricingSuggestion,
  MenuItem,
  MenuCategory,
} from '../types';
import { formatPrice } from '../utils/currency';
import { usePlan } from '../context/PlanContext';
import UpgradePrompt from '../components/UpgradePrompt';

type Tab = 'dashboard' | 'suggestions' | 'rules' | 'history' | 'guardrails' | 'experiments';

export default function DynamicPricingScreen() {
  const { limits } = usePlan();
  const dp = limits.dynamicPricing;
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard state
  const [dashboard, setDashboard] = useState<PricingDashboard | null>(null);

  // Suggestions state
  const [heuristicSuggestions, setHeuristicSuggestions] = useState<GrokPricingSuggestion[]>([]);
  const [grokSuggestions, setGrokSuggestions] = useState<GrokPricingSuggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Rules state
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<PricingRule> | null>(null);
  const [rulePreview, setRulePreview] = useState<any[] | null>(null);

  // History state
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySource, setHistorySource] = useState<string>('');

  // Guardrails state
  const [guardrails, setGuardrails] = useState<PricingGuardrails | null>(null);
  const [guardrailDirty, setGuardrailDirty] = useState(false);

  // Experiments state
  const [experiments, setExperiments] = useState<PricingExperiment[]>([]);
  const [showExpModal, setShowExpModal] = useState(false);

  // Menu items for selectors
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'dashboard') {
        const data = await getPricingDashboard();
        setDashboard(data);
      } else if (activeTab === 'suggestions') {
        const data = await getEnhancedPricingSuggestions();
        setHeuristicSuggestions(data.heuristic || []);
        setGrokSuggestions(data.grok || []);
      } else if (activeTab === 'rules') {
        const [rulesData, items, cats] = await Promise.all([getPricingRules(), getMenuItems(), getCategories()]);
        setRules(rulesData);
        setMenuItems(items);
        setCategories(cats);
      } else if (activeTab === 'history') {
        const data = await getPriceHistory({ page: historyPage, limit: 20, source: historySource || undefined });
        setHistory(data.data);
        setHistoryTotal(data.total);
      } else if (activeTab === 'guardrails') {
        const [g, items] = await Promise.all([getPricingGuardrails(), getMenuItems()]);
        setGuardrails(g);
        setMenuItems(items);
        setGuardrailDirty(false);
      } else if (activeTab === 'experiments') {
        const [exps, items] = await Promise.all([getPricingExperiments(), getMenuItems()]);
        setExperiments(exps);
        setMenuItems(items);
      }
    } catch (err: any) {
      if (err?.message?.includes('upgrade')) {
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, historyPage, historySource]);

  useEffect(() => { if (dp.aiSuggestions) loadData(); else setLoading(false); }, [loadData, dp.aiSuggestions]);

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const result = await triggerPricingAnalysis();
      setGrokSuggestions(result.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplySuggestion = async (s: GrokPricingSuggestion) => {
    try {
      await applyEnhancedPricingSuggestion(s.id, s.menu_item_id, s.suggested_price);
      setHeuristicSuggestions(prev => prev.filter(x => x.id !== s.id));
      setGrokSuggestions(prev => prev.filter(x => x.id !== s.id));
    } catch (err: any) {
      setError(err?.violations?.join(', ') || err.message || 'Failed to apply');
    }
  };

  const handleDismissSuggestion = async (s: GrokPricingSuggestion) => {
    await dismissPricingSuggestion(s.id);
    setHeuristicSuggestions(prev => prev.filter(x => x.id !== s.id));
    setGrokSuggestions(prev => prev.filter(x => x.id !== s.id));
  };

  const handleSaveRule = async () => {
    if (!editingRule?.name || editingRule.adjustment_value == null) return;
    try {
      if (editingRule.id) {
        await updatePricingRule(editingRule.id, editingRule);
      } else {
        await createPricingRule(editingRule);
      }
      setShowRuleModal(false);
      setEditingRule(null);
      loadData();
    } catch (err) {
      setError('Failed to save rule');
    }
  };

  const handleDeleteRule = async (id: number) => {
    await deletePricingRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handlePreviewRule = async (id: number) => {
    try {
      const preview = await previewPricingRule(id);
      setRulePreview(preview);
    } catch { setRulePreview(null); }
  };

  const handleRevert = async (id: number) => {
    try {
      await revertPriceChange(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revert');
    }
  };

  const handleSaveGuardrails = async () => {
    if (!guardrails) return;
    try {
      await updatePricingGuardrails(guardrails);
      setGuardrailDirty(false);
    } catch { setError('Failed to save guardrails'); }
  };

  const handleSaveExperiment = async (data: any) => {
    try {
      await createPricingExperiment(data);
      setShowExpModal(false);
      loadData();
    } catch { setError('Failed to create experiment'); }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; feature?: keyof typeof dp }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={18} /> },
    { id: 'suggestions', label: 'AI Suggestions', icon: <Sparkles size={18} /> },
    { id: 'rules', label: 'Pricing Rules', icon: <Clock size={18} />, feature: 'scheduledRules' },
    { id: 'history', label: 'Price History', icon: <History size={18} />, feature: 'priceHistory' },
    { id: 'guardrails', label: 'Guardrails', icon: <Shield size={18} />, feature: 'guardrails' },
    { id: 'experiments', label: 'A/B Tests', icon: <FlaskConical size={18} />, feature: 'abTesting' },
  ];

  // Gate: if no dynamic pricing access at all
  if (!dp.aiSuggestions) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Header />
        <div className="max-w-7xl mx-auto p-6">
          <UpgradePrompt variant="overlay" message="Dynamic Pricing is available on the Pro plan. Optimize your menu prices with AI." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header />

      {/* Tab Navigation */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-neutral-950 text-brand-500 border-t-2 border-brand-500'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              } ${tab.feature && !dp[tab.feature] ? 'opacity-50' : ''}`}
            >
              {tab.icon}
              {tab.label}
              {tab.feature && !dp[tab.feature] && (
                <span className="text-[10px] bg-neutral-700 text-neutral-400 px-1.5 py-0.5 rounded-full ml-1">PRO+</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6 flex items-center justify-between">
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X size={16} /></button>
          </div>
        )}

        {loading ? <LoadingSkeleton /> : (
          <>
            {/* Dashboard */}
            {activeTab === 'dashboard' && dashboard && (
              <DashboardTab dashboard={dashboard} />
            )}

            {/* AI Suggestions */}
            {activeTab === 'suggestions' && (
              <SuggestionsTab
                heuristic={heuristicSuggestions}
                grok={grokSuggestions}
                analyzing={analyzing}
                onAnalyze={handleAnalyze}
                onApply={handleApplySuggestion}
                onDismiss={handleDismissSuggestion}
              />
            )}

            {/* Pricing Rules */}
            {activeTab === 'rules' && (
              dp.scheduledRules ? (
                <RulesTab
                  rules={rules}
                  menuItems={menuItems}
                  categories={categories}
                  onEdit={(r) => { setEditingRule(r); setShowRuleModal(true); }}
                  onDelete={handleDeleteRule}
                  onPreview={handlePreviewRule}
                  rulePreview={rulePreview}
                  onClosePreview={() => setRulePreview(null)}
                  onCreate={() => { setEditingRule({ rule_type: 'happy_hour', adjustment_type: 'percent', adjustment_value: -10, applies_to: { scope: 'all' }, priority: 0, active: true, auto_apply: false, max_stack: false }); setShowRuleModal(true); }}
                  onToggle={async (id, active) => { await updatePricingRule(id, { active }); loadData(); }}
                />
              ) : (
                <UpgradePrompt message="Scheduled Pricing Rules are available on the Pro plan." />
              )
            )}

            {/* Price History */}
            {activeTab === 'history' && (
              dp.priceHistory ? (
                <HistoryTab
                  history={history}
                  total={historyTotal}
                  page={historyPage}
                  source={historySource}
                  onPageChange={setHistoryPage}
                  onSourceChange={(s) => { setHistorySource(s); setHistoryPage(1); }}
                  onRevert={handleRevert}
                />
              ) : (
                <UpgradePrompt message="Price History is available on the Pro plan." />
              )
            )}

            {/* Guardrails */}
            {activeTab === 'guardrails' && (
              dp.guardrails ? (
                <GuardrailsTab
                  guardrails={guardrails}
                  menuItems={menuItems}
                  dirty={guardrailDirty}
                  onChange={(g) => { setGuardrails(g); setGuardrailDirty(true); }}
                  onSave={handleSaveGuardrails}
                />
              ) : (
                <UpgradePrompt message="Pricing Guardrails are available on the Pro plan." />
              )
            )}

            {/* A/B Experiments */}
            {activeTab === 'experiments' && (
              dp.abTesting ? (
                <ExperimentsTab
                  experiments={experiments}
                  menuItems={menuItems}
                  onUpdate={async (id, data) => { await updatePricingExperiment(id, data); loadData(); }}
                  onApplyWinner={async (id) => { await applyExperimentWinner(id); loadData(); }}
                  onCreate={() => setShowExpModal(true)}
                />
              ) : (
                <UpgradePrompt message="A/B Price Testing is available on the Ghost Kitchen plan." />
              )
            )}
          </>
        )}
      </div>

      {/* Rule Modal */}
      {showRuleModal && editingRule && (
        <RuleModal
          rule={editingRule}
          categories={categories}
          menuItems={menuItems}
          onChange={setEditingRule}
          onSave={handleSaveRule}
          onClose={() => { setShowRuleModal(false); setEditingRule(null); }}
        />
      )}

      {/* Experiment Modal */}
      {showExpModal && (
        <ExperimentModal
          menuItems={menuItems}
          onSave={handleSaveExperiment}
          onClose={() => setShowExpModal(false)}
        />
      )}
    </div>
  );
}

// ==================== Header ====================
function Header() {
  return (
    <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <TrendingUp className="text-brand-500" size={28} />
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Dynamic Pricing</h1>
          <p className="text-neutral-400 text-sm">AI-powered price optimization</p>
        </div>
      </div>
    </div>
  );
}

// ==================== Loading Skeleton ====================
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 animate-pulse">
          <div className="h-20 bg-neutral-800 rounded" />
        </div>
      ))}
    </div>
  );
}

// ==================== Dashboard Tab ====================
function DashboardTab({ dashboard }: { dashboard: PricingDashboard }) {
  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Active Rules" value={dashboard.activeRulesCount} color="text-brand-500" />
        <KPICard label="Changes (7d)" value={dashboard.recentChanges.length} color="text-amber-500" />
        <KPICard label="Revenue Impact" value={formatPrice(dashboard.totalRevenueImpact)} color={dashboard.totalRevenueImpact >= 0 ? 'text-green-500' : 'text-red-500'} />
        <KPICard label="Running Experiments" value={dashboard.runningExperiments} color="text-purple-500" />
      </div>

      {/* Revenue Chart */}
      {dashboard.chartData.length > 0 && (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <h3 className="text-lg font-bold text-white mb-4">Revenue & Price Changes (14 days)</h3>
          <div className="flex items-end gap-1 h-40">
            {dashboard.chartData.map((d, i) => {
              const maxRev = Math.max(...dashboard.chartData.map(x => x.revenue), 1);
              const height = (d.revenue / maxRev) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  {d.changes > 0 && (
                    <span className="text-[10px] text-amber-400 font-bold">{d.changes}</span>
                  )}
                  <div
                    className={`w-full rounded-t ${d.changes > 0 ? 'bg-amber-500/60' : 'bg-brand-600/40'}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${d.date}: ${formatPrice(d.revenue)}${d.changes ? ` (${d.changes} changes)` : ''}`}
                  />
                  {i % 2 === 0 && (
                    <span className="text-[9px] text-neutral-600 truncate w-full text-center">
                      {d.date.slice(5)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-600/40" /> Revenue</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500/60" /> Price change day</span>
          </div>
        </div>
      )}

      {/* Recent Changes */}
      {dashboard.recentChanges.length > 0 && (
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <h3 className="text-lg font-bold text-white mb-4">Recent Price Changes</h3>
          <div className="space-y-2">
            {dashboard.recentChanges.slice(0, 5).map(entry => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                <div>
                  <span className="text-white font-medium">{entry.item_name}</span>
                  <span className="mx-2 text-neutral-600">&rarr;</span>
                  <span className="text-neutral-400">{formatPrice(entry.old_price)}</span>
                  <span className="mx-1 text-neutral-600">&rarr;</span>
                  <span className={entry.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}>{formatPrice(entry.new_price)}</span>
                </div>
                <SourceBadge source={entry.source} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Suggestions Tab ====================
function SuggestionsTab({ heuristic, grok, analyzing, onAnalyze, onApply, onDismiss }: {
  heuristic: GrokPricingSuggestion[];
  grok: GrokPricingSuggestion[];
  analyzing: boolean;
  onAnalyze: () => void;
  onApply: (s: GrokPricingSuggestion) => void;
  onDismiss: (s: GrokPricingSuggestion) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Grok Analysis */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-brand-500" />
            AI-Powered Recommendations
          </h3>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {analyzing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {analyzing ? 'Analyzing...' : 'Analyze Prices'}
          </button>
        </div>

        {grok.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grok.map(s => (
              <SuggestionCard key={s.id} suggestion={s} onApply={onApply} onDismiss={onDismiss} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm text-center py-4">
            Click "Analyze Prices" to get AI-powered pricing recommendations based on your sales data.
          </p>
        )}
      </div>

      {/* Heuristic Suggestions */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={20} className="text-amber-500" />
          Real-Time Suggestions
        </h3>
        {heuristic.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {heuristic.map(s => (
              <SuggestionCard key={s.id} suggestion={s} onApply={onApply} onDismiss={onDismiss} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-500 text-sm text-center py-4">
            No real-time suggestions right now. Suggestions appear during rush/slow periods.
          </p>
        )}
      </div>
    </div>
  );
}

// ==================== Suggestion Card ====================
function SuggestionCard({ suggestion: s, onApply, onDismiss }: {
  suggestion: GrokPricingSuggestion;
  onApply: (s: GrokPricingSuggestion) => void;
  onDismiss: (s: GrokPricingSuggestion) => void;
}) {
  const confidenceColor = s.confidence >= 80 ? 'bg-green-600' : s.confidence >= 60 ? 'bg-amber-600' : 'bg-red-600';

  return (
    <div className="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-white">{s.item_name}</p>
          {s.source === 'grok' && s.confidence != null && (
            <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${confidenceColor}`}>
              {s.confidence}% confidence
            </span>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          s.source === 'grok' ? 'bg-purple-900/40 text-purple-400' : 'bg-neutral-700 text-neutral-400'
        }`}>
          {s.source === 'grok' ? 'AI' : 'Heuristic'}
        </span>
      </div>

      <div className="flex items-center gap-2 my-2">
        <span className="text-neutral-500">{formatPrice(s.current_price)}</span>
        <span className="text-neutral-600">&rarr;</span>
        <span className={s.type === 'markup' ? 'text-amber-400 font-bold' : 'text-green-400 font-bold'}>
          {formatPrice(s.suggested_price)}
        </span>
        <span className={`text-xs ${s.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}`}>
          ({s.change_percent > 0 ? '+' : ''}{s.change_percent.toFixed(1)}%)
        </span>
      </div>

      {s.reasoning && <p className="text-neutral-400 text-xs mb-2">{s.reasoning}</p>}
      {!s.reasoning && s.reason && <p className="text-neutral-400 text-xs mb-2">{s.reason}</p>}

      {s.projected_weekly_revenue_change != null && s.projected_weekly_revenue_change !== 0 && (
        <p className="text-xs text-neutral-500 mb-3">
          Projected weekly impact: <span className={s.projected_weekly_revenue_change > 0 ? 'text-green-400' : 'text-red-400'}>
            {s.projected_weekly_revenue_change > 0 ? '+' : ''}{formatPrice(s.projected_weekly_revenue_change)}
          </span>
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={() => onApply(s)} className="flex-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          Apply
        </button>
        <button onClick={() => onDismiss(s)} className="px-3 py-1.5 bg-neutral-700 text-neutral-300 rounded-lg text-sm hover:bg-neutral-600 transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ==================== Rules Tab ====================
function RulesTab({ rules, menuItems, categories, onEdit, onDelete, onPreview, rulePreview, onClosePreview, onCreate, onToggle }: {
  rules: PricingRule[];
  menuItems: MenuItem[];
  categories: MenuCategory[];
  onEdit: (r: PricingRule) => void;
  onDelete: (id: number) => void;
  onPreview: (id: number) => void;
  rulePreview: any[] | null;
  onClosePreview: () => void;
  onCreate: () => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const typeColors: Record<string, string> = {
    happy_hour: 'bg-amber-900/40 text-amber-400',
    day_of_week: 'bg-blue-900/40 text-blue-400',
    seasonal: 'bg-green-900/40 text-green-400',
    demand_based: 'bg-purple-900/40 text-purple-400',
    custom: 'bg-neutral-700 text-neutral-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Pricing Rules</h3>
        <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors">
          <Plus size={16} /> Create Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 text-center">
          <Clock size={40} className="mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">No pricing rules yet. Create one to automate price adjustments.</p>
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Adjustment</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Priority</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-300">Active</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{r.name}</p>
                    {r.description && <p className="text-neutral-500 text-xs truncate max-w-[200px]">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[r.rule_type] || typeColors.custom}`}>
                      {r.rule_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-300 text-sm">
                    {r.adjustment_value > 0 ? '+' : ''}{r.adjustment_value}{r.adjustment_type === 'percent' ? '%' : ' MXN'}
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-sm">{r.priority}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onToggle(r.id, !r.active)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        r.active ? 'bg-green-600 text-white' : 'bg-neutral-700 text-neutral-400'
                      }`}
                    >
                      {r.active ? 'ON' : 'OFF'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onPreview(r.id)} className="p-1.5 text-neutral-400 hover:text-brand-400 transition-colors" title="Preview"><Eye size={16} /></button>
                      <button onClick={() => onEdit(r)} className="p-1.5 text-neutral-400 hover:text-white transition-colors" title="Edit">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => onDelete(r.id)} className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rule Preview Modal */}
      {rulePreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClosePreview}>
          <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Rule Preview</h3>
              <button onClick={onClosePreview} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {rulePreview.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-neutral-800 rounded-lg">
                  <span className="text-white">{p.item_name}</span>
                  <div className="text-sm">
                    <span className="text-neutral-500">{formatPrice(p.current_price)}</span>
                    <span className="mx-2 text-neutral-600">&rarr;</span>
                    <span className={p.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}>
                      {formatPrice(p.projected_price)} ({p.change_percent > 0 ? '+' : ''}{p.change_percent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== History Tab ====================
function HistoryTab({ history, total, page, source, onPageChange, onSourceChange, onRevert }: {
  history: PriceHistoryEntry[];
  total: number;
  page: number;
  source: string;
  onPageChange: (p: number) => void;
  onSourceChange: (s: string) => void;
  onRevert: (id: number) => void;
}) {
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={source}
          onChange={e => onSourceChange(e.target.value)}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
        >
          <option value="">All Sources</option>
          <option value="manual">Manual</option>
          <option value="ai_suggestion">AI Suggestion</option>
          <option value="scheduled_rule">Scheduled Rule</option>
          <option value="ab_test">A/B Test</option>
          <option value="revert">Revert</option>
        </select>
        <span className="text-neutral-500 text-sm">{total} entries</span>
      </div>

      {history.length === 0 ? (
        <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 text-center">
          <History size={40} className="mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">No price changes recorded yet.</p>
        </div>
      ) : (
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Item</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Price Change</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Source</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-300">Revenue Impact</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id} className={`border-t border-neutral-800 ${h.reverted_at ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-neutral-400 text-sm whitespace-nowrap">
                    {new Date(h.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{h.item_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-neutral-500">{formatPrice(h.old_price)}</span>
                    <span className="mx-1 text-neutral-600">&rarr;</span>
                    <span className={h.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}>
                      {formatPrice(h.new_price)}
                    </span>
                    <span className={`ml-1 text-xs ${h.change_percent > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                      ({h.change_percent > 0 ? '+' : ''}{h.change_percent.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-4 py-3"><SourceBadge source={h.source} /></td>
                  <td className="px-4 py-3 text-sm">
                    {h.revenue_after_daily != null && h.revenue_before_daily != null ? (
                      <span className={(h.revenue_after_daily - h.revenue_before_daily) >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {(h.revenue_after_daily - h.revenue_before_daily) >= 0 ? '+' : ''}
                        {formatPrice(h.revenue_after_daily - h.revenue_before_daily)}/day
                      </span>
                    ) : (
                      <span className="text-neutral-600">pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!h.reverted_at && h.source !== 'revert' && (
                      <button onClick={() => onRevert(h.id)} className="p-1.5 text-neutral-400 hover:text-amber-400 transition-colors" title="Revert">
                        <Undo2 size={16} />
                      </button>
                    )}
                    {h.reverted_at && <span className="text-xs text-neutral-600">reverted</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white disabled:opacity-30"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Guardrails Tab ====================
function GuardrailsTab({ guardrails, menuItems, dirty, onChange, onSave }: {
  guardrails: PricingGuardrails | null;
  menuItems: MenuItem[];
  dirty: boolean;
  onChange: (g: PricingGuardrails) => void;
  onSave: () => void;
}) {
  if (!guardrails) return null;

  const update = (field: string, value: any) => {
    onChange({ ...guardrails, [field]: value } as PricingGuardrails);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield size={20} className="text-brand-500" />
          Pricing Guardrails
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-neutral-500 text-sm">Changes today: {guardrails.today_changes || 0}/{guardrails.max_daily_changes}</span>
          <button
            onClick={onSave}
            disabled={!dirty}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Max Discount */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Max Discount</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="-50"
              max="0"
              value={guardrails.min_change_percent}
              onChange={e => update('min_change_percent', parseFloat(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="text-white font-bold w-16 text-right">{guardrails.min_change_percent}%</span>
          </div>
        </div>

        {/* Max Markup */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Max Markup</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="50"
              value={guardrails.max_change_percent}
              onChange={e => update('max_change_percent', parseFloat(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="text-white font-bold w-16 text-right">+{guardrails.max_change_percent}%</span>
          </div>
        </div>

        {/* Max Daily Changes */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Max Daily Changes</label>
          <input
            type="number"
            value={guardrails.max_daily_changes}
            onChange={e => update('max_daily_changes', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
          />
        </div>

        {/* Approval Threshold */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Require Approval Above</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="50"
              value={guardrails.require_approval_above}
              onChange={e => update('require_approval_above', parseFloat(e.target.value))}
              className="flex-1 accent-brand-600"
            />
            <span className="text-white font-bold w-16 text-right">{guardrails.require_approval_above}%</span>
          </div>
        </div>

        {/* Cooldown Hours */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Cooldown Between Changes (hours)</label>
          <input
            type="number"
            value={guardrails.cooldown_hours}
            onChange={e => update('cooldown_hours', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
          />
        </div>

        {/* Notification Email */}
        <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
          <label className="block text-sm font-medium text-neutral-300 mb-2">Notification Email</label>
          <input
            type="email"
            value={guardrails.notification_email || ''}
            onChange={e => update('notification_email', e.target.value)}
            placeholder="alert@example.com"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-600"
          />
        </div>
      </div>

      {/* Protected Items */}
      <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
        <label className="block text-sm font-medium text-neutral-300 mb-3">Protected Items (cannot be auto-changed)</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {(guardrails.protected_item_ids || []).map(id => {
            const item = menuItems.find(m => m.id === id);
            return (
              <span key={id} className="flex items-center gap-1 px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full text-sm text-white">
                {item?.name || `#${id}`}
                <button onClick={() => update('protected_item_ids', guardrails.protected_item_ids.filter(x => x !== id))} className="text-neutral-400 hover:text-red-400">
                  <X size={14} />
                </button>
              </span>
            );
          })}
        </div>
        <select
          value=""
          onChange={e => {
            const id = parseInt(e.target.value);
            if (id && !(guardrails.protected_item_ids || []).includes(id)) {
              update('protected_item_ids', [...(guardrails.protected_item_ids || []), id]);
            }
          }}
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
        >
          <option value="">Add item...</option>
          {menuItems.filter(m => m.active && !(guardrails.protected_item_ids || []).includes(m.id)).map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ==================== Experiments Tab ====================
function ExperimentsTab({ experiments, menuItems, onUpdate, onApplyWinner, onCreate }: {
  experiments: PricingExperiment[];
  menuItems: MenuItem[];
  onUpdate: (id: number, data: any) => void;
  onApplyWinner: (id: number) => void;
  onCreate: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: 'bg-neutral-700 text-neutral-400',
    running: 'bg-green-900/40 text-green-400',
    paused: 'bg-amber-900/40 text-amber-400',
    completed: 'bg-blue-900/40 text-blue-400',
    cancelled: 'bg-red-900/40 text-red-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FlaskConical size={20} className="text-purple-500" />
          A/B Price Experiments
        </h3>
        <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors">
          <Plus size={16} /> New Experiment
        </button>
      </div>

      {experiments.length === 0 ? (
        <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 text-center">
          <FlaskConical size={40} className="mx-auto text-neutral-600 mb-4" />
          <p className="text-neutral-400">No experiments yet. Create one to test different prices.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map(exp => (
            <div key={exp.id} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-white font-bold">{exp.name}</h4>
                  <p className="text-neutral-500 text-sm">{exp.item_name} &middot; {exp.split_percent}/{100 - exp.split_percent} split</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[exp.status]}`}>
                  {exp.status}
                </span>
              </div>

              {/* Variant Comparison */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`p-4 rounded-lg border ${exp.results?.winner === 'a' ? 'border-green-600 bg-green-900/10' : 'border-neutral-700 bg-neutral-800'}`}>
                  <p className="text-sm text-neutral-400 mb-1">Variant A (Control)</p>
                  <p className="text-xl font-bold text-white">{formatPrice(exp.variant_a_price)}</p>
                  {exp.results?.variant_a && (
                    <div className="mt-2 text-xs text-neutral-500">
                      <p>{exp.results.variant_a.orders} orders</p>
                      <p>{formatPrice(exp.results.variant_a.revenue)} revenue</p>
                    </div>
                  )}
                  {exp.results?.winner === 'a' && <p className="text-green-400 text-xs font-bold mt-1">WINNER</p>}
                </div>
                <div className={`p-4 rounded-lg border ${exp.results?.winner === 'b' ? 'border-green-600 bg-green-900/10' : 'border-neutral-700 bg-neutral-800'}`}>
                  <p className="text-sm text-neutral-400 mb-1">Variant B (Test)</p>
                  <p className="text-xl font-bold text-white">{formatPrice(exp.variant_b_price)}</p>
                  {exp.results?.variant_b && (
                    <div className="mt-2 text-xs text-neutral-500">
                      <p>{exp.results.variant_b.orders} orders</p>
                      <p>{formatPrice(exp.results.variant_b.revenue)} revenue</p>
                    </div>
                  )}
                  {exp.results?.winner === 'b' && <p className="text-green-400 text-xs font-bold mt-1">WINNER</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {exp.status === 'draft' && (
                  <button onClick={() => onUpdate(exp.id, { status: 'running' })} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    Start
                  </button>
                )}
                {exp.status === 'running' && (
                  <button onClick={() => onUpdate(exp.id, { status: 'paused' })} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
                    Pause
                  </button>
                )}
                {exp.status === 'paused' && (
                  <button onClick={() => onUpdate(exp.id, { status: 'running' })} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                    Resume
                  </button>
                )}
                {exp.results?.winner && exp.status !== 'completed' && (
                  <button onClick={() => onApplyWinner(exp.id)} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
                    Apply Winner
                  </button>
                )}
                {(exp.status === 'running' || exp.status === 'paused') && (
                  <button onClick={() => onUpdate(exp.id, { status: 'cancelled' })} className="px-3 py-1.5 bg-neutral-700 text-neutral-300 rounded-lg text-sm hover:bg-neutral-600 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== Rule Modal ====================
function RuleModal({ rule, categories, menuItems, onChange, onSave, onClose }: {
  rule: Partial<PricingRule>;
  categories: MenuCategory[];
  menuItems: MenuItem[];
  onChange: (r: Partial<PricingRule>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">{rule.id ? 'Edit Rule' : 'Create Rule'}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
            <input
              value={rule.name || ''}
              onChange={e => onChange({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              placeholder="Happy Hour Discount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Type</label>
            <select
              value={rule.rule_type || 'happy_hour'}
              onChange={e => onChange({ ...rule, rule_type: e.target.value as any })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              <option value="happy_hour">Happy Hour</option>
              <option value="day_of_week">Day of Week</option>
              <option value="seasonal">Seasonal</option>
              <option value="demand_based">Demand Based</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Conditions based on type */}
          {(rule.rule_type === 'happy_hour' || rule.rule_type === 'day_of_week') && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Hours (e.g. 15-17)</label>
              <input
                value={rule.conditions?.hours || ''}
                onChange={e => onChange({ ...rule, conditions: { ...rule.conditions, hours: e.target.value } })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                placeholder="15-17"
              />
            </div>
          )}

          {rule.rule_type === 'day_of_week' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Days</label>
              <div className="flex gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                  const days = rule.conditions?.days || [];
                  const active = days.includes(i);
                  return (
                    <button
                      key={i}
                      onClick={() => onChange({
                        ...rule,
                        conditions: { ...rule.conditions, days: active ? days.filter((d: number) => d !== i) : [...days, i] }
                      })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${active ? 'bg-brand-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {rule.rule_type === 'seasonal' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={rule.conditions?.date_range?.[0] || ''}
                  onChange={e => onChange({ ...rule, conditions: { ...rule.conditions, date_range: [e.target.value, rule.conditions?.date_range?.[1] || ''] } })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={rule.conditions?.date_range?.[1] || ''}
                  onChange={e => onChange({ ...rule, conditions: { ...rule.conditions, date_range: [rule.conditions?.date_range?.[0] || '', e.target.value] } })}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Adjustment Type</label>
              <select
                value={rule.adjustment_type || 'percent'}
                onChange={e => onChange({ ...rule, adjustment_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed (MXN)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Value</label>
              <input
                type="number"
                value={rule.adjustment_value ?? 0}
                onChange={e => onChange({ ...rule, adjustment_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                placeholder="-10 for discount, +5 for markup"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Applies To</label>
            <select
              value={rule.applies_to?.scope || 'all'}
              onChange={e => onChange({ ...rule, applies_to: { scope: e.target.value as any, ids: e.target.value === 'all' ? undefined : [] } })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              <option value="all">All Items</option>
              <option value="categories">Specific Categories</option>
              <option value="items">Specific Items</option>
            </select>
          </div>

          {rule.applies_to?.scope === 'categories' && (
            <div className="flex flex-wrap gap-2">
              {categories.map(c => {
                const selected = (rule.applies_to?.ids || []).includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      const ids = rule.applies_to?.ids || [];
                      onChange({ ...rule, applies_to: { scope: 'categories', ids: selected ? ids.filter(x => x !== c.id) : [...ids, c.id] } });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${selected ? 'bg-brand-600 text-white' : 'bg-neutral-800 text-neutral-400'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          )}

          {rule.applies_to?.scope === 'items' && (
            <select
              value=""
              onChange={e => {
                const id = parseInt(e.target.value);
                if (id) {
                  const ids = rule.applies_to?.ids || [];
                  if (!ids.includes(id)) onChange({ ...rule, applies_to: { scope: 'items', ids: [...ids, id] } });
                }
              }}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
            >
              <option value="">Add item...</option>
              {menuItems.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>{m.name} - {formatPrice(m.price)}</option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Priority</label>
              <input
                type="number"
                value={rule.priority ?? 0}
                onChange={e => onChange({ ...rule, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.auto_apply || false}
                  onChange={e => onChange({ ...rule, auto_apply: e.target.checked })}
                  className="accent-brand-600"
                />
                Auto-apply
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Description (optional)</label>
            <input
              value={rule.description || ''}
              onChange={e => onChange({ ...rule, description: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
              placeholder="Happy hour 3-5pm weekdays"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors">
            {rule.id ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Experiment Modal ====================
function ExperimentModal({ menuItems, onSave, onClose }: {
  menuItems: MenuItem[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [itemId, setItemId] = useState<number>(0);
  const [variantB, setVariantB] = useState('');
  const [split, setSplit] = useState(50);

  const selectedItem = menuItems.find(m => m.id === itemId);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-neutral-900 rounded-xl border border-neutral-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">New A/B Experiment</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Experiment Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white" placeholder="Price test - Tacos" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Menu Item</label>
            <select value={itemId} onChange={e => setItemId(parseInt(e.target.value))} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white">
              <option value={0}>Select item...</option>
              {menuItems.filter(m => m.active).map(m => (
                <option key={m.id} value={m.id}>{m.name} ({formatPrice(m.price)})</option>
              ))}
            </select>
          </div>
          {selectedItem && (
            <>
              <div className="p-3 bg-neutral-800 rounded-lg text-sm">
                <span className="text-neutral-400">Variant A (current): </span>
                <span className="text-white font-bold">{formatPrice(selectedItem.price)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Variant B Price</label>
                <input type="number" value={variantB} onChange={e => setVariantB(e.target.value)} className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white" placeholder="New test price" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Traffic Split ({split}/{100 - split})</label>
                <input type="range" min="10" max="90" value={split} onChange={e => setSplit(parseInt(e.target.value))} className="w-full accent-brand-600" />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-800">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors">Cancel</button>
          <button
            onClick={() => onSave({ name, menu_item_id: itemId, variant_a_price: selectedItem?.price, variant_b_price: parseFloat(variantB), split_percent: split })}
            disabled={!name || !itemId || !variantB}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            Create Experiment
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Shared Components ====================
function KPICard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
      <p className="text-neutral-400 text-sm">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    manual: 'bg-neutral-700 text-neutral-300',
    ai_suggestion: 'bg-purple-900/40 text-purple-400',
    scheduled_rule: 'bg-blue-900/40 text-blue-400',
    ab_test: 'bg-green-900/40 text-green-400',
    delivery_sync: 'bg-amber-900/40 text-amber-400',
    revert: 'bg-red-900/40 text-red-400',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[source] || colors.manual}`}>
      {source.replace('_', ' ')}
    </span>
  );
}
