import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type PlanTier = 'trial' | 'starter' | 'pro' | 'ghost_kitchen';

export interface PlanLimits {
  menuItems: number;
  inventoryItems: number;
  employees: number;
  modifierGroups: number;
  combos: number;
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
}

interface PlanContextType {
  plan: PlanTier;
  limits: PlanLimits;
  ownerEmail: string | null;
  isPaid: boolean;
  isAtLimit: (resource: 'menuItems' | 'inventoryItems' | 'employees' | 'modifierGroups' | 'combos', currentCount: number) => boolean;
  isFeatureLocked: (feature: 'printers' | 'delivery' | 'permissions' | 'loyalty' | 'prepForecast') => boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_LIMITS: PlanLimits = {
  menuItems: 10, inventoryItems: 12, employees: 3,
  modifierGroups: 2, combos: 1,
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
};

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export const PlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<PlanTier>('trial');
  const [limits, setLimits] = useState<PlanLimits>(DEFAULT_LIMITS);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const tenantId = localStorage.getItem('tenant_id');
      const headers: Record<string, string> = {};
      if (tenantId) headers['X-Tenant-ID'] = tenantId;
      const res = await fetch('/api/branding', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.plan) setPlan(data.plan);
        if (data.limits) setLimits(data.limits);
        if (data.ownerEmail !== undefined) setOwnerEmail(data.ownerEmail);
      }
    } catch {
      // Server unreachable — keep defaults
    }
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const isPaid = plan === 'starter' || plan === 'pro' || plan === 'ghost_kitchen';

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
    <PlanContext.Provider value={{ plan, limits, ownerEmail, isPaid, isAtLimit, isFeatureLocked, refresh: fetchPlan }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = (): PlanContextType => {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used within PlanProvider');
  return ctx;
};
