import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOnboardingStatus } from '../api';
import { CheckCircle2, ChevronDown, ChevronUp, X, Rocket, PartyPopper, ArrowRight, FileSpreadsheet, Sparkles } from 'lucide-react';
import { invalidateMenuCache } from '../lib/menuCache';
import TemplatePickerModal from './menu/TemplatePickerModal';
import AIMenuBuilderModal from './menu/AIMenuBuilderModal';
import DeliverySetupModal from './delivery/DeliverySetupModal';
import AddStaffModal from './staff/AddStaffModal';

interface Step {
  key: string;
  label: string;
  description: string;
  route: string;
  done: boolean;
}

const STORAGE_KEY = 'setup_checklist_dismissed';
const CREATED_AT_KEY = 'setup_checklist_created';
const COLLAPSED_KEY = 'setup_checklist_collapsed';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const SETUP_NAV_KEY = 'setup_checklist_navigated';

const SetupChecklistBanner: React.FC = () => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    // Auto-expand if returning from an admin screen during onboarding
    if (sessionStorage.getItem(SETUP_NAV_KEY) === '1') {
      sessionStorage.removeItem(SETUP_NAV_KEY);
      localStorage.setItem(COLLAPSED_KEY, '0');
      return false;
    }
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  });
  const [celebrating, setCelebrating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [showDeliverySetup, setShowDeliverySetup] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      setDismissed(true);
      return;
    }

    let createdAt = localStorage.getItem(CREATED_AT_KEY);
    if (!createdAt) {
      createdAt = String(Date.now());
      localStorage.setItem(CREATED_AT_KEY, createdAt);
    }
    if (Date.now() - Number(createdAt) > SEVEN_DAYS_MS) {
      setDismissed(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const status = await getOnboardingStatus();
        if (cancelled) return;

        if (status.real_order_count >= 5) {
          setDismissed(true);
          return;
        }

        setSteps([
          { key: 'menu', label: 'Add your menu', description: 'Use a template or add items manually in Menu Management', route: '/admin/menu', done: status.has_menu_items },
          { key: 'staff', label: 'Add staff', description: 'Create PINs for your cashiers, bartenders, and kitchen staff', route: '/admin/employees', done: status.has_extra_staff || localStorage.getItem('staff_setup_skipped') === '1' },
          { key: 'branding', label: 'Customize branding', description: 'Set your restaurant colors and logo so the POS feels like yours', route: '/admin/branding', done: status.has_branding },
          { key: 'delivery', label: 'Set up delivery', description: 'Connect Uber Eats, Rappi, or DidiFood to track all orders in one place', route: '/admin/delivery', done: status.has_delivery || localStorage.getItem('delivery_setup_skipped') === '1' },
          { key: 'order', label: 'Take a test order', description: 'Ring up a quick order to see the full flow in action', route: '', done: status.real_order_count > 0 },
        ]);
      } catch {
        setDismissed(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Celebration: when all steps are done, show for 5s then auto-dismiss
  useEffect(() => {
    if (!steps) return;
    const allDone = steps.every(s => s.done);
    if (!allDone) return;

    setCelebrating(true);
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
      setDismissed(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [steps]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });
  }, []);

  const handleStepAction = useCallback((step: Step) => {
    if (step.done) return;
    if (step.key === 'order') {
      // Collapse the banner so the POS is revealed for test ordering
      setCollapsed(true);
      localStorage.setItem(COLLAPSED_KEY, '1');
      return;
    }
    if (step.key === 'staff') {
      setShowAddStaff(true);
      return;
    }
    if (step.key === 'delivery') {
      setShowDeliverySetup(true);
      return;
    }
    if (step.route) {
      sessionStorage.setItem(SETUP_NAV_KEY, '1');
      navigate(`${step.route}?from=setup`);
    }
  }, [navigate]);

  const handleSkipStep = useCallback((key: string) => {
    localStorage.setItem(`${key}_setup_skipped`, '1');
    setSteps(prev => prev ? prev.map(s =>
      s.key === key ? { ...s, done: true } : s
    ) : prev);
  }, []);

  if (dismissed || !steps) return null;

  const doneCount = steps.filter(s => s.done).length;
  const progress = (doneCount / steps.length) * 100;
  const nextStep = steps.find(s => !s.done);

  // Celebration state
  if (celebrating) {
    return (
      <div className="mx-4 mt-3 bg-neutral-900 border border-brand-600 rounded-xl px-5 py-4">
        <div className="flex items-center justify-center gap-3">
          <PartyPopper size={22} className="text-brand-400" />
          <span className="text-white text-base font-semibold">
            All set! You're ready to go.
          </span>
          <PartyPopper size={22} className="text-brand-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center gap-3 px-5 py-3 touch-manipulation"
      >
        <Rocket size={18} className="text-brand-400 flex-shrink-0" />
        <span className="text-white text-sm font-semibold flex-1 text-left">
          Get started — {doneCount}/{steps.length} complete
        </span>
        {collapsed ? (
          <ChevronDown size={16} className="text-neutral-400" />
        ) : (
          <ChevronUp size={16} className="text-neutral-400" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
          className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 touch-manipulation"
          aria-label="Dismiss checklist"
        >
          <X size={14} />
        </button>
      </button>

      {/* Progress bar — always visible */}
      <div className="px-5 pb-3">
        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step list — collapsible */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {steps.map((step, i) => {
            const isNext = step === nextStep;
            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  step.done
                    ? 'bg-neutral-800/40'
                    : isNext
                      ? 'bg-brand-950/50 border border-brand-800/60'
                      : 'bg-neutral-800/60'
                }`}
              >
                {/* Step indicator */}
                {step.done ? (
                  <CheckCircle2 size={22} className="text-brand-500 flex-shrink-0" />
                ) : (
                  <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isNext
                      ? 'bg-brand-600 text-white'
                      : 'bg-neutral-700 text-neutral-400'
                  }`}>
                    {i + 1}
                  </div>
                )}

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    step.done ? 'text-neutral-500 line-through' : 'text-white'
                  }`}>
                    {step.label}
                  </div>
                  {!step.done && (
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {step.description}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {!step.done && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {step.key === 'menu' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowAIBuilder(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors touch-manipulation bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                        >
                          <Sparkles size={12} /> AI Builder
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowTemplatePicker(true); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors touch-manipulation bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                        >
                          <FileSpreadsheet size={12} /> Template
                        </button>
                      </>
                    )}
                    {(step.key === 'delivery' || step.key === 'staff') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSkipStep(step.key); }}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors touch-manipulation text-neutral-400 hover:text-neutral-200"
                      >
                        Skip
                      </button>
                    )}
                    <button
                      onClick={() => handleStepAction(step)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors touch-manipulation ${
                        isNext
                          ? 'bg-brand-600 hover:bg-brand-500 text-white'
                          : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
                      }`}
                    >
                      Go <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onTemplateApplied={async () => {
          invalidateMenuCache();
          // Re-fetch onboarding status to update checklist
          try {
            const status = await getOnboardingStatus();
            setSteps(prev => prev ? prev.map(s =>
              s.key === 'menu' ? { ...s, done: status.has_menu_items } : s
            ) : prev);
          } catch {}
        }}
      />

      <AIMenuBuilderModal
        isOpen={showAIBuilder}
        onClose={() => setShowAIBuilder(false)}
        onMenuCreated={async () => {
          invalidateMenuCache();
          try {
            const status = await getOnboardingStatus();
            setSteps(prev => prev ? prev.map(s =>
              s.key === 'menu' ? { ...s, done: status.has_menu_items } : s
            ) : prev);
          } catch {}
        }}
      />

      <AddStaffModal
        isOpen={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        onStaffAdded={async () => {
          try {
            const status = await getOnboardingStatus();
            setSteps(prev => prev ? prev.map(s =>
              s.key === 'staff' ? { ...s, done: status.has_extra_staff } : s
            ) : prev);
          } catch {}
        }}
      />

      <DeliverySetupModal
        isOpen={showDeliverySetup}
        onClose={() => setShowDeliverySetup(false)}
        onDeliverySetup={async () => {
          try {
            const status = await getOnboardingStatus();
            setSteps(prev => prev ? prev.map(s =>
              s.key === 'delivery' ? { ...s, done: status.has_delivery } : s
            ) : prev);
          } catch {}
        }}
      />
    </div>
  );
};

export default SetupChecklistBanner;
