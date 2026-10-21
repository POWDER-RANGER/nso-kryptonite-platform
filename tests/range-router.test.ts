import { afterEach, describe, expect, it } from 'vitest';
import { appRouter } from '../api/router';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
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
  });
});
