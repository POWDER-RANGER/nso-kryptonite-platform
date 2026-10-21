import 'dotenv/config';

/**
 * API Server Bootstrap
 * Hono + tRPC + WebSocket server
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { trpcServer } from '@trpc/server/adapters/fetch';
import { appRouter } from './router';
import {
  abortRangeSession,
  createRangeSession,
  listScenarios,
  performRangeAction,
  type RangeAction,
  type RangeMode,
} from '../engine/scenario/simulator';
import { getRangeSession, listRangeSessions, saveRangeSession } from './queries/range-store';

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

// Safe synthetic-range REST API. Scenario definitions are public; session operations
// stay disabled in production until operator authentication and authorization are enforced.
const productionGate = { error: 'Range sessions are disabled in production until operator authorization is enforced.' };
app.get('/api/v1/range/scenarios', (c) => c.json({ data: listScenarios() }));

app.get('/api/v1/range/sessions', async (c) => {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') return c.json(productionGate, 503);
  const sessions = await listRangeSessions();
  return c.json({ data: sessions.map((session) => ({
    id: session.id, name: session.name, scenarioId: session.scenarioId,
    mode: session.mode, status: session.status, createdAt: session.createdAt,
    redScore: session.redScore, blueScore: session.blueScore, stage: session.stage,
    eventCount: session.events.length,
  })) });
});

app.get('/api/v1/range/sessions/:id', async (c) => {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') return c.json(productionGate, 503);
  const session = await getRangeSession(c.req.param('id'));
  if (!session) return c.json({ error: 'Range session not found' }, 404);
  return c.json({ data: session });
});

app.post('/api/v1/range/sessions', async (c) => {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') return c.json(productionGate, 503);
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
    if ((await listRangeSessions()).length >= 100) {
      return c.json({ error: 'The range session limit has been reached.' }, 429);
    }
    const session = createRangeSession({
      name: body.name.trim(), scenarioId: body.scenarioId, mode: body.mode as RangeMode,
    });
    await saveRangeSession(session);
    return c.json({ data: session }, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unable to create range session.' }, 400);
  }
});

app.post('/api/v1/range/sessions/:id/actions', async (c) => {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') return c.json(productionGate, 503);
  const session = await getRangeSession(c.req.param('id'));
  if (!session) return c.json({ error: 'Range session not found' }, 404);
  try {
    const body = await c.req.json() as { action?: unknown; note?: unknown };
    const allowed = ['ADVANCE_SCENARIO', 'INVESTIGATE', 'CONTAIN', 'SUBMIT_DETECTION', 'END_TURN', 'FINISH'];
    if (typeof body.action !== 'string' || !allowed.includes(body.action)) {
      return c.json({ error: 'Unsupported range action.' }, 400);
    }
    if (body.note !== undefined && typeof body.note !== 'string') {
      return c.json({ error: 'Note must be text.' }, 400);
    }
    const updated = performRangeAction(session, body.action as RangeAction, body.note as string | undefined);
    await saveRangeSession(updated);
    return c.json({ data: updated });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unable to apply action.' }, 400);
  }
});

app.post('/api/v1/range/sessions/:id/abort', async (c) => {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') return c.json(productionGate, 503);
  const session = await getRangeSession(c.req.param('id'));
  if (!session) return c.json({ error: 'Range session not found' }, 404);
  try {
    const updated = abortRangeSession(session);
    await saveRangeSession(updated);
    return c.json({ data: updated });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Unable to abort session.' }, 400);
  }
});

// Legacy exercises endpoint remains explicit about its limited implementation.
app.get('/api/v1/exercises', (c) => c.json({
  error: 'Legacy exercises API is not implemented. Use /api/v1/range for the synthetic training range.',
}, 501));

// Start through the supported Hono Node adapter. Casting Node's IncomingMessage
// directly to Fetch Request does not work and silently breaks JSON bodies/headers.
const port = Number.parseInt(process.env.PORT ?? '3001', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number');
}

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`NSO Kryptonite API listening on http://localhost:${info.port}`);
  console.log(`tRPC endpoint: http://localhost:${info.port}/api/trpc`);
  console.log(`Health:        http://localhost:${info.port}/health`);
});
