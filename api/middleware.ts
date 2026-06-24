/**
 * API Middleware
 * Authorization, scope enforcement, audit logging
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { TokenAuthority, ScopeChecker } from '../core/authorization/token';

const t = initTRPC.create();

/**
 * Enforce authorization on every request
 */
export const enforceAuth = t.middleware(async ({ ctx, next }) => {
  const authHeader = (ctx as Record<string, unknown>).req?.headers?.get('authorization');
  
  if (!authHeader) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authorization token required',
    });
  }

  // TODO: Verify token with public key
  // const token = await TokenAuthority.verify(authHeader, publicKey);

  return next();
});

/**
 * Enforce scope on offensive actions
 */
export const enforceScope = t.middleware(async ({ ctx, next }) => {
  // TODO: Implement scope checking
  // ScopeChecker.isIpAuthorized(ip, ranges);
  // ScopeChecker.isTechniqueAuthorized(techniqueId, allowedClasses);

  return next();
});

/**
 * Log all actions to audit chain
 */
export const auditLog = t.middleware(async ({ ctx, path, type, next }) => {
  const start = Date.now();
  
  const result = await next();
  
  // Log to audit chain (async, non-blocking)
  const duration = Date.now() - start;
  console.log(`[AUDIT] ${type} ${path} — ${duration}ms`);

  return result;
});
