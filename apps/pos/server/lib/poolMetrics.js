/**
 * Connection pool metrics — in-memory counters for tenant & admin pools.
 * Zero-allocation hot path (~1 microsecond per request).
 */

const pools = {
  tenant: createPoolCounters(),
  admin: createPoolCounters(),
};

function createPoolCounters() {
  return {
    active: 0,
    totalReserves: 0,
    successes: 0,
    failures: 0,
    totalWaitMs: 0,
    peakActive: 0,
  };
}

/**
 * Call before tenantSql.reserve() or adminSql query.
 * Returns a start timestamp for latency tracking.
 */
export function onReserveStart(pool = 'tenant') {
  const c = pools[pool];
  c.totalReserves++;
  return Date.now();
}

/**
 * Call after successful reserve/query.
 */
export function onReserveSuccess(startTs, pool = 'tenant') {
  const c = pools[pool];
  c.successes++;
  c.active++;
  c.totalWaitMs += Date.now() - startTs;
  if (c.active > c.peakActive) c.peakActive = c.active;
}

/**
 * Call on reserve/query failure.
 */
export function onReserveFailure(pool = 'tenant') {
  pools[pool].failures++;
}

/**
 * Call when a reserved connection is released.
 */
export function onRelease(pool = 'tenant') {
  const c = pools[pool];
  if (c.active > 0) c.active--;
}

/**
 * Get current metrics snapshot for both pools.
 */
export function getPoolMetrics() {
  const result = {};
  for (const [name, c] of Object.entries(pools)) {
    result[name] = {
      active: c.active,
      totalReserves: c.totalReserves,
      successes: c.successes,
      failures: c.failures,
      avgWaitMs: c.successes > 0 ? Math.round(c.totalWaitMs / c.successes) : 0,
      peakActive: c.peakActive,
    };
  }
  return result;
}

/**
 * Reset peak counters (called periodically by metricsCollector).
 */
export function resetPeaks() {
  for (const c of Object.values(pools)) {
    c.peakActive = c.active;
  }
}
