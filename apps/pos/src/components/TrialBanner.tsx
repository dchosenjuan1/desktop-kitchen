import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { usePlan } from '../context/PlanContext';

const DISMISSED_KEY = 'trial_banner_dismissed';

const TrialBanner: React.FC = () => {
  const navigate = useNavigate();
  const { plan, trialDaysRemaining, isTrialExpired } = usePlan();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === '1');

  if (plan !== 'trial' || trialDaysRemaining === null) return null;

  // Expired: always show, non-dismissible
  if (isTrialExpired) {
    return (
      <div className="mx-4 mt-3 bg-red-950/80 border border-red-700 rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <span className="text-red-100 text-sm font-semibold flex-1">
            Your free trial has ended — upgrade to continue using Desktop Kitchen
          </span>
          <button
            onClick={() => navigate('/admin/account')}
            className="flex items-center gap-1 px-4 py-1.5 rounded-md text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex-shrink-0"
          >
            Upgrade now <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  // 1-2 days: urgent, non-dismissible
  if (trialDaysRemaining <= 2) {
    return (
      <div className="mx-4 mt-3 bg-red-950/60 border border-red-800/60 rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <span className="text-red-100 text-sm font-semibold flex-1">
            {trialDaysRemaining === 1 ? '1 day' : `${trialDaysRemaining} days`} left in your free trial
          </span>
          <button
            onClick={() => navigate('/admin/account')}
            className="flex items-center gap-1 px-4 py-1.5 rounded-md text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors flex-shrink-0"
          >
            Upgrade now <ArrowRight size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Dismissed (only for > 2 days states)
  if (dismissed) return null;

  // 3-7 days: warning
  if (trialDaysRemaining <= 7) {
    return (
      <div className="mx-4 mt-3 bg-amber-950/60 border border-amber-800/60 rounded-xl px-5 py-3">
        <div className="flex items-center gap-3">
          <Clock size={18} className="text-amber-400 flex-shrink-0" />
          <span className="text-amber-100 text-sm font-semibold flex-1">
            {trialDaysRemaining} days left in your free trial — upgrade now
          </span>
          <button
            onClick={() => navigate('/admin/account')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors flex-shrink-0"
          >
            Upgrade <ArrowRight size={12} />
          </button>
          <button
            onClick={() => { sessionStorage.setItem(DISMISSED_KEY, '1'); setDismissed(true); }}
            className="text-amber-600 hover:text-amber-400 transition-colors p-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // > 7 days: subtle info, dismissible
  return (
    <div className="mx-4 mt-3 bg-brand-950/40 border border-brand-800/40 rounded-xl px-5 py-3">
      <div className="flex items-center gap-3">
        <Clock size={18} className="text-brand-400 flex-shrink-0" />
        <span className="text-brand-200 text-sm font-medium flex-1">
          {trialDaysRemaining} days left in your free trial
        </span>
        <button
          onClick={() => navigate('/admin/account')}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-brand-700 hover:bg-brand-600 text-white transition-colors flex-shrink-0"
        >
          Upgrade <ArrowRight size={12} />
        </button>
        <button
          onClick={() => { sessionStorage.setItem(DISMISSED_KEY, '1'); setDismissed(true); }}
          className="text-brand-600 hover:text-brand-400 transition-colors p-1 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TrialBanner;
