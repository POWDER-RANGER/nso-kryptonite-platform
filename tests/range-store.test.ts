import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createRangeSession, performRangeAction } from '../engine/scenario/simulator';
import { getRangeSession, getRangeStorageMode, listRangeSessions, saveRangeSession } from '../api/queries/range-store';

const previousStorage = process.env.RANGE_STORAGE;

beforeEach(() => {
  process.env.RANGE_STORAGE = 'memory';
});

afterAll(() => {
  if (previousStorage === undefined) delete process.env.RANGE_STORAGE;
  else process.env.RANGE_STORAGE = previousStorage;
});

describe('range session storage', () => {
  it('defaults to memory storage unless MySQL is explicitly selected', () => {
    process.env.RANGE_STORAGE = 'memory';
    expect(getRangeStorageMode()).toBe('memory');
    delete process.env.RANGE_STORAGE;
    expect(getRangeStorageMode()).toBe('memory');
  });

  it('saves and retrieves the current session snapshot', async () => {
    const session = createRangeSession({
      name: 'Storage test',
      scenarioId: 'identity-anomaly',
      mode: 'TRAINING',
    });
    await saveRangeSession(session);
    expect(await getRangeSession(session.id)).toEqual(session);
    expect((await listRangeSessions()).some((item) => item.id === session.id)).toBe(true);
  });

  it('persists updated score and lifecycle state in memory mode', async () => {
    let session = createRangeSession({
      name: 'Update test',
      scenarioId: 'identity-anomaly',
      mode: 'OPERATOR_VS_OPERATOR',
    });
    await saveRangeSession(session);
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    await saveRangeSession(session);
    const stored = await getRangeSession(session.id);
    expect(stored?.stage).toBe(1);
    expect(stored?.redScore).toBe(10);
  });
});
