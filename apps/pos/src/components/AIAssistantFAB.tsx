import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Lock, ArrowUpCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AIAssistantModal from './AIAssistantModal';
import { usePlan } from '../context/PlanContext';
import { createCheckoutSession } from '../api';

interface Props {
  screenContext?: string;
}

export default function AIAssistantFAB({ screenContext }: Props) {
  const { t } = useTranslation('admin');
  const [open, setOpen] = useState(false);
  const [overrideContext, setOverrideContext] = useState<string | undefined>();
  const { plan } = usePlan();
  const isFree = plan !== 'pro';

  // Listen for programmatic open (e.g., from AIMenuBuilderModal link)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.context) setOverrideContext(detail.context);
      setOpen(true);
    };
    window.addEventListener('open-ai-assistant', handler);
    return () => window.removeEventListener('open-ai-assistant', handler);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setOverrideContext(undefined);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-lg shadow-violet-900/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        title={t('ai.assistant')}
      >
        <Sparkles size={24} />
      </button>
      {isFree ? (
        <AIUpgradeModal isOpen={open} onClose={handleClose} />
      ) : (
        <AIAssistantModal
          isOpen={open}
          onClose={handleClose}
          screenContext={overrideContext || screenContext}
        />
      )}
    </>
  );
}

function AIUpgradeModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { url } = await createCheckoutSession('pro');
      window.location.href = url;
    } catch {
      onClose();
      navigate('/admin/account');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-8 text-center space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-neutral-800 rounded-lg transition-colors">
          <X size={18} className="text-neutral-400" />
        </button>

        <div className="flex items-center justify-center w-16 h-16 bg-violet-600/10 rounded-full mx-auto">
          <Lock className="w-8 h-8 text-violet-400" />
        </div>

        <h3 className="text-xl font-bold text-white">{t('ai.proFeatureTitle')}</h3>
        <p className="text-neutral-400 text-sm leading-relaxed">
          {t('ai.proFeatureDescription')}
        </p>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50"
        >
          <ArrowUpCircle className="w-5 h-5" />
          {loading ? t('ai.redirecting') : t('ai.upgradeToPro')}
        </button>
      </div>
    </div>
  );
}
