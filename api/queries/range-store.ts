import { desc, eq } from 'drizzle-orm';
import { getDb } from './connection';
import { rangeSessions as sessionTable } from '../../db/schema';
import type { RangeSession } from '../../engine/scenario/simulator';

const memorySessions = new Map<string, RangeSession>();
const MEMORY_LIMIT = 100;

export function getRangeStorageMode(): 'memory' | 'mysql' {
  return process.env.RANGE_STORAGE?.toLowerCase() === 'mysql' ? 'mysql' : 'memory';
}

export async function listRangeSessions(): Promise<RangeSession[]> {
  if (getRangeStorageMode() === 'memory') {
    return [...memorySessions.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MEMORY_LIMIT);
  }
  const rows = await getDb().select().from(sessionTable).orderBy(desc(sessionTable.createdAt)).limit(MEMORY_LIMIT);
  return rows.map((row) => row.sessionData);
}

export async function getRangeSession(id: string): Promise<RangeSession | undefined> {
  if (getRangeStorageMode() === 'memory') return memorySessions.get(id);
  const rows = await getDb().select({ sessionData: sessionTable.sessionData }).from(sessionTable).where(eq(sessionTable.sessionId, id)).limit(1);
  return rows[0]?.sessionData;
}

export async function saveRangeSession(session: RangeSession): Promise<void> {
  if (getRangeStorageMode() === 'memory') {
    if (!memorySessions.has(session.id) && memorySessions.size >= MEMORY_LIMIT) throw new Error('Local memory range is full. Restart the API or configure durable storage.');
    memorySessions.set(session.id, session);
    return;
  }
  const now = new Date();
  await getDb().insert(sessionTable).values({
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    scenarioId: session.scenarioId,
    sessionData: session,
    createdAt: new Date(session.createdAt),
    updatedAt: now,
  }).onDuplicateKeyUpdate({ set: {
    mode: session.mode,
    status: session.status,
    scenarioId: session.scenarioId,
    sessionData: session,
    updatedAt: now,
  }});
}
