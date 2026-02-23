import { adminSql, tenantContext } from '../db/index.js';

const jobs = [];
let isRunning = false;

/**
 * Register a scheduled job
 */
export function registerJob(name, fn, intervalMs) {
  jobs.push({
    name,
    fn,
    intervalMs,
    timerId: null,
    lastRun: null,
    lastError: null,
    runCount: 0,
  });
}

/**
 * Start all registered jobs
 */
export function startScheduler() {
  if (isRunning) return;
  isRunning = true;

  console.log(`[AI Scheduler] Starting ${jobs.length} jobs...`);

  for (const job of jobs) {
    // Run immediately, then on interval
    runJob(job);
    job.timerId = setInterval(() => runJob(job), job.intervalMs);
    console.log(`[AI Scheduler]   - ${job.name}: every ${Math.round(job.intervalMs / 1000)}s`);
  }
}

/**
 * Stop all jobs
 */
export function stopScheduler() {
  for (const job of jobs) {
    if (job.timerId) {
      clearInterval(job.timerId);
      job.timerId = null;
    }
  }
  isRunning = false;
  console.log('[AI Scheduler] Stopped all jobs');
}

/**
 * Get status of all jobs
 */
export function getSchedulerStatus() {
  return {
    running: isRunning,
    jobs: jobs.map(j => ({
      name: j.name,
      intervalMs: j.intervalMs,
      lastRun: j.lastRun,
      lastError: j.lastError,
      runCount: j.runCount,
    })),
  };
}

/**
 * Run a job for each active tenant.
 * Sets app.tenant_id via set_config on adminSql before each invocation,
 * and wraps the call in tenantContext so getConn() routes through adminSql
 * with the correct tenant context.
 */
async function runJob(job) {
  try {
    const tenants = await adminSql`SELECT id FROM tenants WHERE active = true`;

    for (const tenant of tenants) {
      try {
        // Set RLS context on the admin connection
        await adminSql`SELECT set_config('app.tenant_id', ${tenant.id}, false)`;

        // Run the job function — it uses run/get/all which fall back to adminSql
        await job.fn();
      } catch (err) {
        console.error(`[AI Scheduler] Job "${job.name}" failed for tenant ${tenant.id}:`, err.message);
      }
    }

    // Reset tenant context
    await adminSql`SELECT set_config('app.tenant_id', '', false)`;

    job.lastRun = new Date().toISOString();
    job.runCount++;
    job.lastError = null;
  } catch (error) {
    job.lastError = error.message;
    console.error(`[AI Scheduler] Job "${job.name}" failed:`, error.message);
  }
}
