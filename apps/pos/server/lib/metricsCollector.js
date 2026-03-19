/**
 * Metrics collector — 24h in-memory ring buffer + periodic DB persistence.
 * Snapshots every 60s, persists every 5m, auto-cleans rows older than 90 days.
 */

import { getPoolMetrics, resetPeaks } from './poolMetrics.js';
import { getRequestMetricsSnapshot } from './requestMetrics.js';
import { adminSql } from '../db/index.js';

const SNAPSHOT_INTERVAL = 60_000;    // 60 seconds
const PERSIST_INTERVAL = 5 * 60_000; // 5 minutes
const BUFFER_SIZE = 1440;            // 24h of 60s snapshots
const RETENTION_DAYS = 90;

const ringBuffer = [];
let snapshotTimer = null;
let persistTimer = null;
let cleanupTimer = null;

/**
 * Take a snapshot of current metrics and add to ring buffer.
 */
function takeSnapshot() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    pool: getPoolMetrics(),
    requests: getRequestMetricsSnapshot(),
    memory: {
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1048576),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1048576),
      rssMb: Math.round(process.memoryUsage().rss / 1048576),
    },
  };

  ringBuffer.push(snapshot);
  if (ringBuffer.length > BUFFER_SIZE) {
    ringBuffer.shift();
  }

  // Reset peak counters after each snapshot
  resetPeaks();

  return snapshot;
}

/**
 * Persist recent snapshots to platform_metrics table via adminSql.
 */
async function persistMetrics() {
  if (ringBuffer.length === 0) return;

  try {
    // Persist last 5 minutes of snapshots (5 entries)
    const recentSnapshots = ringBuffer.slice(-5);
    for (const snap of recentSnapshots) {
      await adminSql`
        INSERT INTO platform_metrics (recorded_at, metric_type, metric_name, value, metadata)
        VALUES (
          ${snap.timestamp},
          'snapshot',
          'system_health',
          ${snap.requests.totalRequests},
          ${JSON.stringify(snap)}
        )
        ON CONFLICT DO NOTHING
      `.catch(() => {});
    }
  } catch (err) {
    console.error('[MetricsCollector] Persist failed:', err.message);
  }
}

/**
 * Delete metrics older than RETENTION_DAYS.
 */
async function cleanupOldMetrics() {
  try {
    await adminSql`
      DELETE FROM platform_metrics
      WHERE recorded_at < NOW() - MAKE_INTERVAL(days => ${RETENTION_DAYS})
    `;
  } catch (err) {
    console.error('[MetricsCollector] Cleanup failed:', err.message);
  }
}

/**
 * Start the metrics collector.
 */
export function startMetricsCollector() {
  console.log('[MetricsCollector] Starting (60s snapshots, 5m persistence, 90d retention)');

  // Immediate first snapshot
  takeSnapshot();

  snapshotTimer = setInterval(takeSnapshot, SNAPSHOT_INTERVAL);
  persistTimer = setInterval(persistMetrics, PERSIST_INTERVAL);
  cleanupTimer = setInterval(cleanupOldMetrics, 24 * 60 * 60_000); // Daily cleanup
}

/**
 * Stop the metrics collector.
 */
export function stopMetricsCollector() {
  if (snapshotTimer) clearInterval(snapshotTimer);
  if (persistTimer) clearInterval(persistTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);
  snapshotTimer = null;
  persistTimer = null;
  cleanupTimer = null;
  console.log('[MetricsCollector] Stopped');
}

/**
 * Get ring buffer contents for charting.
 * @param {number} minutes — how many minutes of history to return
 */
export function getMetricsHistory(minutes = 60) {
  const cutoff = Date.now() - minutes * 60_000;
  return ringBuffer.filter(s => new Date(s.timestamp).getTime() >= cutoff);
}
