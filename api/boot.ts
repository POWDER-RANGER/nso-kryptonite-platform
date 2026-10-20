/**
 * API Server Bootstrap
 * Hono + tRPC + WebSocket server
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { trpcServer } from '@trpc/server/adapters/fetch';
import { appRouter } from './router';
import {
  abortRangeSession,
  createRangeSession,
  listScenarios,
  performRangeAction,
  rangeSessions,
  type RangeAction,
  type RangeMode,
} from '../engine/scenario/simulator';

const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

// tRPC API
app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (opts) => ({
      req: opts.req,
      env: opts.env,
    }),
  })
);

// Safe synthetic-range REST API. All events are pre-authored; no live network actions exist.
app.get('/api/v1/range/scenarios', (c) => c.json({ data: listScenarios() }));

app.get('/api/v1/range/sessions', (c) => c.json({
  data: [...rangeSessions.values()].map((session) => ({
    id: session.id, name: session.name, scenarioId: session.scenarioId,
    mode: session.mode, status: session.status, createdAt: session.createdAt,
    redScore: session.redScore, blueScore: session.blueScore, stage: session.stage,
    eventCount: session.events.length,
  })),
}));

app.get('/api/v1/range/sessions/:id', (c) => {
  const session = rangeSessions.get(c.req.param('id'));
  if (!session) return c.json({ error: 'Range session not found' }, 404);
  return c.json({ data: session });
});

app.post('/api/v1/range/sessions', async (c) => {
  try {
    const body = await c.req.json() as { name?: unknown; scenarioId?: unknown; mode?: unknown };
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 80) {
      return c.json({ error: 'Name must be between 1 and 80 characters.' }, 400);
    }
    if (typeof body.scenarioId !== 'string' || !['identity-anomaly', 'wireless-baseline', 'protocol-anomaly'].includes(body.scenarioId)) {
      return c.json({ error: 'Choose a supported synthetic scenario.' }, 400);
    }
    if (body.mode !== 'TRAINING' && body.mode !== 'OPERATOR_VS_OPERATOR') {
      return c.json({ error: 'Mode must be TRAINING or OPERATOR_VS_OPERATOR.' }, 400);
    }
    const session = createRangeSession({
      name: body.name.trim(), scenarioId: body.scenarioId, mode: body.mode as RangeMode,
    });
    rangeSessions.set(session.id, session);
    return c.json({ data: session }, 201);
  } catch {
    return c.json({ error: 'Invalid JSON request body.' }, 400);
  }
});

app.post('/api/v1/range/sessions/:id/actions', async (c) => {
  const session = rangeSessions.get(c.req.param('id'));
  if (!session) return c.json({ error: 'Range session not found' }, 404);
  try {
    const body = await c.req.json() as { action?: unknown; note?: unknown };
    const allowed = ['ADVANCE_SCENARIO', 'INVESTIGATE', 'CONTAIN', 'SUBMIT_DETECTION'];
    if (typeof body.action !== 'string' || !allowed.includes(body.action)) {
      return c.json({ error: 'Unsupported range action.' }, 400);
    }
    if (body.note !== undefined && typeof body.note !== 'string') {
      return c.json({ error: 'Note must be text.' }, 400);
    }
    const updated = performRangeAction(session, body.action as RangeAction, body.note as string | undefined);
    rangeSessions.set(updated.id, updated);
    return c.json({ data: updated });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unable to apply action.' }, 400);
  }
});

app.post('/api/v1/range/sessions/:id/abort', (c) => {
  const session = rangeSessions.get(c.req.param('id'));
  if (!session) return c.json({ error: 'Range session not found' }, 404);
  try {
    const updated = abortRangeSession(session);
    rangeSessions.set(updated.id, updated);
    return c.json({ data: updated });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unable to abort session.' }, 400);
  }
});

// Legacy exercises endpoint remains explicit about its limited implementation.
app.get('/api/v1/exercises', (c) => c.json({
  error: 'Legacy exercises API is not implemented. Use /api/v1/range for the synthetic training range.',
}, 501));

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`🚀 NSO Kryptonite API starting on port ${port}...`);

// Bun/Node compatible server start
if (typeof Bun !== 'undefined') {
  Bun.serve({
    fetch: app.fetch,
    port,
    websocket: {
      message(ws, message) {
        // WebSocket message handling for real-time streams
        ws.send(JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() }));
      },
      open(ws) {
        console.log('🔌 WebSocket client connected');
      },
      close(ws) {
        console.log('🔌 WebSocket client disconnected');
      },
    },
  });
} else {
  // Node.js fallback
  const { createServer } = await import('http');
  createServer(async (req, res) => {
    const response = await app.fetch(req as unknown as Request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  }).listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

console.log(`✅ NSO Kryptonite API ready`);
console.log(`   tRPC endpoint: http://localhost:${port}/api/trpc`);
console.log(`   Health:        http://localhost:${port}/health`);
