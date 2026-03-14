import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Banknote } from 'lucide-react';
import { usePlan } from '../context/PlanContext';
import UpgradePrompt from '../components/UpgradePrompt';
import ConsentView from '../components/financing/ConsentView';
import ProfileDashboard from '../components/financing/ProfileDashboard';
import { getFinancingConsent, getFinancingProfile, getFinancingOffers } from '../api';
import type { ConsentStatus, FinancialProfile, FinancingOffer } from '../types/financing';

export default function FinancingScreen() {
  const { t } = useTranslation('financing');
  const { plan } = usePlan();
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [offers, setOffers] = useState<FinancingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const consentData = await getFinancingConsent();
      setConsent(consentData);

      if (consentData.has_consent) {
        const [profileData, offersData] = await Promise.all([
          getFinancingProfile(),
          getFinancingOffers(),
        ]);
        setProfile(profileData);
        setOffers(offersData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedLoad'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (plan === 'pro') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [plan, fetchData]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="bg-neutral-900 text-white p-6 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <Banknote size={28} className="text-green-500" />
          <h1 className="text-3xl font-black tracking-tighter">{t('nav.title')}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Free plan → UpgradePrompt */}
        {plan === 'free' && (
          <UpgradePrompt feature="Financing" message={t('upgrade.message')} />
        )}

        {/* Pro plan */}
        {plan === 'pro' && (
          <>
            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 animate-pulse">
                    <div className="h-32 bg-neutral-800 rounded" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {!loading && !error && consent && !consent.has_consent && (
              <ConsentView onConsent={fetchData} />
            )}

            {!loading && !error && consent?.has_consent && (
              <ProfileDashboard profile={profile} offers={offers} onRefresh={fetchData} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
