import { Router } from 'express';
import { runChaosAgent, isChaosRunning } from '../lib/chaosAgent.js';

const router = Router();

/**
 * Admin auth middleware — same pattern as admin.js.
 */
function requireAdmin(req, res, next) {
  const secret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!process.env.ADMIN_SECRET) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  }
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid admin secret' });
  }
  next();
}

router.use(requireAdmin);

// GET /api/chaos/status — check if a run is in progress
router.get('/status', (req, res) => {
  res.json({ running: isChaosRunning() });
});

// POST /api/chaos/run — start the chaos agent, streaming progress via SSE
router.post('/run', async (req, res) => {
  if (isChaosRunning()) {
    return res.status(409).json({ error: 'Chaos agent is already running' });
  }

  const { ordersPerTenant = 20 } = req.body || {};

  if (typeof ordersPerTenant !== 'number' || ordersPerTenant < 1 || ordersPerTenant > 100) {
    return res.status(400).json({ error: 'ordersPerTenant must be between 1 and 100' });
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const emit = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const results = await runChaosAgent(ordersPerTenant, emit);
    emit('complete', results);
  } catch (err) {
    console.error('[ChaosAgent] Error:', err);
    emit('error', { message: err.message });
  }

  res.end();
});

export default router;
