/**
 * Request throughput, error rates, and latency histogram.
 * Lightweight Express middleware + error handler augmentation.
 */

const state = {
  totalRequests: 0,
  totalErrors: 0,
  errorsByStatus: {},   // { 404: 12, 500: 3, ... }
  errorsByTenant: {},   // { 'acme': 5, ... }
  latencyBuckets: {
    '<50ms': 0,
    '50-200ms': 0,
    '200-500ms': 0,
    '500-1000ms': 0,
    '>1000ms': 0,
  },
  recentErrors: [],     // circular buffer, max 50
};

const MAX_RECENT_ERRORS = 50;

/**
 * Express middleware — register early in the stack.
 * Tracks request count and latency on response finish.
 */
export function requestMetricsMiddleware(req, res, next) {
  state.totalRequests++;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    // Latency histogram
    if (duration < 50) state.latencyBuckets['<50ms']++;
    else if (duration < 200) state.latencyBuckets['50-200ms']++;
    else if (duration < 500) state.latencyBuckets['200-500ms']++;
    else if (duration < 1000) state.latencyBuckets['500-1000ms']++;
    else state.latencyBuckets['>1000ms']++;

    // Track errors (4xx/5xx)
    if (res.statusCode >= 400) {
      state.totalErrors++;
      const code = String(res.statusCode);
      state.errorsByStatus[code] = (state.errorsByStatus[code] || 0) + 1;

      const tenantId = req.tenant?.id || 'none';
      state.errorsByTenant[tenantId] = (state.errorsByTenant[tenantId] || 0) + 1;

      // Push to circular buffer
      state.recentErrors.push({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        tenant: tenantId,
      });
      if (state.recentErrors.length > MAX_RECENT_ERRORS) {
        state.recentErrors.shift();
      }
    }
  });

  next();
}

/**
 * Record an error with a message (call from error handler).
 */
export function recordErrorDetail(req, err) {
  const last = state.recentErrors[state.recentErrors.length - 1];
  if (last && last.path === req.path && !last.message) {
    last.message = err.message?.slice(0, 200) || 'Unknown error';
  }
}

/**
 * Get current metrics snapshot.
 */
export function getRequestMetrics() {
  return {
    totalRequests: state.totalRequests,
    totalErrors: state.totalErrors,
    errorRate: state.totalRequests > 0
      ? Math.round((state.totalErrors / state.totalRequests) * 10000) / 100
      : 0,
    errorsByStatus: { ...state.errorsByStatus },
    errorsByTenant: { ...state.errorsByTenant },
    latencyBuckets: { ...state.latencyBuckets },
    recentErrors: [...state.recentErrors].reverse(),
  };
}

/**
 * Reset cumulative counters (errorsByStatus, errorsByTenant).
 * Called every 24h to prevent unbounded growth.
 * Preserves recentErrors circular buffer and latency buckets.
 */
export function resetCounters() {
  state.totalRequests = 0;
  state.totalErrors = 0;
  state.errorsByStatus = {};
  state.errorsByTenant = {};
}

/**
 * Get snapshot suitable for time-series (smaller footprint).
 */
export function getRequestMetricsSnapshot() {
  return {
    totalRequests: state.totalRequests,
    totalErrors: state.totalErrors,
    errorRate: state.totalRequests > 0
      ? Math.round((state.totalErrors / state.totalRequests) * 10000) / 100
      : 0,
    latencyBuckets: { ...state.latencyBuckets },
  };
}
