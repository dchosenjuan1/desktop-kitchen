import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { RefreshCw, ChevronDown, ChevronUp, Save, X, Activity } from 'lucide-react';
import {
  getFinancingOverview,
  getFinancingProfiles,
  getFinancingOffers as getAdminOffers,
  getFinancingEvents,
  getFinancingActivity,
  recalculateFinancingProfile,
  updateFinancingOffer,
} from '../../api/superAdmin';
import type {
  FinancingOverview,
  FinancingProfileWithTenant,
  FinancingOffer,
  FinancingEvent,
} from '../../types/financing';

const BUCKET_COLORS: Record<string, string> = {
  '0-20': '#ef4444',
  '21-40': '#f97316',
  '41-60': '#eab308',
  '61-80': '#22c55e',
  '81-100': '#10b981',
};

const STATUS_BADGE: Record<string, { color: string; bg: string }> = {
  available: { color: 'text-green-400', bg: 'bg-green-600/20' },
  viewed: { color: 'text-blue-400', bg: 'bg-blue-600/20' },
  accepted: { color: 'text-emerald-400', bg: 'bg-emerald-600/20' },
  declined: { color: 'text-red-400', bg: 'bg-red-600/20' },
  expired: { color: 'text-neutral-400', bg: 'bg-neutral-700/50' },
  withdrawn: { color: 'text-amber-400', bg: 'bg-amber-600/20' },
};

const ELIGIBILITY_BADGE: Record<string, { color: string; bg: string }> = {
  eligible: { color: 'text-green-400', bg: 'bg-green-600/20' },
  pre_eligible: { color: 'text-blue-400', bg: 'bg-blue-600/20' },
  ineligible: { color: 'text-neutral-400', bg: 'bg-neutral-700/50' },
  new: { color: 'text-amber-400', bg: 'bg-amber-600/20' },
};

