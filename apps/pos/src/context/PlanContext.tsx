import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

export type PlanTier = 'trial' | 'starter' | 'pro' | 'ghost_kitchen';

export interface PlanLimits {
  menuItems: number;
  inventoryItems: number;
  employees: number;
  modifierGroups: number;
  combos: number;
  maxBankConnections: number;
  reports: { editVariables: boolean };
  ai: { mode: 'mock' | 'locked' | 'full'; monthlyAnalyses: number };
  printers: { functional: boolean };
  delivery: { functional: boolean };
  permissions: { locked: boolean };
  loyalty: { locked: boolean };
  branding: { canRename: boolean };
  prepForecast: { locked: boolean };
  menuBoard: { canRenameBrands: boolean };
  dynamicPricing: { aiSuggestions: boolean; scheduledRules: boolean; priceHistory: boolean; guardrails: boolean; abTesting: boolean; deliveryIntegration: boolean };
  banking: { locked: boolean };
  bankReconciliation: { locked: boolean };
}

interface PlanContextType {
  plan: PlanTier;
  limits: PlanLimits;
  ownerEmail: string | null;
  mpUserId: string | null;
  mpDefaultTerminalId: string | null;
  isPaid: boolean;
  isMpConnected: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  isTrialExpired: boolean;
  isAtLimit: (resource: 'menuItems' | 'inventoryItems' | 'employees' | 'modifierGroups' | 'combos', currentCount: number) => boolean;
  isFeatureLocked: (feature: 'printers' | 'delivery' | 'permissions' | 'loyalty' | 'prepForecast' | 'banking' | 'bankReconciliation') => boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_LIMITS: PlanLimits = {
  menuItems: 10, inventoryItems: 12, employees: 3,
  modifierGroups: 2, combos: 1, maxBankConnections: 0,
  reports: { editVariables: false },
  ai: { mode: 'mock', monthlyAnalyses: 0 },
  printers: { functional: false },
  delivery: { functional: false },
  permissions: { locked: true },
  loyalty: { locked: true },
  branding: { canRename: false },
  prepForecast: { locked: true },
  menuBoard: { canRenameBrands: false },
  dynamicPricing: { aiSuggestions: false, scheduledRules: false, priceHistory: false, guardrails: false, abTesting: false, deliveryIntegration: false },
  banking: { locked: true },
  bankReconciliation: { locked: true },
};

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<PlanTier>('trial');
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [mpUserId, setMpUserId] = useState<string | null>(null);
  const [mpDefaultTerminalId, setMpDefaultTerminalId] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
      const tenantSlug = localStorage.getItem('tenant_id');
      const baseUrl = isCapacitor && tenantSlug
        ? `https://${tenantSlug}.desktop.kitchen/api`
        : '/api';
      const headers: Record<string, string> = {};
      if (!isCapacitor && tenantSlug) headers['X-Tenant-ID'] = tenantSlug;
      const res = await fetch(`${baseUrl}/branding`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.plan) setPlan(data.plan);
        if (data.limits) setLimits(data.limits);
        if (data.ownerEmail !== undefined) setOwnerEmail(data.ownerEmail);
        if (data.mpUserId !== undefined) setMpUserId(data.mpUserId);
        if (data.mpDefaultTerminalId !== undefined) setMpDefaultTerminalId(data.mpDefaultTerminalId);
        if (data.trialEndsAt !== undefined) setTrialEndsAt(data.trialEndsAt);
      }
    } catch {
      // Server unreachable — keep defaults
    }
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const isPaid = plan === 'starter' || plan === 'pro' || plan === 'ghost_kitchen';
  const isMpConnected = !!mpUserId && (plan === 'pro' || plan === 'ghost_kitchen');

  const trialDaysRemaining = useMemo(() => {
    if (!trialEndsAt) return null;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [trialEndsAt]);

  const isTrialExpired = plan === 'trial' && trialDaysRemaining !== null && trialDaysRemaining <= 0;

  const isAtLimit = useCallback((resource: string, currentCount: number) => {
    const max = (limits as unknown as Record<string, unknown>)[resource];
    if (typeof max !== 'number') return false;
    return currentCount >= max;
  }, [limits]);

  const isFeatureLocked = useCallback((feature: string) => {
    const cfg = (limits as unknown as Record<string, unknown>)[feature];
    if (cfg && typeof cfg === 'object' && 'locked' in (cfg as Record<string, boolean>)) {
      return (cfg as Record<string, boolean>).locked;
    }
    if (cfg && typeof cfg === 'object' && 'functional' in (cfg as Record<string, boolean>)) {
      return !(cfg as Record<string, boolean>).functional;
    }
    return false;
  }, [limits]);

  return (
    <PlanContext.Provider value={{ plan, limits, ownerEmail, mpUserId, mpDefaultTerminalId, isPaid, isMpConnected, trialEndsAt, trialDaysRemaining, isTrialExpired, isAtLimit, isFeatureLocked, refresh: fetchPlan }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = (): PlanContextType => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
};
