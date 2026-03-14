import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Trash2,
} from 'lucide-react';
import ScoreGauge from './ScoreGauge';
import { formatPrice } from '../../utils/currency';
import { acceptFinancingOffer, declineFinancingOffer, viewFinancingOffer, deleteFinancingConsent } from '../../api';
import type { FinancialProfile, FinancingOffer } from '../../types/financing';

interface ProfileDashboardProps {
  profile: FinancialProfile | null;
  offers: FinancingOffer[];
  onRefresh: () => void;
}

function formatLargeAmount(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const ELIGIBILITY_BADGE: Record<string, { labelKey: string; color: string; bg: string }> = {
  eligible: { labelKey: 'eligible', color: 'text-green-400', bg: 'bg-green-600/20' },
  pre_eligible: { labelKey: 'preEligible', color: 'text-blue-400', bg: 'bg-blue-600/20' },
  ineligible: { labelKey: 'ineligible', color: 'text-neutral-400', bg: 'bg-neutral-700/50' },
  new: { labelKey: 'new', color: 'text-amber-400', bg: 'bg-amber-600/20' },
};

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({ profile, offers, onRefresh }) => {
  const { t } = useTranslation('financing');
  const [confirmAccept, setConfirmAccept] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [acceptedOfferId, setAcceptedOfferId] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
        <Clock size={40} className="text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-300">{t('profile.calculating')}</p>
      </div>
    );
  }

  const badge = ELIGIBILITY_BADGE[profile.eligibility_status] || ELIGIBILITY_BADGE.new;
  const activeOffers = offers.filter((o) => o.status === 'available' || o.status === 'viewed');

  const handleAccept = async (offerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await acceptFinancingOffer(offerId);
      setConfirmAccept(null);
      setAcceptedOfferId(offerId);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('errors.failedAcceptOffer'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (offerId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await declineFinancingOffer(offerId, declineReason || undefined);
      setDeclineId(null);
      setDeclineReason('');
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('errors.failedDeclineOffer'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewOffer = async (offerId: string) => {
    try {
      await viewFinancingOffer(offerId);
    } catch {
      // non-critical
    }
  };

  const handleRevokeConsent = async () => {
    setActionLoading(true);
    try {
      await deleteFinancingConsent();
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('errors.failedRevokeConsent'));
    } finally {
      setActionLoading(false);
      setShowRevokeConfirm(false);
    }
  };

  const trendValue = Math.abs(Number(profile.revenue_trend));
  const trendUp = Number(profile.revenue_trend) >= 0;

  return (
    <div className="space-y-6">
      {/* Score + Eligibility */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{t('profile.title')}</h2>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${badge.color} ${badge.bg}`}>
            {t('eligibility.' + badge.labelKey)}
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <ScoreGauge score={profile.risk_score} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
            <div className="bg-neutral-800/50 rounded-lg p-4">
              <p className="text-neutral-400 text-xs font-medium mb-1">{t('profile.metrics.monthlyRevenue')}</p>
              <p className="text-xl font-bold text-white">{formatLargeAmount(profile.monthly_avg_revenue)}</p>
              {trendValue > 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
                  {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{trendUp ? t('profile.trend.up', { value: trendValue.toFixed(1) }) : t('profile.trend.down', { value: trendValue.toFixed(1) })}</span>
                </div>
              )}
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4">
              <p className="text-neutral-400 text-xs font-medium mb-1">{t('profile.metrics.dailyOrders')}</p>
              <p className="text-xl font-bold text-white">{Number(profile.avg_daily_orders).toFixed(0)}</p>
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4">
              <p className="text-neutral-400 text-xs font-medium mb-1">{t('profile.metrics.cardPayment')}</p>
              <p className="text-xl font-bold text-white">{Number(profile.card_payment_percent).toFixed(0)}%</p>
            </div>

            <div className="bg-neutral-800/50 rounded-lg p-4">
              <p className="text-neutral-400 text-xs font-medium mb-1">{t('profile.metrics.refundRate')}</p>
              <p className="text-xl font-bold text-white">{Number(profile.refund_rate).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <p className="text-neutral-500 text-xs mt-4">
          {t('profile.lastUpdated', { date: new Date(profile.last_calculated_at).toLocaleDateString() })}
        </p>
      </div>

      {/* Accepted Offer Confirmation */}
      {acceptedOfferId && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-6 text-center space-y-2">
          <CheckCircle size={36} className="text-green-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">{t('offer.accepted')}</h3>
          <p className="text-neutral-300 text-sm">{t('offer.acceptedMessage')}</p>
        </div>
      )}

      {/* Eligible: Show Offers */}
      {profile.eligibility_status === 'eligible' && activeOffers.length > 0 && !acceptedOfferId && (
        <div className="space-y-4">
          {activeOffers.map((offer) => {
            // Mark as viewed when rendered
            if (offer.status === 'available') handleViewOffer(offer.id);

            return (
              <div key={offer.id} className="bg-neutral-900 border border-green-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{t('offer.title')}</h3>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full text-green-400 bg-green-600/20">
                    {t('offer.available')}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-neutral-400 text-xs font-medium">{t('offer.amount')}</p>
                    <p className="text-2xl font-black text-green-400">{formatLargeAmount(offer.offer_amount)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs font-medium">{t('offer.totalRepayment')}</p>
                    <p className="text-xl font-bold text-white">{formatLargeAmount(offer.total_repayment)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs font-medium">{t('offer.holdback')}</p>
                    <p className="text-xl font-bold text-white">{offer.holdback_percent}%</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 text-xs font-medium">{t('offer.estimatedDuration')}</p>
                    <p className="text-xl font-bold text-white">{t('offer.days', { count: offer.estimated_duration_days })}</p>
                  </div>
                </div>

                <p className="text-neutral-500 text-xs mb-4">
                  {t('offer.expires', { date: new Date(offer.expires_at).toLocaleDateString() })}
                </p>

                {actionError && (
                  <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
                    <p className="text-red-300 text-sm">{actionError}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmAccept(offer.id)}
                    className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('offer.accept')}
                  </button>
                  <button
                    onClick={() => setDeclineId(offer.id)}
                    className="px-6 py-2.5 border border-neutral-600 text-neutral-300 font-medium rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    {t('offer.decline')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pre-Eligible */}
      {profile.eligibility_status === 'pre_eligible' && (
        <div className="bg-neutral-900 border border-blue-700/30 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">{t('preEligible.title')}</h3>
          <p className="text-neutral-400 text-sm">{t('preEligible.subtitle')}</p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-300">{t('preEligible.daysProgress')}</span>
                <span className="text-neutral-400">
                  {t('preEligible.daysOf', { current: profile.days_operating, required: profile.days_required })}
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (profile.days_operating / profile.days_required) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-300">{t('preEligible.revenueProgress')}</span>
                <span className="text-neutral-400">
                  {t('preEligible.revenueOf', {
                    current: formatLargeAmount(profile.monthly_avg_revenue),
                    required: formatLargeAmount(profile.revenue_required),
                  })}
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (profile.monthly_avg_revenue / profile.revenue_required) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-800/50 rounded-lg p-4">
            <h4 className="text-white font-semibold text-sm mb-2">{t('preEligible.tips.title')}</h4>
            <ul className="space-y-1.5 text-neutral-400 text-sm">
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">-</span> {t('preEligible.tips.tip1')}</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">-</span> {t('preEligible.tips.tip2')}</li>
              <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">-</span> {t('preEligible.tips.tip3')}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Ineligible */}
      {profile.eligibility_status === 'ineligible' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white">{t('ineligible.title')}</h3>
          <p className="text-neutral-400 text-sm">{t('ineligible.subtitle')}</p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-300">{t('preEligible.daysProgress')}</span>
                <span className="text-neutral-400">
                  {t('preEligible.daysOf', { current: profile.days_operating, required: profile.days_required })}
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (profile.days_operating / profile.days_required) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-300">{t('preEligible.revenueProgress')}</span>
                <span className="text-neutral-400">
                  {t('preEligible.revenueOf', {
                    current: formatLargeAmount(profile.monthly_avg_revenue),
                    required: formatLargeAmount(profile.revenue_required),
                  })}
                </span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (profile.monthly_avg_revenue / profile.revenue_required) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-neutral-800/50 rounded-lg p-4">
            <h4 className="text-white font-semibold text-sm mb-2">{t('ineligible.tips.title')}</h4>
            <ul className="space-y-1.5 text-neutral-400 text-sm">
              <li className="flex items-start gap-2"><span className="text-neutral-500 mt-0.5">-</span> {t('ineligible.tips.tip1')}</li>
              <li className="flex items-start gap-2"><span className="text-neutral-500 mt-0.5">-</span> {t('ineligible.tips.tip2')}</li>
              <li className="flex items-start gap-2"><span className="text-neutral-500 mt-0.5">-</span> {t('ineligible.tips.tip3')}</li>
              <li className="flex items-start gap-2"><span className="text-neutral-500 mt-0.5">-</span> {t('ineligible.tips.tip4')}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Revoke Consent */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowRevokeConfirm(true)}
          className="flex items-center gap-1.5 text-neutral-500 hover:text-red-400 text-sm transition-colors"
        >
          <Trash2 size={14} />
          {t('profile.revokeConsent')}
        </button>
      </div>

      {/* Accept Confirmation Modal */}
      {confirmAccept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setConfirmAccept(null)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">{t('offer.confirmTitle')}</h3>
              <button onClick={() => setConfirmAccept(null)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {(() => {
              const offer = activeOffers.find((o) => o.id === confirmAccept);
              if (!offer) return null;
              return (
                <p className="text-neutral-300 text-sm">
                  {t('offer.confirmMessage', {
                    total: formatLargeAmount(offer.total_repayment),
                    percent: offer.holdback_percent,
                  })}
                </p>
              );
            })()}
            <div className="flex gap-3">
              <button
                onClick={() => handleAccept(confirmAccept)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? t('offer.accepting') : t('offer.confirmButton')}
              </button>
              <button
                onClick={() => setConfirmAccept(null)}
                className="px-6 py-2.5 border border-neutral-600 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                {t('offer.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {declineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => { setDeclineId(null); setDeclineReason(''); }}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">{t('offer.decline')}</h3>
              <button onClick={() => { setDeclineId(null); setDeclineReason(''); }} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={t('offer.declineReason')}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-sm text-white placeholder-neutral-500 resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleDecline(declineId)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? t('offer.accepting') : t('offer.decline')}
              </button>
              <button
                onClick={() => { setDeclineId(null); setDeclineReason(''); }}
                className="px-6 py-2.5 border border-neutral-600 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                {t('offer.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Consent Confirmation */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowRevokeConfirm(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-md w-full mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">{t('profile.revokeConsent')}</h3>
            <p className="text-neutral-300 text-sm">{t('profile.revokeConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRevokeConsent}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? '...' : t('profile.revokeConsent')}
              </button>
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="px-6 py-2.5 border border-neutral-600 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                {t('offer.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDashboard;
