import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../api/router';

const originalNodeEnv = process.env.NODE_ENV;
const originalRender = process.env.RENDER;
beforeAll(() => { delete process.env.RENDER; });

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalRender === undefined) delete process.env.RENDER;
  else process.env.RENDER = originalRender;
});

describe('range router production boundary', () => {
  it('keeps scenario catalogue readable but disables session operations in production', async () => {
    process.env.NODE_ENV = 'production';
    const caller = appRouter.createCaller({});
    expect(await caller.range.scenarios()).toHaveLength(3);
    await expect(caller.range.sessions()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.range.create({
      name: 'must be blocked',
      scenarioId: 'identity-anomaly',
      mode: 'TRAINING',
    })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.exercise.list()).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
    await expect(caller.mesh.register({ nodeType: 'SENSOR', publicKey: 'test-key', hostname: 'test-node' })).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
  });
});
