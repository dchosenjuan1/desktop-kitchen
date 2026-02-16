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

function runJob(job) {
  try {
    job.fn();
    job.lastRun = new Date().toISOString();
    job.runCount++;
    job.lastError = null;
  } catch (error) {
    job.lastError = error.message;
    console.error(`[AI Scheduler] Job "${job.name}" failed:`, error.message);
  }
}
