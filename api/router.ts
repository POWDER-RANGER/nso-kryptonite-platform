/**
 * tRPC Router
 * All API routes defined here
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  abortRangeSession,
  createRangeSession,
  listScenarios,
  performRangeAction,
  type RangeAction,
  type RangeMode,
} from '../engine/scenario/simulator';
import { getRangeSession, listRangeSessions, saveRangeSession } from './queries/range-store';


const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Exercise router
const exerciseRouter = router({
  list: publicProcedure.query(async () => {
    // TODO: Implement with Drizzle ORM
    return [
      { id: 1, name: 'Tier 1: AD Basics', status: 'DRAFT' as const },
      { id: 2, name: 'Tier 2: Protocol Layer', status: 'DRAFT' as const },
    ];
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return {
        id: input.id,
        name: `Exercise ${input.id}`,
        status: 'DRAFT',
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        scenarioId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Insert into database
      return { id: Date.now(), ...input };
    }),
});

// Telemetry router
const telemetryRouter = router({
  stream: publicProcedure.subscription(async function* () {
    // TODO: Implement WebSocket streaming
    yield { type: 'TELEMETRY', data: null };
  }),

  query: publicProcedure
    .input(
      z.object({
        exerciseId: z.number(),
        source: z.enum(['zeek', 'edr', 'dns', 'netflow', 'windows']).optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      return [];
    }),
});

// Audit router
const auditRouter = router({
  query: publicProcedure
    .input(
      z.object({
        exerciseId: z.number().optional(),
        operatorId: z.number().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input }) => {
      return [];
    }),

  verify: publicProcedure.query(async () => {
    return { valid: true, entries: 0 };
  }),
});

// Mesh router
const meshRouter = router({
  nodes: publicProcedure.query(async () => {
    return [];
  }),

  register: publicProcedure
    .input(
      z.object({
        nodeType: z.enum(['COMMAND_NODE', 'SENSOR', 'TARGET', 'REDIRECTOR', 'GATEWAY']),
        publicKey: z.string(),
        hostname: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return {
        nodeId: crypto.randomUUID(),
        assignedIp: '10.200.200.2',
        endpoint: 'mesh-gateway',
        port: 51820,
        gatewayPublicKey: input.publicKey,
      };
    }),
});

// Safe synthetic cyber range: training and operator-vs-operator scoring.
// These procedures only generate pre-authored local events; they cannot target networks.
const rangeProcedure = publicProcedure.use(({ next }) => {
  if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Range sessions are disabled in production until operator authorization is enforced.',
    });
  }
  return next();
});

const rangeRouter = router({
  scenarios: publicProcedure.query(() => listScenarios()),

  sessions: rangeProcedure.query(async () =>
    (await listRangeSessions()).map((session) => ({
      id: session.id,
      name: session.name,
      scenarioId: session.scenarioId,
      mode: session.mode,
      status: session.status,
      createdAt: session.createdAt,
      redScore: session.redScore,
      blueScore: session.blueScore,
      stage: session.stage,
      eventCount: session.events.length,
    }))
  ),

  get: rangeProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    const session = await getRangeSession(input.id);
    if (!session) throw new Error('Range session not found');
    return session;
  }),

  create: rangeProcedure.input(z.object({
    name: z.string().trim().min(1).max(80),
    scenarioId: z.string().min(1),
    mode: z.enum(['TRAINING', 'OPERATOR_VS_OPERATOR']),
  })).mutation(async ({ input }) => {
    if ((await listRangeSessions()).length >= 100) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'The range session limit has been reached.' });
    }
    const session = createRangeSession({ name: input.name, scenarioId: input.scenarioId, mode: input.mode as RangeMode });
    await saveRangeSession(session);
    return session;
  }),

  act: rangeProcedure.input(z.object({
    id: z.string().uuid(),
    action: z.enum(['ADVANCE_SCENARIO', 'INVESTIGATE', 'CONTAIN', 'SUBMIT_DETECTION', 'END_TURN', 'FINISH']),
    note: z.string().max(500).optional(),
  })).mutation(async ({ input }) => {
    const session = await getRangeSession(input.id);
    if (!session) throw new Error('Range session not found');
    const updated = performRangeAction(session, input.action as RangeAction, input.note);
    await saveRangeSession(updated);
    return updated;
  }),

  abort: rangeProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    const session = await getRangeSession(input.id);
    if (!session) throw new Error('Range session not found');
    const updated = abortRangeSession(session);
    await saveRangeSession(updated);
    return updated;
  }),
});

// Main router
export const appRouter = router({
  range: rangeRouter,
  exercise: exerciseRouter,
  telemetry: telemetryRouter,
  audit: auditRouter,
  mesh: meshRouter,
});

export type AppRouter = typeof appRouter;
