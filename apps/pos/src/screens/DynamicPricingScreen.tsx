import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  Sparkles,
  Clock,
  History,
  Shield,
  FlaskConical,
  X,
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
import { usePlan } from '../context/PlanContext';
import UpgradePrompt from '../components/UpgradePrompt';
import DashboardTab from '../components/pricing/DashboardTab';
import SuggestionsTab from '../components/pricing/SuggestionsTab';
import RulesTab from '../components/pricing/RulesTab';
import HistoryTab from '../components/pricing/HistoryTab';
import GuardrailsTab from '../components/pricing/GuardrailsTab';
import ExperimentsTab from '../components/pricing/ExperimentsTab';
import RuleModal from '../components/pricing/RuleModal';
import ExperimentModal from '../components/pricing/ExperimentModal';

type Tab = 'dashboard' | 'suggestions' | 'rules' | 'history' | 'guardrails' | 'experiments';

export default function DynamicPricingScreen() {
  const { t } = useTranslation('admin');
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
        setError(err instanceof Error ? err.message : t('pricing.failedLoadData'));
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
      setError(err instanceof Error ? err.message : t('pricing.analysisFailed'));
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
      setError(err?.violations?.join(', ') || err.message || t('pricing.failedApply'));
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
      setError(t('pricing.failedSaveRule'));
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
      setError(err instanceof Error ? err.message : t('pricing.failedRevert'));
    }
  };

  const handleSaveGuardrails = async () => {
    if (!guardrails) return;
    try {
      await updatePricingGuardrails(guardrails);
      setGuardrailDirty(false);
    } catch { setError(t('pricing.failedSaveGuardrails')); }
  };

  const handleSaveExperiment = async (data: any) => {
    try {
      await createPricingExperiment(data);
      setShowExpModal(false);
      loadData();
    } catch { setError(t('pricing.failedCreateExperiment')); }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; feature?: keyof typeof dp }[] = [
    { id: 'dashboard', label: t('pricing.tabs.dashboard'), icon: <TrendingUp size={18} /> },
    { id: 'suggestions', label: t('pricing.tabs.suggestions'), icon: <Sparkles size={18} /> },
    { id: 'rules', label: t('pricing.tabs.rules'), icon: <Clock size={18} />, feature: 'scheduledRules' },
    { id: 'history', label: t('pricing.tabs.history'), icon: <History size={18} />, feature: 'priceHistory' },
    { id: 'guardrails', label: t('pricing.tabs.guardrails'), icon: <Shield size={18} />, feature: 'guardrails' },
    { id: 'experiments', label: t('pricing.tabs.experiments'), icon: <FlaskConical size={18} />, feature: 'abTesting' },
  ];

  // Gate: if no dynamic pricing access at all
  if (!dp.aiSuggestions) {
    return (
      <div className="min-h-screen bg-neutral-950">
        <Header />
        <div className="max-w-7xl mx-auto p-6">
          <UpgradePrompt variant="overlay" message={t('pricing.upgradeOverlay')} />
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
                <span className="text-[10px] bg-neutral-700 text-neutral-400 px-1.5 py-0.5 rounded-full ml-1">{t('pricing.proPlus')}</span>
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
            {activeTab === 'dashboard' && dashboard && (
              <DashboardTab dashboard={dashboard} />
            )}

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
                <UpgradePrompt message={t('pricing.upgradeRules')} />
              )
            )}

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
                <UpgradePrompt message={t('pricing.upgradeHistory')} />
              )
            )}

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
                <UpgradePrompt message={t('pricing.upgradeGuardrails')} />
              )
            )}

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
                <UpgradePrompt message={t('pricing.upgradeExperiments')} />
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

function Header() {
  const { t } = useTranslation('admin');
  return (
    <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <TrendingUp className="text-brand-500" size={28} />
        <div>
          <h1 className="text-3xl font-black tracking-tighter">{t('pricing.screenTitle')}</h1>
          <p className="text-neutral-400 text-sm">{t('pricing.screenSubtitle')}</p>
        </div>
      </div>
    </div>
  );
}

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
