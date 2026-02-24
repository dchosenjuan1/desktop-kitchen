export const PLAN_LIMITS = {
  trial: {
    menuItems: 10,
    inventoryItems: 12,
    employees: 3,
    modifierGroups: 2,
    combos: 1,
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
  },
  starter: {
    menuItems: Infinity,
    inventoryItems: Infinity,
    employees: Infinity,
    modifierGroups: 15,
    combos: 10,
    reports: { editVariables: true },
    ai: { mode: 'locked', monthlyAnalyses: 0 },
    printers: { functional: true },
    delivery: { functional: true },
    permissions: { locked: false },
    loyalty: { locked: false },
    branding: { canRename: true },
    prepForecast: { locked: false },
    menuBoard: { canRenameBrands: true },
    dynamicPricing: { aiSuggestions: false, scheduledRules: false, priceHistory: false, guardrails: false, abTesting: false, deliveryIntegration: false },
  },
  pro: {
    menuItems: Infinity,
    inventoryItems: Infinity,
    employees: Infinity,
    modifierGroups: Infinity,
    combos: Infinity,
    reports: { editVariables: true },
    ai: { mode: 'full', monthlyAnalyses: 100 },
    printers: { functional: true },
    delivery: { functional: true },
    permissions: { locked: false },
    loyalty: { locked: false },
    branding: { canRename: true },
    prepForecast: { locked: false },
    menuBoard: { canRenameBrands: true },
    dynamicPricing: { aiSuggestions: true, scheduledRules: true, priceHistory: true, guardrails: true, abTesting: false, deliveryIntegration: false },
  },
  ghost_kitchen: {
    menuItems: Infinity,
    inventoryItems: Infinity,
    employees: Infinity,
    modifierGroups: Infinity,
    combos: Infinity,
    reports: { editVariables: true },
    ai: { mode: 'full', monthlyAnalyses: Infinity },
    printers: { functional: true },
    delivery: { functional: true },
    permissions: { locked: false },
    loyalty: { locked: false },
    branding: { canRename: true },
    prepForecast: { locked: false },
    menuBoard: { canRenameBrands: true },
    dynamicPricing: { aiSuggestions: true, scheduledRules: true, priceHistory: true, guardrails: true, abTesting: true, deliveryIntegration: true },
  },
};

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.trial;
}

export function checkLimit(plan, resource, currentCount) {
  const max = getPlanLimits(plan)[resource];
  if (typeof max !== 'number') return { allowed: true };
  return currentCount >= max
    ? { allowed: false, limit: max, current: currentCount, plan }
    : { allowed: true, limit: max, current: currentCount };
}
