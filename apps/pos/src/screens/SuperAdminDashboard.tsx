import React, { useState, useEffect } from 'react';
import { Shield, LogOut } from 'lucide-react';
import { verifySecret } from '../api/superAdmin';
import LoginGate from '../components/super-admin/LoginGate';
import OverviewTab from '../components/super-admin/OverviewTab';
import TenantsTab from '../components/super-admin/TenantsTab';
import RevenueTab from '../components/super-admin/RevenueTab';
import HealthTab from '../components/super-admin/HealthTab';
import StressTestTab from '../components/super-admin/StressTestTab';

type TabId = 'overview' | 'tenants' | 'revenue' | 'health' | 'stress-test';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'health', label: 'Health' },
  { id: 'stress-test', label: 'Stress Test' },
];

export default function SuperAdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabId>('overview');

  useEffect(() => {
    if (sessionStorage.getItem('admin_secret')) {
      verifySecret().then(ok => setAuthed(ok));
    }
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
            <h1 className="text-xl font-black text-white tracking-tight">Desktop Kitchen</h1>
            <span className="text-neutral-500 text-sm font-medium">Super Admin</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      <div className="bg-neutral-900/50 border-b border-neutral-800">
        <div className="max-w-7xl mx-auto flex gap-1 px-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? 'text-teal-400 border-teal-500'
                  : 'text-neutral-400 border-transparent hover:text-neutral-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'tenants' && <TenantsTab />}
        {tab === 'revenue' && <RevenueTab />}
        {tab === 'health' && <HealthTab />}
        {tab === 'stress-test' && <StressTestTab />}
      </div>
    </div>
  );
}
