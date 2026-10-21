import { timingSafeEqual } from 'node:crypto';

export type RangeOperatorRole = 'RED' | 'BLUE' | 'FACILITATOR' | 'DEV';
export type RangeAuthFailure = {
  allowed: false;
  status: 401 | 403 | 503;
  error: string;
};
export type RangeAuthResult = { allowed: true; role: RangeOperatorRole } | RangeAuthFailure;

const roleEnvironment: Record<Exclude<RangeOperatorRole, 'DEV'>, string> = {
  RED: 'RANGE_RED_TOKEN',
  BLUE: 'RANGE_BLUE_TOKEN',
  FACILITATOR: 'RANGE_FACILITATOR_TOKEN',
};

export function isProductionLike(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production' || env.RENDER === 'true';
}

/** Production deployments need three distinct, high-entropy, operator-role tokens. */
export function isRangeAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Object.values(roleEnvironment).every((name) => {
    const value = env[name];
    return typeof value === 'string' && value.length >= 32;
  });
}

function constantTimeMatch(candidate: string, configured: string): boolean {
  const left = Buffer.from(candidate, 'utf8');
  const right = Buffer.from(configured, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Small controlled-pilot authentication boundary.
 * Local development is intentionally frictionless; production requires distinct
 * bearer tokens for each operator role. These are not full user accounts or MFA.
 */
export function authorizeRangeRequest(
  request: Request,
  allowedRoles: Exclude<RangeOperatorRole, 'DEV'>[] = ['RED', 'BLUE', 'FACILITATOR'],
  env: NodeJS.ProcessEnv = process.env,
): RangeAuthResult {
  if (!isProductionLike(env)) {
    return { allowed: true, role: 'DEV' };
  }
  if (!isRangeAuthConfigured(env)) {
    return {
      allowed: false,
      status: 503,
      error: 'Range access is disabled: configure distinct 32-character-or-longer RANGE_RED_TOKEN, RANGE_BLUE_TOKEN, and RANGE_FACILITATOR_TOKEN secrets.',
    };
  }

  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) {
    return { allowed: false, status: 401, error: 'A role-specific bearer token is required.' };
  }
  const candidate = match[1];
  for (const role of Object.keys(roleEnvironment) as Exclude<RangeOperatorRole, 'DEV'>[]) {
    const configured = env[roleEnvironment[role]]!;
    if (constantTimeMatch(candidate, configured)) {
      if (!allowedRoles.includes(role)) {
        return { allowed: false, status: 403, error: `The ${role} credential cannot perform this action.` };
      }
      return { allowed: true, role };
    }
  }
  return { allowed: false, status: 401, error: 'The supplied role token is invalid.' };
}
