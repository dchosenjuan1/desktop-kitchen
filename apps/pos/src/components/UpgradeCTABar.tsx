import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { usePlan } from '../context/PlanContext';

const HIDDEN_ROUTES = ['/', '/onboarding', '/menu-board', '/order', '/super-admin', '/admin/account'];

const UpgradeCTABar: React.FC = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const { plan } = usePlan();

  if (plan !== 'free') return null;
  if (HIDDEN_ROUTES.includes(location.pathname)) return null;
  if (location.pathname.startsWith('/invoice/')) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-neutral-900/95 backdrop-blur border-t border-neutral-700/50">
      <div className="flex items-center justify-center gap-4 px-6 py-3">
        <Sparkles size={16} className="text-brand-400 flex-shrink-0" />
        <span className="text-neutral-200 text-sm font-medium" dangerouslySetInnerHTML={{ __html: t('upgrade.unlimitedAccess') }} />
        <button
          onClick={() => navigate('/admin/account')}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white transition-colors flex-shrink-0"
        >
          {t('upgrade.ctaShort')} <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default UpgradeCTABar;