function fmtAmt(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Section = 'profiles' | 'offers' | 'events';

export default function FinancingTab() {
  const { t } = useTranslation('superAdmin');
  const [overview, setOverview] = useState<FinancingOverview | null>(null);
  const [profiles, setProfiles] = useState<FinancingProfileWithTenant[]>([]);
  const [offers, setOffers] = useState<(FinancingOffer & { tenant_name?: string })[]>([]);
  const [events, setEvents] = useState<FinancingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [eligibilityFilter, setEligibilityFilter] = useState('');
  const [offerFilter, setOfferFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');

  // Expanded rows
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);

  // Edit offer
  const [editOffer, setEditOffer] = useState<{ id: string; amount: string; holdback: string; notes: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Recalculate loading
  const [recalcTenantId, setRecalcTenantId] = useState<string | null>(null);

  // Activity feed
  const [activity, setActivity] = useState<FinancingEvent[]>([]);
  const [activityFilter, setActivityFilter] = useState('');
  const lastActivityTs = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [openSection, setOpenSection] = useState<Section>('profiles');

  const fetchActivity = useCallback(async () => {
    try {
      const result = await getFinancingActivity({
        event_type: activityFilter || undefined,
        since: lastActivityTs.current || undefined,
      });
      const newEvents = result.events || [];
      if (newEvents.length > 0) {
        setActivity(prev => {
          const merged = [...newEvents, ...prev].slice(0, 50);
          lastActivityTs.current = merged[0]?.created_at || null;
          return merged;
        });
      }
    } catch {}
  }, [activityFilter]);

  // Poll activity every 30 seconds + on tab focus
  useEffect(() => {
    fetchActivity();
    pollRef.current = setInterval(fetchActivity, 30000);
    const onFocus = () => fetchActivity();
    window.addEventListener('focus', onFocus);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchActivity]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ov, pr, of, ev] = await Promise.all([
        getFinancingOverview(),
        getFinancingProfiles({ eligibility: eligibilityFilter || undefined }),
        getAdminOffers({ status: offerFilter || undefined }),
        getFinancingEvents({ event_type: eventTypeFilter || undefined, limit: 50 }),
      ]);
      // Backend wraps lists in objects: { profiles: [...], total }, etc.
      // Overview returns score_distribution as object { '0-20': N, ... } — convert to array
      const rawDist = (ov as any).score_distribution || {};
      const distArray = Array.isArray(rawDist)
        ? rawDist
        : Object.entries(rawDist).map(([bucket, count]) => ({ bucket, count: count as number }));
      setOverview({
        total_consented: (ov as any).total_consented_merchants ?? (ov as any).total_consented ?? 0,
        total_eligible: (ov as any).total_eligible ?? 0,
        total_pre_eligible: (ov as any).total_pre_eligible ?? 0,
        total_ineligible: (ov as any).total_ineligible ?? 0,
        active_offers: (ov as any).active_offers ?? (ov as any).total_offers_generated ?? 0,
        total_capital_offered: (ov as any).total_capital_offered ?? 0,
        total_capital_accepted: (ov as any).total_capital_accepted ?? 0,
        acceptance_rate: ((ov as any).acceptance_rate ?? 0) * 100,
        score_distribution: distArray,
      });
      setProfiles(Array.isArray(pr) ? pr : (pr as any).profiles ?? []);
      setOffers(Array.isArray(of) ? of : (of as any).offers ?? []);
      setEvents(Array.isArray(ev) ? ev : (ev as any).events ?? []);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [eligibilityFilter, offerFilter, eventTypeFilter]);

  const handleRecalculate = async (tenantId: string) => {
    setRecalcTenantId(tenantId);
    try {
      await recalculateFinancingProfile(tenantId);
      await fetchAll();
    } catch {
      // silent
    } finally {
      setRecalcTenantId(null);
    }
  };

  const handleSaveOffer = async () => {
    if (!editOffer) return;
    setEditSaving(true);
    try {
      await updateFinancingOffer(editOffer.id, {
        offer_amount: Number(editOffer.amount),
        holdback_percent: Number(editOffer.holdback),
        notes: editOffer.notes || undefined,
      });
      setEditOffer(null);
      await fetchAll();
    } catch {
      // silent
    } finally {
      setEditSaving(false);
    }
  };

  const handleWithdrawOffer = async (offerId: string) => {
    try {
      await updateFinancingOffer(offerId, { status: 'withdrawn' });
      await fetchAll();
    } catch {
      // silent
    }
  };

  if (loading && !overview) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 animate-pulse">
            <div className="h-20 bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: t('financing.kpi.consented'), value: overview.total_consented, color: 'text-white' },
            { label: t('financing.kpi.eligible'), value: overview.total_eligible, color: 'text-green-400' },
            { label: t('financing.kpi.preEligible'), value: overview.total_pre_eligible, color: 'text-blue-400' },
            { label: t('financing.kpi.activeOffers'), value: overview.active_offers, color: 'text-amber-400' },
            { label: t('financing.kpi.capitalOffered'), value: fmtAmt(overview.total_capital_offered), color: 'text-white' },
            { label: t('financing.kpi.capitalAccepted'), value: fmtAmt(overview.total_capital_accepted), color: 'text-green-400' },
            { label: t('financing.kpi.acceptRate'), value: `${overview.acceptance_rate.toFixed(0)}%`, color: 'text-brand-400' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <p className="text-neutral-500 text-xs font-medium">{kpi.label}</p>
              <p className={`text-xl font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Score Distribution Chart */}
      {overview && overview.score_distribution.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h3 className="text-white font-bold mb-4">{t('financing.scoreDistribution')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overview.score_distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="bucket" tick={{ fill: '#999', fontSize: 12 }} />
              <YAxis tick={{ fill: '#999', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {overview.score_distribution.map((entry) => (
                  <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] || '#666'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-brand-400" />
            <h3 className="text-white font-bold">{t('financing.activityFeed')}</h3>
            <span className="text-neutral-500 text-xs">{t('financing.autoRefreshes')}</span>
          </div>
          <select
            value={activityFilter}
            onChange={(e) => { setActivityFilter(e.target.value); lastActivityTs.current = null; setActivity([]); }}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-300"
          >
            <option value="">{t('financing.allTypes')}</option>
            <option value="consent_granted">{t('financing.eventTypes.consent_granted')}</option>
            <option value="consent_revoked">{t('financing.eventTypes.consent_revoked')}</option>
            <option value="profile_calculated">{t('financing.eventTypes.profile_calculated')}</option>
            <option value="offer_generated">{t('financing.eventTypes.offer_generated')}</option>
            <option value="offer_viewed">{t('financing.eventTypes.offer_viewed')}</option>
            <option value="offer_accepted">{t('financing.eventTypes.offer_accepted')}</option>
            <option value="offer_declined">{t('financing.eventTypes.offer_declined')}</option>
            <option value="offer_expired">{t('financing.eventTypes.offer_expired')}</option>
            <option value="offer_withdrawn">{t('financing.eventTypes.offer_withdrawn')}</option>
            <option value="offer_modified">{t('financing.eventTypes.offer_modified')}</option>
            <option value="data_export_requested">{t('financing.eventTypes.data_export_requested')}</option>
          </select>
        </div>
        <div className="max-h-64 overflow-y-auto border-t border-neutral-800">
          {activity.length === 0 ? (
            <p className="px-4 py-6 text-center text-neutral-500 text-sm">{t('financing.noRecentActivity')}</p>
          ) : (
            <div className="divide-y divide-neutral-800/50">
              {activity.map((ev) => {
                const isPositive = ['consent_granted', 'offer_accepted'].includes(ev.event_type);
                const isNegative = ['consent_revoked', 'offer_declined', 'offer_withdrawn', 'offer_expired'].includes(ev.event_type);
                const dotColor = isPositive ? 'bg-green-400' : isNegative ? 'bg-red-400' : 'bg-amber-400';
                return (
                  <div key={ev.id} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-neutral-800/30">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-neutral-500 text-xs mr-2">
                        {new Date(ev.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-white font-medium">{ev.tenant_name || ev.tenant_id}</span>
                      <span className="text-neutral-400 mx-1">&mdash;</span>
                      <span className="text-neutral-300">{ev.event_type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setOpenSection(openSection === 'profiles' ? 'profiles' : 'profiles')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <h3 className="text-white font-bold">{t('financing.financialProfiles', { count: profiles.length })}</h3>
          <div className="flex items-center gap-3">
            <select
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-300"
            >
              <option value="">{t('financing.all')}</option>
              <option value="eligible">{t('financing.eligible')}</option>
              <option value="pre_eligible">{t('financing.preEligible')}</option>
              <option value="ineligible">{t('financing.ineligible')}</option>
            </select>
          </div>
        </button>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-neutral-800 text-neutral-500 text-xs uppercase">
                <th className="text-left px-4 py-2">{t('financing.profileColumns.restaurant')}</th>
                <th className="text-left px-4 py-2">{t('financing.profileColumns.plan')}</th>
                <th className="text-center px-4 py-2">{t('financing.profileColumns.score')}</th>
                <th className="text-right px-4 py-2">{t('financing.profileColumns.monthlyRevenue')}</th>
                <th className="text-center px-4 py-2">{t('financing.profileColumns.cardPercent')}</th>
                <th className="text-center px-4 py-2">{t('financing.profileColumns.eligibility')}</th>
                <th className="text-right px-4 py-2">{t('financing.profileColumns.lastCalculated')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const eb = ELIGIBILITY_BADGE[p.eligibility_status] || ELIGIBILITY_BADGE.new;
                return (
                  <React.Fragment key={p.tenant_id}>
                    <tr
                      className="border-t border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer"
                      onClick={() => setExpandedProfile(expandedProfile === p.tenant_id ? null : p.tenant_id)}
                    >
                      <td className="px-4 py-3 text-white font-medium">{p.tenant_name}</td>
                      <td className="px-4 py-3 text-neutral-400 capitalize">{p.tenant_plan || (p as any).plan || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-8 h-8 leading-8 text-xs font-bold rounded-full ${
                          p.risk_score >= 65 ? 'bg-green-600/20 text-green-400' :
                          p.risk_score >= 45 ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-red-600/20 text-red-400'
                        }`}>
                          {p.risk_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{fmtAmt(p.monthly_avg_revenue)}</td>
                      <td className="px-4 py-3 text-center text-neutral-300">{Number(p.card_payment_percent ?? (p as any).card_revenue_percent ?? 0).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${eb.color} ${eb.bg}`}>
                          {p.eligibility_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-500 text-xs">
                        {p.last_calculated_at ? fmtDate(p.last_calculated_at) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRecalculate(p.tenant_id); }}
                          disabled={recalcTenantId === p.tenant_id}
                          className="text-neutral-400 hover:text-brand-400 transition-colors disabled:opacity-50"
                          title={t('financing.recalculate')}
                        >
                          <RefreshCw size={14} className={recalcTenantId === p.tenant_id ? 'animate-spin' : ''} />
                        </button>
                      </td>
                    </tr>
                    {expandedProfile === p.tenant_id && (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 bg-neutral-800/20 border-t border-neutral-800/50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-neutral-500 text-xs">{t('financing.expandedProfile.avgDailyOrders')}</p>
                              <p className="text-white font-medium">{Number(p.avg_daily_orders).toFixed(0)}</p>
                            </div>
                            <div>
                              <p className="text-neutral-500 text-xs">{t('financing.expandedProfile.refundRate')}</p>
                              <p className="text-white font-medium">{Number(p.refund_rate).toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-neutral-500 text-xs">{t('financing.expandedProfile.revenueTrend')}</p>
                              <p className={`font-medium ${p.revenue_trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {Number(p.revenue_trend) >= 0 ? '+' : ''}{Number(p.revenue_trend).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-neutral-500 text-xs">{t('financing.expandedProfile.daysOperating')}</p>
                              <p className="text-white font-medium">{p.days_operating} / {p.days_required}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-neutral-500">
                    {t('financing.noProfilesFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-white font-bold">{t('financing.offers', { count: offers.length })}</h3>
          <select
            value={offerFilter}
            onChange={(e) => setOfferFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-300"
          >
            <option value="">{t('financing.offerFilters.all')}</option>
            <option value="available">{t('financing.offerFilters.available')}</option>
            <option value="accepted">{t('financing.offerFilters.accepted')}</option>
            <option value="declined">{t('financing.offerFilters.declined')}</option>
            <option value="expired">{t('financing.offerFilters.expired')}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-neutral-800 text-neutral-500 text-xs uppercase">
                <th className="text-left px-4 py-2">{t('financing.offerColumns.restaurant')}</th>
                <th className="text-right px-4 py-2">{t('financing.offerColumns.amount')}</th>
                <th className="text-center px-4 py-2">{t('financing.offerColumns.holdbackPercent')}</th>
                <th className="text-center px-4 py-2">{t('financing.offerColumns.status')}</th>
                <th className="text-right px-4 py-2">{t('financing.offerColumns.created')}</th>
                <th className="text-right px-4 py-2">{t('financing.offerColumns.expires')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const sb = STATUS_BADGE[o.status] || STATUS_BADGE.expired;
                return (
                  <React.Fragment key={o.id}>
                    <tr
                      className="border-t border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer"
                      onClick={() => setExpandedOffer(expandedOffer === o.id ? null : o.id)}
                    >
                      <td className="px-4 py-3 text-white font-medium">{o.tenant_name || o.tenant_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-right text-white font-bold">{fmtAmt(o.offer_amount)}</td>
                      <td className="px-4 py-3 text-center text-neutral-300">{o.holdback_percent}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${sb.color} ${sb.bg}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-500 text-xs">{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3 text-right text-neutral-500 text-xs">{fmtDate(o.expires_at)}</td>
                      <td className="px-4 py-3">
                        {expandedOffer === o.id ? <ChevronUp size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
                      </td>
                    </tr>
                    {expandedOffer === o.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-neutral-800/20 border-t border-neutral-800/50">
                          {editOffer?.id === o.id ? (
                            <div className="space-y-3 max-w-md">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-neutral-400 text-xs">{t('financing.editOffer.amount')}</label>
                                  <input
                                    type="number"
                                    value={editOffer.amount}
                                    onChange={(e) => setEditOffer({ ...editOffer, amount: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-neutral-400 text-xs">{t('financing.editOffer.holdback')}</label>
                                  <input
                                    type="number"
                                    value={editOffer.holdback}
                                    onChange={(e) => setEditOffer({ ...editOffer, holdback: e.target.value })}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-neutral-400 text-xs">{t('financing.editOffer.notes')}</label>
                                <textarea
                                  value={editOffer.notes}
                                  onChange={(e) => setEditOffer({ ...editOffer, notes: e.target.value })}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm resize-none"
                                  rows={2}
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveOffer}
                                  disabled={editSaving}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm rounded hover:bg-brand-700 disabled:opacity-50"
                                >
                                  <Save size={14} /> {editSaving ? '...' : t('financing.editOffer.save')}
                                </button>
                                <button
                                  onClick={() => setEditOffer(null)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-600 text-neutral-300 text-sm rounded hover:bg-neutral-800"
                                >
                                  <X size={14} /> {t('financing.editOffer.cancel')}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-neutral-500 text-xs">{t('financing.offerDetails.totalRepayment')}</p>
                                  <p className="text-white font-medium">{fmtAmt(o.total_repayment)}</p>
                                </div>
                                <div>
                                  <p className="text-neutral-500 text-xs">{t('financing.offerDetails.estDailyHoldback')}</p>
                                  <p className="text-white font-medium">{fmtAmt(o.estimated_daily_holdback)}</p>
                                </div>
                                <div>
                                  <p className="text-neutral-500 text-xs">{t('financing.offerDetails.estDuration')}</p>
                                  <p className="text-white font-medium">{t('financing.offerDetails.days', { count: o.estimated_duration_days })}</p>
                                </div>
                              </div>
                              {o.notes && (
                                <p className="text-neutral-400 text-sm">{t('financing.offerDetails.notes')} {o.notes}</p>
                              )}
                              {o.decline_reason && (
                                <p className="text-red-400 text-sm">{t('financing.offerDetails.declineReason')} {o.decline_reason}</p>
                              )}
                              <div className="flex gap-2">
                                {(o.status === 'available' || o.status === 'viewed') && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setEditOffer({ id: o.id, amount: String(o.offer_amount), holdback: String(o.holdback_percent), notes: o.notes || '' }); }}
                                      className="px-3 py-1.5 border border-neutral-600 text-neutral-300 text-xs rounded hover:bg-neutral-800"
                                    >
                                      {t('financing.edit')}
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleWithdrawOffer(o.id); }}
                                      className="px-3 py-1.5 border border-red-700 text-red-400 text-xs rounded hover:bg-red-900/20"
                                    >
                                      {t('financing.withdraw')}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {offers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    {t('financing.noOffersFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events Log */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-white font-bold">{t('financing.eventLog', { count: events.length })}</h3>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-300"
          >
            <option value="">{t('financing.allTypes')}</option>
            <option value="consent_granted">{t('financing.eventTypes.consent_granted')}</option>
            <option value="consent_revoked">{t('financing.eventTypes.consent_revoked')}</option>
            <option value="profile_calculated">{t('financing.eventTypes.profile_calculated')}</option>
            <option value="offer_created">{t('financing.eventTypes.offer_created')}</option>
            <option value="offer_viewed">{t('financing.eventTypes.offer_viewed')}</option>
            <option value="offer_accepted">{t('financing.eventTypes.offer_accepted')}</option>
            <option value="offer_declined">{t('financing.eventTypes.offer_declined')}</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-neutral-800 text-neutral-500 text-xs uppercase">
                <th className="text-left px-4 py-2">{t('financing.eventColumns.timestamp')}</th>
                <th className="text-left px-4 py-2">{t('financing.eventColumns.restaurant')}</th>
                <th className="text-left px-4 py-2">{t('financing.eventColumns.eventType')}</th>
                <th className="text-left px-4 py-2">{t('financing.eventColumns.details')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-t border-neutral-800/50">
                  <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">
                    {new Date(ev.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-white text-sm">{ev.tenant_name || ev.tenant_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-neutral-800 text-neutral-300">
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-xs max-w-xs truncate">
                    {JSON.stringify(ev.details)}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                    {t('financing.noEventsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
