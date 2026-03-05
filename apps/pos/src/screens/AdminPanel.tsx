import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  UtensilsCrossed,
  Package,
  Users,
  BarChart3,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  Monitor,
  Sliders,
  Printer,
  Truck,
  Shield,
  FileText,
  Calendar,
  Heart,
  Tv,
  Paintbrush,
  CreditCard,
  Check,
  X,
  UserCog,
  Receipt,
  TrendingUp,
  Plug,
  BookOpen,
  Gauge,
  Landmark,
} from 'lucide-react';
import { getSalesReport, getLowStock, createCheckoutSession, createPortalSession, getBankConfirmedTotal, getDemoDataStatus, generateDemoData, clearDemoData, DemoDataStatus, getOnboardingStatus } from '../api';
import { SalesReport, InventoryItem } from '../types';
import { formatPrice } from '../utils/currency';
import BrandLogo from '../components/BrandLogo';
import BankingSummaryWidget from '../components/banking/BankingSummaryWidget';
import BankSyncBanner from '../components/banking/BankSyncBanner';
import { usePlan } from '../context/PlanContext';
import { useLocation } from 'react-router-dom';
import TemplatePickerModal from '../components/menu/TemplatePickerModal';
import { invalidateMenuCache } from '../lib/menuCache';

/* ── Top Features by Plan (rotating carousel) ── */
const FEATURE_GROUPS = [
  [
    { name: 'AI-Powered Upsell Suggestions', plans: { trial: false, starter: false, pro: true, ghost_kitchen: true } },
    { name: 'Delivery Platform Intelligence', plans: { trial: false, starter: true, pro: true, ghost_kitchen: true } },
    { name: 'Dynamic Menu Pricing', plans: { trial: false, starter: false, pro: true, ghost_kitchen: true } },
    { name: 'Loyalty & Stamp Cards', plans: { trial: false, starter: true, pro: true, ghost_kitchen: true } },
  ],
  [
    { name: 'Virtual Brands per Kitchen', plans: { trial: false, starter: false, pro: false, ghost_kitchen: true } },
    { name: 'Bank Account Integration', plans: { trial: false, starter: false, pro: 'Up to 2', ghost_kitchen: 'Up to 5' } },
    { name: 'Custom Role Permissions', plans: { trial: false, starter: true, pro: true, ghost_kitchen: true } },
    { name: 'Prep Forecast & Waste Reduction', plans: { trial: false, starter: true, pro: true, ghost_kitchen: true } },
  ],
  [
    { name: 'Real-time Kitchen Printers', plans: { trial: false, starter: true, pro: true, ghost_kitchen: true } },
    { name: 'Stress Test Simulations', plans: { trial: false, starter: false, pro: true, ghost_kitchen: true } },
    { name: 'A/B Price Testing', plans: { trial: false, starter: false, pro: false, ghost_kitchen: true } },
    { name: 'White-label Branding', plans: { trial: false, starter: true, pro: true, ghost_kitchen: true } },
  ],
];

const PLAN_COLS = [
  { key: 'trial' as const, label: 'Free', dim: true },
  { key: 'starter' as const, label: 'Starter', dim: false },
  { key: 'pro' as const, label: 'Pro', dim: false },
  { key: 'ghost_kitchen' as const, label: 'Ghost Kitchen', dim: false },
];

