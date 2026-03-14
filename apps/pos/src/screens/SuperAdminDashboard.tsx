import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, LogOut } from 'lucide-react';
import { verifySecret } from '../api/superAdmin';
import { getFeatureFlags } from '../api';
import LoginGate from '../components/super-admin/LoginGate';
import OverviewTab from '../components/super-admin/OverviewTab';
import TenantsTab from '../components/super-admin/TenantsTab';
import RevenueTab from '../components/super-admin/RevenueTab';
import HealthTab from '../components/super-admin/HealthTab';

const StressTestTab = lazy(() => import('../components/super-admin/StressTestTab'));
const FinancingTab = lazy(() => import('../components/super-admin/FinancingTab'));

type TabId = 'overview' | 'tenants' | 'revenue' | 'health' | 'financing' | 'stress-test';

export default function SuperAdminDashboard() {
  const { t } = useTranslation('superAdmin');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');
  const [stressTestEnabled, setStressTestEnabled] = useState(false);

  const BASE_TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: t('tabs.overview') },
    { id: 'tenants', label: t('tabs.tenants') },
    { id: 'revenue', label: t('tabs.revenue') },
    { id: 'health', label: t('tabs.health') },
    { id: 'financing', label: t('tabs.financing') },
  ];

  useEffect(() => {
    if (sessionStorage.getItem('admin_secret')) {
      verifySecret().then(ok => setAuthed(ok));
    }
    getFeatureFlags()
      .then(f => setStressTestEnabled(f.stressTest))
      .catch(() => {});
  }, []);

  if (!authed) {
    return <LoginGate onAuth={() => setAuthed(true)} />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_secret');
    setAuthed(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-teal-500" size={24} />
            <h1 className="text-xl font-black text-white tracking-tight">{t('dashboard.brandName')}</h1>
            <span className="text-neutral-500 text-sm font-medium">{t('dashboard.superAdmin')}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm transition-colors">
            <LogOut size={16} /> {t('dashboard.signOut')}
          </button>
        </div>
      </div>

      <div className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex gap-1 px-6">
          {[...BASE_TABS, ...(stressTestEnabled ? [{ id: 'stress-test' as TabId, label: t('tabs.stressTest') }] : [])].map(tb => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === tb.id
                  ? 'text-teal-400 border-teal-500'
                  : 'text-neutral-400 border-transparent hover:text-neutral-200'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'tenants' && <TenantsTab />}
        {tab === 'revenue' && <RevenueTab />}
        {tab === 'health' && <HealthTab />}
        {tab === 'financing' && <Suspense fallback={null}><FinancingTab /></Suspense>}
        {tab === 'stress-test' && stressTestEnabled && <Suspense fallback={null}><StressTestTab /></Suspense>}
      </div>
    </div>
  );
}
