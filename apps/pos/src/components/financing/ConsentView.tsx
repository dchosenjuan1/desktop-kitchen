import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, RefreshCw, Zap, ChevronRight, Lock, X } from 'lucide-react';
import { postFinancingConsent, getFinancingConsentTerms } from '../../api';

interface ConsentViewProps {
  onConsent: () => void;
}

const ConsentView: React.FC<ConsentViewProps> = ({ onConsent }) => {
  const { t, i18n } = useTranslation('financing');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsData, setTermsData] = useState<any>(null);
  const [termsLoading, setTermsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!agreed) return;
    setSubmitting(true);
    setError(null);
    try {
      await postFinancingConsent(['financial_data_analysis', 'financing_offers']);
      onConsent();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedSubmitConsent'));
    } finally {
      setSubmitting(false);
    }
  };

  const benefits = [
    { icon: ShieldCheck, title: t('consent.benefits.noCreditCheck'), desc: t('consent.benefits.noCreditCheckDesc'), color: 'text-green-400', bg: 'bg-green-600/10' },
    { icon: RefreshCw, title: t('consent.benefits.autoRepayment'), desc: t('consent.benefits.autoRepaymentDesc'), color: 'text-blue-400', bg: 'bg-blue-600/10' },
    { icon: Zap, title: t('consent.benefits.fastAccess'), desc: t('consent.benefits.fastAccessDesc'), color: 'text-amber-400', bg: 'bg-amber-600/10' },
  ];

  const steps = [
    t('consent.howItWorks.step1'),
    t('consent.howItWorks.step2'),
    t('consent.howItWorks.step3'),
    t('consent.howItWorks.step4'),
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-black text-white">{t('consent.headline')}</h2>
        <p className="text-neutral-400 text-lg">{t('consent.subheadline')}</p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {benefits.map((b) => (
          <div key={b.title} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
            <div className={`w-10 h-10 ${b.bg} rounded-lg flex items-center justify-center`}>
              <b.icon size={22} className={b.color} />
            </div>
            <h3 className="text-white font-semibold">{b.title}</h3>
            <p className="text-neutral-400 text-sm">{b.desc}</p>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h3 className="text-white font-bold text-lg mb-4">{t('consent.howItWorks.title')}</h3>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 bg-brand-600/20 text-brand-400 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <p className="text-neutral-300 text-sm">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Consent */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
        <h3 className="text-white font-bold text-lg">{t('consent.dataConsent.title')}</h3>
        <p className="text-neutral-400 text-sm">{t('consent.dataConsent.description')}</p>
        <button
          onClick={async () => {
            if (!termsData) {
              setTermsLoading(true);
              try {
                const locale = i18n.language?.startsWith('es') ? 'es' : 'en';
                const result = await getFinancingConsentTerms(locale);
                setTermsData(result.consent);
              } catch {}
              setTermsLoading(false);
            }
            setShowTerms(true);
          }}
          className="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center gap-1"
        >
          {t('consent.dataConsent.viewTerms')} <ChevronRight size={14} />
        </button>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-neutral-300 text-sm">{t('consent.dataConsent.checkbox')}</span>
        </label>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!agreed || submitting}
          className="w-full py-3 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t('consent.dataConsent.submitting') : t('consent.dataConsent.button')}
        </button>
      </div>

      {/* Trust Signal */}
      <div className="flex items-center justify-center gap-2 text-neutral-500 text-xs">
        <Lock size={12} />
        <span>{t('consent.trust')}</span>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowTerms(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">{t('consent.dataConsent.viewTerms')}</h3>
              <button onClick={() => setShowTerms(false)} className="text-neutral-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {termsLoading ? (
              <p className="text-neutral-400">{t('consent.terms.loading')}</p>
            ) : termsData ? (
              <div className="text-neutral-300 text-sm space-y-4">
                <h4 className="text-white font-semibold">{termsData.title}</h4>
                <p>{termsData.intro}</p>
                {termsData.sections?.map((s: any, i: number) => (
                  <div key={i}>
                    <p className="text-white font-medium">{s.heading}</p>
                    <p className="text-neutral-400">{s.body}</p>
                  </div>
                ))}
                {termsData.dataWeAnalyze && (
                  <div>
                    <p className="text-white font-medium">{termsData.dataWeAnalyze.heading}:</p>
                    <ul className="list-disc pl-5 text-neutral-400 space-y-1">
                      {termsData.dataWeAnalyze.items?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {termsData.dataWeDoNotAccess && (
                  <div>
                    <p className="text-white font-medium">{termsData.dataWeDoNotAccess.heading}:</p>
                    <ul className="list-disc pl-5 text-neutral-400 space-y-1">
                      {termsData.dataWeDoNotAccess.items?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {termsData.rights && (
                  <div>
                    <p className="text-white font-medium">{termsData.rights.heading}:</p>
                    <ul className="list-disc pl-5 text-neutral-400 space-y-1">
                      {termsData.rights.items?.map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                    {termsData.rights.retention && (
                      <p className="text-neutral-500 text-xs mt-2">{termsData.rights.retention}</p>
                    )}
                  </div>
                )}
                {termsData.transfer && (
                  <div>
                    <p className="text-white font-medium">{termsData.transfer.heading}:</p>
                    <p className="text-neutral-400">{termsData.transfer.body}</p>
                  </div>
                )}
                <p className="text-neutral-500 text-xs">{t('consent.terms.version', { version: termsData.version })}</p>
              </div>
            ) : (
              <p className="text-neutral-400">{t('consent.terms.loadError')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentView;
