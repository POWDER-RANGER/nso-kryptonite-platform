import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../api/app';

const keys = ['NODE_ENV', 'RENDER', 'RANGE_STORAGE', 'RANGE_RED_TOKEN', 'RANGE_BLUE_TOKEN', 'RANGE_FACILITATOR_TOKEN'] as const;
const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const redToken = 'red-test-secret-12345678901234567890';
const blueToken = 'blue-test-secret-12345678901234567890';
const facilitatorToken = 'facilitator-test-secret-123456789012345';

beforeAll(() => {
  process.env.NODE_ENV = 'production';
  process.env.RENDER = 'true';
  process.env.RANGE_STORAGE = 'memory';
  process.env.RANGE_RED_TOKEN = redToken;
  process.env.RANGE_BLUE_TOKEN = blueToken;
  process.env.RANGE_FACILITATOR_TOKEN = facilitatorToken;
});

afterAll(() => {
  for (const key of keys) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function call(path: string, token?: string, method = 'GET', body?: unknown) {
  return app.request(path, {
    method,
    headers: {
      ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('production range API role authorization', () => {
  it('keeps scenarios public but requires a role key to list sessions', async () => {
    expect((await call('/api/v1/range/scenarios')).status).toBe(200);
    expect((await call('/api/v1/range/sessions')).status).toBe(401);
    expect((await call('/api/v1/range/sessions', redToken)).status).toBe(200);
  });

  it('allows only a facilitator to create sessions', async () => {
    const payload = { name: 'Role test ' + crypto.randomUUID(), scenarioId: 'identity-anomaly', mode: 'OPERATOR_VS_OPERATOR' };
    expect((await call('/api/v1/range/sessions', redToken, 'POST', payload)).status).toBe(403);
    expect((await call('/api/v1/range/sessions', blueToken, 'POST', payload)).status).toBe(403);
    const response = await call('/api/v1/range/sessions', facilitatorToken, 'POST', payload);
    expect(response.status).toBe(201);
    const created = (await response.json() as { data: { id: string; currentTurn: string } }).data;
    expect(created.currentTurn).toBe('RED');
  });

  it('enforces role-specific Red advance and Blue response actions', async () => {
    const createdResponse = await call('/api/v1/range/sessions', facilitatorToken, 'POST', {
      name: 'Turn authorization ' + crypto.randomUUID(),
      scenarioId: 'identity-anomaly',
      mode: 'OPERATOR_VS_OPERATOR',
    });
    const created = (await createdResponse.json() as { data: { id: string } }).data;
    const url = '/api/v1/range/sessions/' + created.id + '/actions';

    expect((await call(url, blueToken, 'POST', { action: 'ADVANCE_SCENARIO' })).status).toBe(403);
    expect((await call(url, redToken, 'POST', { action: 'ADVANCE_SCENARIO' })).status).toBe(200);
    expect((await call(url, redToken, 'POST', { action: 'INVESTIGATE', note: 'Baseline event matches the expected identity pattern.' })).status).toBe(403);
    expect((await call(url, blueToken, 'POST', { action: 'INVESTIGATE', note: 'Baseline event matches the expected identity pattern.' })).status).toBe(200);
    expect((await call(url, redToken, 'POST', { action: 'END_TURN' })).status).toBe(403);
    expect((await call(url, blueToken, 'POST', { action: 'END_TURN' })).status).toBe(200);
  });

  it('requires facilitator role to abort and finish', async () => {
    const createdResponse = await call('/api/v1/range/sessions', facilitatorToken, 'POST', {
      name: 'Lifecycle authorization ' + crypto.randomUUID(),
      scenarioId: 'identity-anomaly',
      mode: 'TRAINING',
    });
    const created = (await createdResponse.json() as { data: { id: string } }).data;
    expect((await call('/api/v1/range/sessions/' + created.id + '/abort', redToken, 'POST')).status).toBe(403);
    expect((await call('/api/v1/range/sessions/' + created.id + '/abort', facilitatorToken, 'POST')).status).toBe(200);
  });
});
