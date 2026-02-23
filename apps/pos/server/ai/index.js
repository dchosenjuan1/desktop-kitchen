import { seedDefaults } from './config.js';
import { refreshAllHeuristics } from './heuristics.js';
import { cleanExpiredCache } from './cache.js';
import {
  captureHourlySnapshot,
  updateItemPairs,
  updateInventoryVelocity,
  detectShrinkagePatterns,
} from './data-pipeline.js';
import { registerJob, startScheduler, stopScheduler, getSchedulerStatus } from './scheduler.js';
import { adminSql } from '../db/index.js';

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
      await adminSql`SELECT set_config('app.tenant_id', ${tenant.id}, false)`;
      await seedDefaults();
    }
    // Reset tenant context
    await adminSql`SELECT set_config('app.tenant_id', '', false)`;
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
