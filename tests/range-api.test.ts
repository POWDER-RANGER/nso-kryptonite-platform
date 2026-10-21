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

async function createSession(mode: 'TESTING' | 'TRAINING' | 'OPERATOR_VS_OPERATOR') {
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
    const statusResponse = await app.request('/api/v1/range/status');
    expect(statusResponse.status).toBe(200);
    expect((await statusResponse.json() as { data: { storageMode: string } }).data.storageMode).toBe('memory');

    const scenarioResponse = await app.request('/api/v1/range/scenarios');
    expect(scenarioResponse.status).toBe(200);
    const scenarios = await scenarioResponse.json() as { data: Array<{ id: string; source: string }> };
    expect(scenarios.data).toHaveLength(3);
    expect(scenarios.data.every((scenario) => scenario.source === 'BUILT_IN_SYNTHETIC')).toBe(true);

    const fixturesResponse = await app.request('/api/v1/range/scenarios/identity-anomaly/fixtures');
    expect(fixturesResponse.status).toBe(200);
    const fixtures = await fixturesResponse.json() as { data: Array<{stage:number;source:string;severity:string;title:string}> };
    expect(fixtures.data).toHaveLength(4);
    expect(fixtures.data[1]).toMatchObject({ stage: 2, severity: 'MEDIUM' });
    expect(fixtures.data.every((fixture) => !('positiveStages' in fixture))).toBe(true);
    expect((await app.request('/api/v1/range/scenarios/no-such-scenario/fixtures')).status).toBe(404);

    const created = await createSession('TRAINING');
    expect(created.currentTurn).toBeNull();
    const response = await app.request('/api/v1/range/sessions/' + created.id);
    expect(response.status).toBe(200);
    const body = await response.json() as { data: { id: string; events: unknown[] } };
    expect(body.data.id).toBe(created.id);
    expect(body.data.events).toHaveLength(0);
  });

  it('runs synthetic detection tests through the REST API and locks a testing session', async () => {
    const created = await createSession('TESTING');
    expect(created.currentTurn).toBeNull();

    const prematureFinish = await postAction(created.id, 'FINISH');
    expect(prematureFinish.status).toBe(400);
    expect((await prematureFinish.json() as { error: string }).error).toContain('at least one detection test');

    const resultResponse = await postAction(created.id, 'SUBMIT_DETECTION', 'source=WINDOWS,EDR;severity=MEDIUM,HIGH');
    expect(resultResponse.status).toBe(200);
    const result = (await resultResponse.json() as { data: { stage: number; detectionTests: Array<{passed:boolean;truePositives:number;falsePositives:number;falseNegatives:number}>; blueScore:number } }).data;
    expect(result.stage).toBe(0);
    expect(result.detectionTests[0].passed).toBe(true);
    expect(result.detectionTests[0].truePositives).toBe(2);
    expect(result.detectionTests[0].falsePositives).toBe(0);
    expect(result.detectionTests[0].falseNegatives).toBe(0);
    expect(result.blueScore).toBe(15);

    const finish = await postAction(created.id, 'FINISH');
    expect(finish.status).toBe(200);
    expect((await finish.json() as { data: { status: string } }).data.status).toBe('COMPLETED');
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
    const keys = ['NODE_ENV', 'RENDER', 'RANGE_RED_TOKEN', 'RANGE_BLUE_TOKEN', 'RANGE_FACILITATOR_TOKEN'] as const;
    const oldValues = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.RENDER;
      delete process.env.RANGE_RED_TOKEN;
      delete process.env.RANGE_BLUE_TOKEN;
      delete process.env.RANGE_FACILITATOR_TOKEN;
      const sessionResponse = await app.request('/api/v1/range/sessions');
      expect(sessionResponse.status).toBe(503);
      const scenarios = await app.request('/api/v1/range/scenarios');
      expect(scenarios.status).toBe(200);
    } finally {
      for (const key of keys) {
        const value = oldValues[key];
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
