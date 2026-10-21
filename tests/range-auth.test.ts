import { describe, expect, it } from 'vitest';
import { authorizeRangeRequest, isRangeAuthConfigured } from '../api/queries/range-auth';

const configured = {
  NODE_ENV: 'production',
  RANGE_RED_TOKEN: 'red-test-secret-12345678901234567890',
  RANGE_BLUE_TOKEN: 'blue-test-secret-12345678901234567890',
  RANGE_FACILITATOR_TOKEN: 'facilitator-test-secret-123456789012345',
} as NodeJS.ProcessEnv;

function request(token?: string) {
  return new Request('https://range.example.test/api/v1/range/sessions', {
    headers: token ? { authorization: 'Bearer ' + token } : {},
  });
}

describe('range role authentication', () => {
  it('allows frictionless access only outside production-like environments', () => {
    expect(authorizeRangeRequest(request(), ['RED'], { NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toEqual({
      allowed: true,
      role: 'DEV',
    });
  });

  it('requires all distinct configured secrets to have at least 32 characters', () => {
    expect(isRangeAuthConfigured(configured)).toBe(true);
    expect(isRangeAuthConfigured({ ...configured, RANGE_BLUE_TOKEN: 'short' })).toBe(false);
    expect(authorizeRangeRequest(request(), ['RED'], { NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toMatchObject({
      allowed: false,
      status: 503,
    });
  });

  it('recognizes the bearer token role and rejects role mismatch', () => {
    expect(authorizeRangeRequest(request(configured.RANGE_RED_TOKEN), ['RED'], configured)).toEqual({
      allowed: true,
      role: 'RED',
    });
    expect(authorizeRangeRequest(request(configured.RANGE_RED_TOKEN), ['BLUE'], configured)).toMatchObject({
      allowed: false,
      status: 403,
    });
    expect(authorizeRangeRequest(request('wrong-secret'), ['RED'], configured)).toMatchObject({
      allowed: false,
      status: 401,
    });
  });

  it('requires a bearer token on configured production deployments', () => {
    expect(authorizeRangeRequest(request(), ['FACILITATOR'], configured)).toMatchObject({
      allowed: false,
      status: 401,
    });
  });
});
