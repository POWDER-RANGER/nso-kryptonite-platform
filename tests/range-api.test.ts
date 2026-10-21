import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../api/app';

const originalStorage = process.env.RANGE_STORAGE;
const originalRender = process.env.RENDER;
const originalNodeEnv = process.env.NODE_ENV;
beforeAll(() => {
  process.env.RANGE_STORAGE = 'memory';
  process.env.NODE_ENV = 'test';
  delete process.env.RENDER;
});
afterAll(() => {
  if (originalStorage === undefined) delete process.env.RANGE_STORAGE;
  else process.env.RANGE_STORAGE = originalStorage;
  if (originalRender === undefined) delete process.env.RENDER;
  else process.env.RENDER = originalRender;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

async function postAction(id: string, action: string, note?: string) {
  return app.request('/api/v1/range/sessions/' + id + '/actions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...(note ? { note } : {}) }),
  });
}

async function createSession(mode: 'TRAINING' | 'OPERATOR_VS_OPERATOR') {
  const response = await app.request('/api/v1/range/sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'REST test ' + crypto.randomUUID(), scenarioId: 'identity-anomaly', mode }),
  });
  expect(response.status).toBe(201);
  return (await response.json() as { data: { id: string; currentTurn: string | null; status: string } }).data;
}

describe('synthetic range REST API', () => {
  it('exposes only the three built-in scenarios and creates a retrievable session', async () => {
    const scenarioResponse = await app.request('/api/v1/range/scenarios');
    expect(scenarioResponse.status).toBe(200);
    const scenarios = await scenarioResponse.json() as { data: Array<{ id: string; source: string }> };
    expect(scenarios.data).toHaveLength(3);
    expect(scenarios.data.every((scenario) => scenario.source === 'BUILT_IN_SYNTHETIC')).toBe(true);

    const created = await createSession('TRAINING');
    expect(created.currentTurn).toBeNull();
    const response = await app.request('/api/v1/range/sessions/' + created.id);
    expect(response.status).toBe(200);
    const body = await response.json() as { data: { id: string; events: unknown[] } };
    expect(body.data.id).toBe(created.id);
    expect(body.data.events).toHaveLength(0);
  });

  it('enforces Red advance, Blue response, Blue handoff, and final scoring lifecycle', async () => {
    const created = await createSession('OPERATOR_VS_OPERATOR');
    expect(created.currentTurn).toBe('RED');

    let lastStage = 0;
    for (let stage = 1; stage <= 4; stage += 1) {
      const advanced = await postAction(created.id, 'ADVANCE_SCENARIO');
      expect(advanced.status).toBe(200);
      const data = (await advanced.json() as { data: { stage: number; currentTurn: string; redScore: number } }).data;
      expect(data.stage).toBe(stage);
      expect(data.currentTurn).toBe('BLUE');
      expect(data.redScore).toBe(stage * 10);
      lastStage = data.stage;

      if (stage === 4) {
        const prematureFinish = await postAction(created.id, 'FINISH');
        expect(prematureFinish.status).toBe(400);
        expect((await prematureFinish.json() as { error: string }).error).toContain('Blue must end');
      } else {
        const redCannotDoubleAdvance = await postAction(created.id, 'ADVANCE_SCENARIO');
        expect(redCannotDoubleAdvance.status).toBe(400);
        const handoff = await postAction(created.id, 'END_TURN');
        expect(handoff.status).toBe(200);
        expect((await handoff.json() as { data: { currentTurn: string } }).data.currentTurn).toBe('RED');
      }
    }
    expect(lastStage).toBe(4);
    const handoff = await postAction(created.id, 'END_TURN');
    expect(handoff.status).toBe(200);
    const finish = await postAction(created.id, 'FINISH');
    expect(finish.status).toBe(200);
    expect((await finish.json() as { data: { status: string } }).data.status).toBe('COMPLETED');
  });

  it('fails closed for session routes in production while keeping static scenario metadata public', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldRender = process.env.RENDER;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;
      const sessionResponse = await app.request('/api/v1/range/sessions');
      expect(sessionResponse.status).toBe(503);
      const scenarios = await app.request('/api/v1/range/scenarios');
      expect(scenarios.status).toBe(200);
    } finally {
      if (oldNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldNodeEnv;
      if (oldRender === undefined) delete process.env.RENDER;
      else process.env.RENDER = oldRender;
    }
  });
});
