import { seedDefaults } from './config.js';
import { refreshAllHeuristics } from './heuristics.js';
import { cleanExpiredCache } from './cache.js';
import {
  captureHourlySnapshot,
  updateItemPairs,
  updateInventoryVelocity,
  detectShrinkagePatterns,
} from './data-pipeline.js';
import { analyzeWastePatterns } from './suggestions/waste-patterns.js';
import { registerJob, startScheduler, stopScheduler, getSchedulerStatus } from './scheduler.js';
import { adminSql, tenantContext } from '../db/index.js';

let initialized = false;

/**
 * Initialize the AI engine:
 * - Seed default config values for each tenant
 * - Register scheduled jobs
 * - Start the scheduler
 */
export async function initAI() {
  if (initialized) return;

  console.log('[AI] Initializing AI intelligence layer...');

  // Seed default config per tenant (runs outside request context, needs explicit tenant_id)
  try {
    const tenants = await adminSql`SELECT id FROM tenants WHERE active = true`;
    for (const tenant of tenants) {
      try {
        await adminSql.begin(async (tx) => {
          await tx`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
          await new Promise((resolve, reject) => {
            tenantContext.run({ conn: tx }, async () => {
              try { await seedDefaults(); resolve(); }
              catch (e) { reject(e); }
            });
          });
        });
      } catch (err) {
        console.error(`[AI] Config seed failed for tenant ${tenant.id}:`, err.message);
      }
    }
  } catch (err) {
    // No tenants yet or table doesn't exist — skip seeding
    console.log('[AI] Skipping config seed (no tenants yet)');
  }

  // Register scheduled jobs (all are now async — scheduler handles await)
  registerJob('refreshSuggestionCache', refreshAllHeuristics, 5 * 60 * 1000);       // Every 5 min
  registerJob('captureHourlySnapshot', captureHourlySnapshot, 60 * 60 * 1000);       // Every hour
  registerJob('updateItemPairs', updateItemPairs, 60 * 60 * 1000);                   // Every hour
  registerJob('updateInventoryVelocity', updateInventoryVelocity, 24 * 60 * 60 * 1000); // Daily
  registerJob('cleanExpiredCache', cleanExpiredCache, 60 * 60 * 1000);                // Every hour
  registerJob('detectShrinkagePatterns', detectShrinkagePatterns, 24 * 60 * 60 * 1000); // Daily
  registerJob('analyzeWastePatterns', analyzeWastePatterns, 24 * 60 * 60 * 1000);     // Daily

  // Start the scheduler
  startScheduler();

  initialized = true;
  console.log('[AI] AI intelligence layer initialized successfully');
}

/**
 * Shut down the AI engine
 */
export function shutdownAI() {
  stopScheduler();
  initialized = false;
  console.log('[AI] AI intelligence layer shut down');
}

/**
 * Get AI engine status
 */
export function getAIStatus() {
  return {
    initialized,
    scheduler: getSchedulerStatus(),
  };
}
