import { Router } from 'express';
import { requirePlanFeature } from '../planLimits.js';
import { requireAuth } from '../middleware/auth.js';
import { TEMPLATES, runStressTest } from '../lib/stressEngine.js';

const router = Router();

// GET /api/stress-test/templates — return available templates
router.get('/templates', requireAuth(), async (req, res) => {
  res.json(TEMPLATES);
});

// POST /api/stress-test/run — execute a stress test, streaming progress via SSE
router.post('/run', requirePlanFeature('stressTest'), requireAuth(), async (req, res) => {
  const { templateId, params } = req.body;

  if (!templateId || !params) {
    return res.status(400).json({ error: 'templateId and params are required' });
  }

  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return res.status(400).json({ error: `Unknown template: ${templateId}` });
  }

  // Validate params are within bounds
  for (const paramDef of template.params) {
    const val = params[paramDef.key];
    if (val !== undefined) {
      if (typeof val !== 'number' || val < paramDef.min || val > paramDef.max) {
        return res.status(400).json({
          error: `Parameter ${paramDef.key} must be between ${paramDef.min} and ${paramDef.max}`,
        });
      }
    }
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  const emit = (event, data) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    const results = await runStressTest(
      { templateId, params },
      req.tenant?.id,
      emit,
    );
    emit('complete', results);
  } catch (err) {
    console.error('[StressTest] Error:', err);
    emit('error', { message: err.message });
  }

  res.end();
});

export default router;
