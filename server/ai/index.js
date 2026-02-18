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

let initialized = false;

/**
 * Initialize the AI engine:
 * - Seed default config values
 * - Register scheduled jobs
 * - Start the scheduler
 */
export function initAI() {
  if (initialized) return;

  console.log('[AI] Initializing AI intelligence layer...');

  // Seed default config if not present
  seedDefaults();

  // Register scheduled jobs
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
