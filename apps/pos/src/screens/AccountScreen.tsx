import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, User, BarChart3, CreditCard, Settings, Lock,
  Check, AlertCircle, Crown, Smartphone, Wifi, WifiOff, X, Loader2,
  Landmark, Shield,
} from 'lucide-react';
import { getAccount, updateAccount, changePassword, createCheckoutSession, createPortalSession, getMpTerminals, setMpDefaultTerminal as apiSetMpDefaultTerminal, validatePromoCode, getBankConnections, getBankAccounts, syncBankConnection, deleteBankConnection, type BankConnection, type BankAccount } from '../api';
import { usePlan } from '../context/PlanContext';
import BankConnectionCard from '../components/banking/BankConnectionCard';
import ConnectBankButton from '../components/banking/ConnectBankButton';
import SecurityInfoModal from '../components/banking/SecurityInfoModal';

type PromoState = 'idle' | 'expanded' | 'loading' | 'valid' | 'invalid';

interface AccountData {
  id: string;
  name: string;
  email: string;
  plan: string;
  subscription_status: string | null;
  created_at: string;
  usage: {
    employees: { current: number; limit: number };
    menu_items: { current: number; limit: number };
  };
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    trial: 'bg-neutral-700/50 text-neutral-400',
    starter: 'bg-blue-600/20 text-blue-400',
    pro: 'bg-teal-600/20 text-teal-400',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase ${styles[plan] || styles.trial}`}>
      {plan}
    </span>
  );
}

function UsageBar({ label, current, limit }: { label: string; current: number; limit: number }) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#0d9488';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-neutral-400">{label}</span>
        <span className="text-white font-medium">
          {current} / {isUnlimited ? 'Unlimited' : limit}
        </span>
      </div>
      {isUnlimited ? (
        <div className="w-full bg-neutral-800 rounded-full h-2.5">
          <div className="h-2.5 rounded-full bg-teal-600/30 w-full" />
        </div>
      ) : (
        <div className="w-full bg-neutral-800 rounded-full h-2.5">
          <div
            className="h-2.5 rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
}

export default function AccountScreen() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Settings form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Billing
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');

  // Promo code
  const [promoState, setPromoState] = useState<PromoState>('idle');
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDescription, setPromoDescription] = useState('');
  const [promoError, setPromoError] = useState('');

  // Mercado Pago
  const [mpTerminals, setMpTerminals] = useState<Array<{ id: string; external_pos_id: string }>>([]);
  const [mpTerminalsLoading, setMpTerminalsLoading] = useState(false);
  const [mpDefaultTerminal, setMpDefaultTerminal] = useState<string>('');
  const [mpSaved, setMpSaved] = useState(false);

  // Banking
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  const { plan, limits } = usePlan();
  const isBankingPlan = plan === 'pro' || plan === 'ghost_kitchen';
  const maxBankConns = limits.maxBankConnections || 0;

  const hasOwnerToken = true; // Admin employees can now access via employee JWT

  // Check URL params for MP connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    if (params.get('mp') === 'connected') {
      // Remove param from URL
      window.location.hash = window.location.hash.split('?')[0];
    }
  }, []);

  const loadBankData = async () => {
    setBankLoading(true);
    try {
      const [conns, accts] = await Promise.all([
        getBankConnections(),
        getBankAccounts(),
      ]);
      setBankConnections(conns);
      setBankAccounts(accts);
    } catch {
      // silent — section just won't show data
    }
    setBankLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    getAccount()
      .then(data => {
        setAccount(data);
        setEditName(data.name);
        setEditEmail(data.email);
        // Load banking data for pro+ plans
        if (data.plan === 'pro' || data.plan === 'ghost_kitchen') {
          loadBankData();
        }
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load account');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const result = await updateAccount({
        name: editName !== account?.name ? editName : undefined,
        email: editEmail !== account?.email ? editEmail : undefined,
      });
      setAccount(prev => prev ? { ...prev, name: result.name, email: result.email } : prev);
      setSaveMsg('Saved successfully');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err: any) {
      setSaveMsg(err.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMsg({ type: 'success', text: 'Password updated successfully' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to change password' });
    }
    setPwSaving(false);
  };

  const handleValidatePromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoState('loading');
    setPromoError('');
    try {
      const result = await validatePromoCode(code);
      if (result.valid) {
        setPromoState('valid');
        setPromoCode(result.code || code);
        setPromoDescription(result.discount_description || 'Discount applied');
      } else {
        setPromoState('invalid');
        setPromoError(result.message || 'Invalid or expired code');
      }
    } catch {
      setPromoState('invalid');
      setPromoError('Error validating code');
    }
  };

  const handleRemovePromo = () => {
    setPromoState('idle');
    setPromoInput('');
    setPromoCode('');
    setPromoDescription('');
    setPromoError('');
  };

  const handleSubscribe = async (plan: 'starter' | 'pro') => {
    setBillingLoading(plan);
    try {
      const { url } = await createCheckoutSession(plan, promoCode || undefined, billingInterval);
      window.location.href = url;
    } catch {
      setBillingLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading('portal');
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setBillingLoading(null);
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
          <h1 className="text-3xl font-black tracking-tighter">Account</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 animate-pulse">
                <div className="h-24 bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
            <p className="text-red-300">{error}</p>
          </div>
        ) : account && (
          <>
            {/* Account Overview */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="text-brand-500" size={22} />
                <h2 className="text-lg font-bold text-white">Account Overview</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-neutral-500 text-xs uppercase tracking-wider">Restaurant</p>
                  <p className="text-white font-medium mt-0.5">{account.name}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs uppercase tracking-wider">Email</p>
                  <p className="text-white font-medium mt-0.5">{account.email}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs uppercase tracking-wider">Plan</p>
                  <div className="mt-1"><PlanBadge plan={account.plan} /></div>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs uppercase tracking-wider">Member Since</p>
                  <p className="text-white font-medium mt-0.5">
                    {new Date(account.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Summary */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="text-brand-500" size={22} />
                <h2 className="text-lg font-bold text-white">Usage Summary</h2>
              </div>
              <div className="space-y-4">
                <UsageBar
                  label="Employees"
                  current={account.usage.employees.current}
                  limit={account.usage.employees.limit}
                />
                <UsageBar
                  label="Menu Items"
                  current={account.usage.menu_items.current}
                  limit={account.usage.menu_items.limit}
                />
              </div>
            </div>

            {/* Billing */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="text-brand-500" size={22} />
                <h2 className="text-lg font-bold text-white">Billing</h2>
              </div>
              {account.plan === 'trial' ? (
                <div className="space-y-3">
                  <p className="text-neutral-400 text-sm">You are on the free trial. Upgrade to unlock more features.</p>

                  {/* Monthly/Annual toggle */}
                  <div className="inline-flex items-center bg-neutral-800 border border-neutral-700 rounded-lg p-0.5">
                    <button
                      onClick={() => setBillingInterval('monthly')}
                      className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        billingInterval === 'monthly'
                          ? 'bg-teal-600 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingInterval('annual')}
                      className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        billingInterval === 'annual'
                          ? 'bg-teal-600 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Annual
                      <span className="ml-1.5 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">3 mo free</span>
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSubscribe('starter')}
                      disabled={billingLoading !== null}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {billingLoading === 'starter' ? 'Redirecting...' : billingInterval === 'annual'
                        ? 'Starter — $21.75/mo ($261/yr)'
                        : 'Starter — $29/mo'}
                    </button>
                    <button
                      onClick={() => handleSubscribe('pro')}
                      disabled={billingLoading !== null}
                      className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {billingLoading === 'pro' ? 'Redirecting...' : billingInterval === 'annual'
                        ? 'Pro — $59.25/mo ($711/yr)'
                        : 'Pro — $79/mo'}
                    </button>
                  </div>

                  {/* Promo Code */}
                  <div className="pt-2">
                    {promoState === 'idle' && (
                      <button
                        type="button"
                        onClick={() => setPromoState('expanded')}
                        className="text-sm text-teal-500 hover:text-teal-400 transition-colors"
                      >
                        ¿Tienes un código de descuento?
                      </button>
                    )}

                    {(promoState === 'expanded' || promoState === 'loading' || promoState === 'invalid') && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={promoInput}
                            onChange={e => {
                              setPromoInput(e.target.value.toUpperCase());
                              if (promoState === 'invalid') {
                                setPromoState('expanded');
                                setPromoError('');
                              }
                            }}
                            placeholder="Ingresa tu código"
                            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-teal-600"
                            disabled={promoState === 'loading'}
                            onKeyDown={e => { if (e.key === 'Enter') handleValidatePromo(); }}
                          />
                          <button
                            type="button"
                            onClick={handleValidatePromo}
                            disabled={promoState === 'loading' || !promoInput.trim()}
                            className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                          >
                            {promoState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePromo}
                            className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        {promoState === 'invalid' && promoError && (
                          <p className="text-red-400 text-sm">{promoError}</p>
                        )}
                      </div>
                    )}

                    {promoState === 'valid' && (
                      <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-green-400 font-semibold text-sm">{promoCode}</span>
                        <span className="text-neutral-400 text-sm mx-1">&mdash;</span>
                        <span className="text-green-300 text-sm flex-1">{promoDescription}</span>
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-neutral-400 text-sm">Current plan</p>
                    <p className="text-white font-bold capitalize flex items-center gap-2">
                      <Crown size={16} className="text-teal-500" />
                      {account.plan} — {account.plan === 'starter' ? '$29' : '$79'}/mo
                    </p>
                  </div>
                  <div className="flex gap-3 ml-auto">
                    {account.plan === 'starter' && (
                      <button
                        onClick={() => handleSubscribe('pro')}
                        disabled={billingLoading !== null}
                        className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                        {billingLoading === 'pro' ? 'Redirecting...' : 'Upgrade to Pro'}
                      </button>
                    )}
                    <button
                      onClick={handleManageBilling}
                      disabled={billingLoading !== null}
                      className="px-4 py-2 border border-neutral-600 text-neutral-200 text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      {billingLoading === 'portal' ? 'Redirecting...' : 'Manage Subscription'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="text-brand-500" size={22} />
                <h2 className="text-lg font-bold text-white">Settings</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-neutral-400 text-sm mb-1">Restaurant Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-sm mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || (editName === account.name && editEmail === account.email)}
                    className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  {saveMsg && (
                    <span className="text-sm text-teal-400 flex items-center gap-1">
                      <Check size={14} /> {saveMsg}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="text-brand-500" size={22} />
                <h2 className="text-lg font-bold text-white">Change Password</h2>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-neutral-400 text-sm mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-sm mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 text-sm mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-500"
                    required
                    minLength={8}
                  />
                </div>
                {pwMsg && (
                  <div className={`flex items-center gap-2 text-sm ${pwMsg.type === 'success' ? 'text-teal-400' : 'text-red-400'}`}>
                    {pwMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                    {pwMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                  className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {pwSaving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Mercado Pago Point — Pro+ only */}
            {(account.plan === 'pro' || account.plan === 'ghost_kitchen') && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Smartphone className="text-brand-500" size={22} />
                  <h2 className="text-lg font-bold text-white">Payments — Mercado Pago Point</h2>
                </div>

                {(() => {
                  // Detect connection from URL param or account data
                  // We check the mp endpoint for fresh data
                  const mpUserId = (account as any).mp_user_id;
                  const isConnected = !!mpUserId;

                  if (!isConnected) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-neutral-400">
                          <WifiOff size={16} />
                          <span className="text-sm">Not connected</span>
                        </div>
                        <p className="text-neutral-400 text-sm">
                          Connect your Mercado Pago Point terminal to charge directly from the POS without manual entry.
                        </p>
                        <a
                          href="/api/payments/mp/connect"
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#009ee3] text-white text-sm font-bold rounded-lg hover:bg-[#0082c0] transition-colors"
                        >
                          <Smartphone size={16} />
                          Connect Mercado Pago
                        </a>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Wifi size={16} className="text-green-400" />
                        <span className="text-sm font-semibold text-green-400">Connected</span>
                        <span className="text-xs text-neutral-500 ml-2">ID: {mpUserId}</span>
                      </div>

                      <div>
                        <label className="block text-neutral-400 text-sm mb-1.5">Default terminal</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={mpDefaultTerminal || (account as any).mp_default_terminal_id || ''}
                            onChange={async (e) => {
                              const termId = e.target.value;
                              setMpDefaultTerminal(termId);
                              try {
                                await apiSetMpDefaultTerminal(termId);
                                setMpSaved(true);
                                setTimeout(() => setMpSaved(false), 2000);
                              } catch {
                                // ignore
                              }
                            }}
                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
                          >
                            <option value="">Select terminal...</option>
                            {mpTerminals.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.external_pos_id || t.id}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={async () => {
                              setMpTerminalsLoading(true);
                              try {
                                const res = await getMpTerminals();
                                setMpTerminals(res.terminals);
                              } catch {
                                // ignore
                              }
                              setMpTerminalsLoading(false);
                            }}
                            disabled={mpTerminalsLoading}
                            className="px-3 py-2 bg-neutral-800 border border-neutral-700 text-neutral-300 text-sm rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
                          >
                            {mpTerminalsLoading ? '...' : 'Actualizar'}
                          </button>
                        </div>
                        {mpSaved && (
                          <p className="text-teal-400 text-xs mt-1 flex items-center gap-1">
                            <Check size={12} /> Guardado
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Bank Connections — Pro+ only */}
            {isBankingPlan && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Landmark className="text-green-500" size={22} />
                    <h2 className="text-lg font-bold text-white">Bank Connections</h2>
                  </div>
                  <button
                    onClick={() => setShowSecurityModal(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    <Shield size={14} />
                    Learn about bank security
                  </button>
                </div>

                {/* Connection Slots */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-neutral-400">
                    {bankConnections.filter(c => c.status !== 'disconnected').length} of {maxBankConns} connections used
                  </span>
                  <div className="flex-1 bg-neutral-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-green-500 transition-all"
                      style={{
                        width: `${Math.min(
                          (bankConnections.filter(c => c.status !== 'disconnected').length / Math.max(maxBankConns, 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Connected Banks */}
                {bankLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-20 bg-neutral-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : bankConnections.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {bankConnections.filter(c => c.status !== 'disconnected').map(conn => (
                      <BankConnectionCard
                        key={conn.id}
                        connection={conn}
                        accounts={bankAccounts}
                        onSync={async (id) => { await syncBankConnection(id); await loadBankData(); }}
                        onDisconnect={async (id) => { await deleteBankConnection(id); await loadBankData(); }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-sm mb-4">No bank accounts connected yet.</p>
                )}

                {/* Connect Button */}
                {bankConnections.filter(c => c.status !== 'disconnected').length < maxBankConns ? (
                  <ConnectBankButton onSuccess={loadBankData} />
                ) : (
                  <div className="relative group inline-block">
                    <button
                      disabled
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-800 text-neutral-500 font-semibold rounded-lg cursor-not-allowed"
                    >
                      Connect Bank
                    </button>
                    <div className="absolute bottom-full left-0 mb-2 px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Connection limit reached ({maxBankConns} max on {plan} plan)
                    </div>
                  </div>
                )}

                <SecurityInfoModal open={showSecurityModal} onClose={() => setShowSecurityModal(false)} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