function TopFeaturesByPlan({ plan: currentPlan }: { plan: string }) {
  const [groupIdx, setGroupIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setGroupIdx(i => (i + 1) % FEATURE_GROUPS.length);
        setFade(true);
      }, 300);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const features = FEATURE_GROUPS[groupIdx];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Top Features by Plan</h3>
        <div className="flex gap-1.5">
          {FEATURE_GROUPS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFade(false); setTimeout(() => { setGroupIdx(i); setFade(true); }, 300); }}
              className={`w-2 h-2 rounded-full transition-colors ${i === groupIdx ? 'bg-brand-500' : 'bg-neutral-700 hover:bg-neutral-500'}`}
            />
          ))}
        </div>
      </div>
      <div className={`transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left py-2 pr-4 text-neutral-400 font-medium">Feature</th>
                {PLAN_COLS.map(c => (
                  <th key={c.key} className={`text-center py-2 px-3 font-medium ${c.key === currentPlan ? 'text-brand-400' : c.dim ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={f.name} className={i < features.length - 1 ? 'border-b border-neutral-800/50' : ''}>
                  <td className="py-2.5 pr-4 text-neutral-300">{f.name}</td>
                  {PLAN_COLS.map(c => {
                    const val = f.plans[c.key];
                    return (
                      <td key={c.key} className="text-center py-2.5 px-3">
                        {val === true ? (
                          <Check size={14} className="inline text-green-400" />
                        ) : val === false ? (
                          <X size={14} className="inline text-neutral-600" />
                        ) : (
                          <span className="text-green-400 text-xs font-medium">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { t } = useTranslation('admin');
  const { plan, refresh: refreshPlan } = usePlan();
  const location = useLocation();
  const [dailyStats, setDailyStats] = useState<SalesReport | null>(null);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [confirmedInBank, setConfirmedInBank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [showCancelledBanner, setShowCancelledBanner] = useState(false);
  const [demoStatus, setDemoStatus] = useState<DemoDataStatus | null>(null);
  const [demoAction, setDemoAction] = useState<'generate' | 'clear' | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [menuEmpty, setMenuEmpty] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const isPro = plan === 'pro' || plan === 'ghost_kitchen';

  const hasOwnerToken = true; // Admin employees can now access via employee JWT

  // Refresh plan after billing success redirect, show cancelled banner
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('billing') === 'success') {
      refreshPlan();
    }
    if (params.get('billing') === 'cancelled') {
      setShowCancelledBanner(true);
    }
  }, [location.search, refreshPlan]);

  const handleSubscribe = async (selectedPlan: 'starter' | 'pro') => {
    setBillingLoading(selectedPlan);
    setBillingError(null);
    try {
      const { url } = await createCheckoutSession(selectedPlan);
      window.location.href = url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to start checkout');
      setBillingLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading('portal');
    setBillingError(null);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setBillingLoading(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [stats, lowStock] = await Promise.all([
          getSalesReport('today'),
          getLowStock(),
        ]);
        setDailyStats(stats);
        setLowStockItems(lowStock);

        // Check if menu is empty (non-blocking)
        getOnboardingStatus()
          .then(s => setMenuEmpty(!s.has_menu_items))
          .catch(() => {});

        // Fetch demo data status for trial tenants (non-blocking)
        if (plan === 'trial') {
          getDemoDataStatus().then(setDemoStatus).catch(() => {});
        }

        // Fetch confirmed bank deposits for pro+ tenants (non-blocking, requires owner token)
        if ((plan === 'pro' || plan === 'ghost_kitchen') && hasOwnerToken) {
          const today = new Date().toISOString().split('T')[0];
          getBankConfirmedTotal(today, today)
            .then(data => setConfirmedInBank(data.confirmedTotal))
            .catch(() => {}); // not critical
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('panel.failedToFetch'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/pos"
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-3xl font-black tracking-tighter">{t('panel.title')}</h1>
            <span className={`ml-3 px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${
              plan === 'pro' ? 'bg-brand-600/20 text-brand-400' :
              plan === 'starter' ? 'bg-blue-600/20 text-blue-400' :
              'bg-neutral-700/50 text-neutral-400'
            }`}>
              {plan}
            </span>
          </div>
          <BrandLogo className="h-10" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-brand-900/30 border border-brand-800 rounded-lg p-4 mb-6">
            <p className="text-brand-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 animate-pulse">
                <div className="h-20 bg-neutral-800 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-4 mb-8 ${isPro && confirmedInBank !== null ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">{t('panel.todaysRevenue')}</p>
              <p className="text-3xl font-bold text-brand-500 mt-2">
                {formatPrice(dailyStats?.total_revenue || 0)}
              </p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">{t('panel.orders')}</p>
              <p className="text-3xl font-bold text-white mt-2">
                {dailyStats?.order_count || 0}
              </p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">{t('panel.avgTicket')}</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatPrice(dailyStats?.avg_ticket || 0)}
              </p>
            </div>
            <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
              <p className="text-neutral-400 text-sm font-medium">{t('panel.totalTips')}</p>
              <p className="text-3xl font-bold text-white mt-2">
                {formatPrice(dailyStats?.tip_total || 0)}
              </p>
            </div>
            {isPro && confirmedInBank !== null && (
              <Link to="/admin/banking" className="bg-neutral-900 p-6 rounded-lg border border-neutral-800 hover:border-green-600 transition-colors">
                <div className="flex items-center gap-1.5">
                  <Landmark size={14} className="text-green-400" />
                  <p className="text-neutral-400 text-sm font-medium">Confirmed in Bank</p>
                </div>
                <p className="text-3xl font-bold text-green-400 mt-2">
                  {formatPrice(confirmedInBank)}
                </p>
              </Link>
            )}
          </div>
        )}

        {/* Cancelled billing banner */}
        {showCancelledBanner && (
          <div className="flex items-center justify-between bg-neutral-900 border border-neutral-700 rounded-lg p-4 mb-6">
            <p className="text-neutral-300 text-sm">Checkout was cancelled. You can subscribe anytime below.</p>
            <button onClick={() => setShowCancelledBanner(false)} className="text-neutral-500 hover:text-neutral-300">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Plan & Billing */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="text-brand-500" size={24} />
            <h2 className="text-xl font-bold text-white">Plan & Billing</h2>
          </div>

          {billingError && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
              <p className="text-red-300 text-sm">{billingError}</p>
            </div>
          )}

          {!hasOwnerToken ? (
            <p className="text-neutral-400 text-sm">
              <Link to="/admin/account" className="text-brand-400 hover:text-brand-300 underline">Sign in as account owner</Link> to manage billing.
            </p>
          ) : plan === 'trial' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Starter Card */}
              <div className="border border-neutral-700 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-3xl font-black text-white">$29<span className="text-base font-normal text-neutral-400">/mo</span></p>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Unlimited orders</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Up to 5 employees</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Basic reports</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Inventory management</li>
                </ul>
                <button
                  onClick={() => handleSubscribe('starter')}
                  disabled={billingLoading !== null}
                  className="w-full py-2.5 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {billingLoading === 'starter' ? 'Redirecting...' : 'Subscribe to Starter'}
                </button>
              </div>

              {/* Pro Card */}
              <div className="border border-brand-600 rounded-xl p-6 space-y-4 relative">
                <span className="absolute -top-3 right-4 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</span>
                <h3 className="text-lg font-bold text-white">Pro</h3>
                <p className="text-3xl font-black text-white">$79<span className="text-base font-normal text-neutral-400">/mo</span></p>
                <ul className="space-y-2 text-sm text-neutral-300">
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Everything in Starter</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Unlimited employees</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> AI intelligence & analytics</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Delivery platforms & virtual brands</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Loyalty & CRM</li>
                  <li className="flex items-center gap-2"><Check size={16} className="text-brand-500" /> Bank account integration (up to 2)</li>
                </ul>
                <button
                  onClick={() => handleSubscribe('pro')}
                  disabled={billingLoading !== null}
                  className="w-full py-2.5 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {billingLoading === 'pro' ? 'Redirecting...' : 'Subscribe to Pro'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-neutral-400 text-sm">Current plan</p>
                <p className="text-xl font-bold text-white capitalize">{plan} — {plan === 'starter' ? '$29' : '$79'}/mo</p>
              </div>
              <div className="flex gap-3 ml-auto">
                {plan === 'starter' && (
                  <button
                    onClick={() => handleSubscribe('pro')}
                    disabled={billingLoading !== null}
                    className="px-5 py-2.5 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {billingLoading === 'pro' ? 'Redirecting...' : 'Upgrade to Pro'}
                  </button>
                )}
                <button
                  onClick={handleManageBilling}
                  disabled={billingLoading !== null}
                  className="px-5 py-2.5 border border-neutral-600 text-neutral-200 font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {billingLoading === 'portal' ? 'Redirecting...' : 'Manage Subscription'}
                </button>
              </div>
            </div>
          )}

          {/* Top Features by Plan — rotating carousel */}
          <TopFeaturesByPlan plan={plan} />
        </div>

        {/* Demo Data — trial tenants only */}
        {plan === 'trial' && demoStatus?.allowed && (
          <div className="bg-neutral-900 border border-amber-800/50 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-amber-600/10 rounded-lg">
                <Sparkles className="text-amber-500" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Demo Data</h2>
                <p className="text-xs text-neutral-400">Populate this account with realistic sample data for demos</p>
              </div>
            </div>

            {demoError && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">{demoError}</p>
              </div>
            )}

            {demoStatus.hasDemo && demoStatus.counts ? (
              <div>
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="px-3 py-1.5 bg-brand-900/30 text-brand-400 text-sm rounded-lg font-medium">
                    {demoStatus.counts.orders} orders
                  </span>
                  <span className="px-3 py-1.5 bg-brand-900/30 text-brand-400 text-sm rounded-lg font-medium">
                    {demoStatus.counts.customers} loyalty customers
                  </span>
                  <span className="px-3 py-1.5 bg-brand-900/30 text-brand-400 text-sm rounded-lg font-medium">
                    {demoStatus.counts.delivery_orders} delivery orders
                  </span>
                  <span className="px-3 py-1.5 bg-brand-900/30 text-brand-400 text-sm rounded-lg font-medium">
                    {demoStatus.counts.ai_snapshots} AI snapshots
                  </span>
                  <span className="px-3 py-1.5 bg-brand-900/30 text-brand-400 text-sm rounded-lg font-medium">
                    {demoStatus.counts.financial_actuals} financial records
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mb-3">Reports, analytics, loyalty, and delivery data are populated. Clear when done.</p>
                <button
                  onClick={async () => {
                    setDemoAction('clear');
                    setDemoError(null);
                    try {
                      await clearDemoData();
                      const s = await getDemoDataStatus();
                      setDemoStatus(s);
                    } catch (e) {
                      setDemoError(e instanceof Error ? e.message : 'Failed to clear');
                    } finally {
                      setDemoAction(null);
                    }
                  }}
                  disabled={demoAction !== null}
                  className="px-5 py-2.5 border border-red-700 text-red-400 font-medium rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {demoAction === 'clear' ? 'Clearing...' : 'Clear Demo Data'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-neutral-400 mb-4">
                  Generate 150 orders, loyalty customers, delivery orders, AI analytics, and financial data spanning 30 days.
                  Perfect for showing prospects the full capabilities of the system.
                </p>
                <button
                  onClick={async () => {
                    setDemoAction('generate');
                    setDemoError(null);
                    try {
                      await generateDemoData();
                      const s = await getDemoDataStatus();
                      setDemoStatus(s);
                    } catch (e) {
                      setDemoError(e instanceof Error ? e.message : 'Failed to generate');
                    } finally {
                      setDemoAction(null);
                    }
                  }}
                  disabled={demoAction !== null}
                  className="px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {demoAction === 'generate' ? 'Generating...' : 'Populate Demo Data'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bank Sync Failure Banner */}
        {isPro && hasOwnerToken && <BankSyncBanner />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Quick Setup card — shown when menu is empty */}
          {menuEmpty && (
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="text-left bg-neutral-900 p-8 rounded-lg border border-brand-600/50 hover:border-brand-500 transition-all cursor-pointer h-full relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 bg-brand-600/20 text-brand-400 text-[10px] font-bold rounded-full uppercase">
                  Recommended
                </span>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/20 rounded-lg mb-4">
                <Sparkles className="text-brand-400" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Quick Setup</h2>
              <p className="text-neutral-400 text-sm">Use a template to instantly set up your menu, inventory, and recipes</p>
            </button>
          )}

          <Link to="/admin/ai">
            <div className="bg-neutral-900 p-8 rounded-lg border border-violet-700/30 hover:border-violet-500 transition-all cursor-pointer h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 bg-violet-600/10 rounded-lg mb-4">
                  <Sparkles className="text-violet-400" size={28} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">{t('cards.aiIntelligence')}</h2>
                <p className="text-neutral-400 text-sm">{t('cards.aiDesc')}</p>
              </div>
            </div>
          </Link>

          <Link to="/admin/menu">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <UtensilsCrossed className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.menuManagement')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.menuDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/recipes">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <BookOpen className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Recipes</h2>
              <p className="text-neutral-400 text-sm">Manage ingredients and costs per menu item</p>
            </div>
          </Link>

          <Link to="/admin/inventory">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Package className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.inventory')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.inventoryDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/employees">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Users className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.employees')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.employeesDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/reports">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <BarChart3 className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.reports')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.reportsDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/pricing">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <TrendingUp className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Dynamic Pricing</h2>
              <p className="text-neutral-400 text-sm">AI-powered price optimization</p>
            </div>
          </Link>

          <Link to="/admin/dashboard">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Monitor className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.liveDashboard')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.dashboardDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/modifiers">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Sliders className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.modifiersAndCombos')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.modifiersDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/printers">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Printer className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.printers')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.printersDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/delivery">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Truck className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.delivery')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.deliveryDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/permissions">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Shield className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.permissions')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.permissionsDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/purchase-orders">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <FileText className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.purchaseOrders')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.purchaseOrdersDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/prep-forecast">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Calendar className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.prepForecast')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.prepForecastDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/loyalty">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-purple-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-600/10 rounded-lg mb-4">
                <Heart className="text-purple-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.loyaltyCrm')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.loyaltyDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/branding">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Paintbrush className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.branding')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.brandingDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/menu-board">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Tv className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.menuBoard')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.menuBoardDesc')}</p>
            </div>
          </Link>

          <Link to="/admin/invoicing">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Receipt className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.invoicing', 'Facturación')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.invoicingDesc', 'Emitir y administrar facturas CFDI 4.0')}</p>
            </div>
          </Link>

          <Link to="/admin/integrations">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <Plug className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{t('cards.integrations', 'Integrations')}</h2>
              <p className="text-neutral-400 text-sm">{t('cards.integrationsDesc', 'Connect Stripe, Mercado Pago, Twilio, FacturAPI, and more')}</p>
            </div>
          </Link>

          <Link to="/admin/account">
            <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-brand-600 transition-all cursor-pointer h-full">
              <div className="flex items-center justify-center w-12 h-12 bg-brand-600/10 rounded-lg mb-4">
                <UserCog className="text-brand-500" size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Account</h2>
              <p className="text-neutral-400 text-sm">Manage your account, billing, and settings</p>
            </div>
          </Link>

          {isPro && (
            <Link to="/admin/banking">
              <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-green-600 transition-all cursor-pointer h-full">
                <div className="flex items-center justify-center w-12 h-12 bg-green-600/10 rounded-lg mb-4">
                  <Landmark className="text-green-500" size={28} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Bank Accounts</h2>
                <p className="text-neutral-400 text-sm">Connect your bank, track cash flow, reconcile delivery payouts</p>
              </div>
            </Link>
          )}

          {isPro && (
            <Link to="/admin/stress-test">
              <div className="bg-neutral-900 p-8 rounded-lg border border-neutral-800 hover:border-orange-600 transition-all cursor-pointer h-full">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-600/10 rounded-lg mb-4">
                  <Gauge className="text-orange-500" size={28} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Stress Test</h2>
                <p className="text-neutral-400 text-sm">Simulate rush hours, delivery surges, and find your system's breaking point</p>
              </div>
            </Link>
          )}
        </div>

        {/* Banking Summary Widget — pro/ghost_kitchen only */}
        {isPro && hasOwnerToken && (
          <div className="mb-8">
            <BankingSummaryWidget />
          </div>
        )}

        {lowStockItems.length > 0 && (
          <div className="bg-neutral-900 p-6 rounded-lg border border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-brand-500" size={24} />
              <h3 className="text-xl font-bold text-white">{t('lowStock.title')}</h3>
            </div>
            <div className="space-y-3">
              {lowStockItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-brand-900/20 rounded-lg border border-brand-900/40">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-sm text-neutral-400">
                      {t('lowStock.remaining', { quantity: item.quantity, unit: item.unit })}
                    </p>
                  </div>
                  <Link
                    to="/admin/inventory"
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    {t('lowStock.restock')}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onTemplateApplied={() => {
          setMenuEmpty(false);
          invalidateMenuCache();
        }}
      />
    </div>
  );
}
