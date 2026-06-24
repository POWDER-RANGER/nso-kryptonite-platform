/**
 * Authorization Token — Ed25519 Signed JWT
 * 
 * Every action requires a token. No token = no execution.
 * The token contains cryptographic scope that cannot be forged.
 * 
 * SAFETY: Token validation is mandatory for ALL function calls.
 * There are no exceptions, no bypasses, no admin overrides.
 */

import { SignJWT, jwtVerify } from 'jose';

export type RuntimeMode = 'WEAPON' | 'SHIELD' | 'SANCTUARY' | 'SPECTATOR';

export interface TokenScope {
  ipRanges: string[];        // e.g., ["192.168.10.0/24"]
  vlans: number[];           // e.g., [10, 20, 30]
  techniqueClasses: string[]; // e.g., ["T1003", "T1558"]
  timeWindow: {              // Valid operation window
    start: string;           // ISO 8601
    end: string;
  };
}

export interface AuthorizationToken {
  sub: string;               // Device identity (hardware-bound)
  scope: TokenScope;
  mode: RuntimeMode;
  exerciseId: string;
  iss: string;               // Training controller identity
  iat: number;
  exp: number;               // 60 seconds from iat
}

export class TokenAuthority {
  private static readonly TTL_SECONDS = 60;
  private static readonly ALGORITHM = 'EdDSA';

  /**
   * Mint a new authorization token
   * Only the training controller can mint tokens
   */
  static async mint(
    deviceId: string,
    scope: TokenScope,
    mode: RuntimeMode,
    exerciseId: string,
    controllerPrivateKey: CryptoKey
  ): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    const token = await new SignJWT({
      scope,
      mode,
      exerciseId,
    })
      .setProtectedHeader({ alg: this.ALGORITHM })
      .setSubject(deviceId)
      .setIssuer('nso-kryptonite-controller')
      .setIssuedAt(now)
      .setExpirationTime(now + this.TTL_SECONDS)
      .sign(controllerPrivateKey);

    return token;
  }

  /**
   * Verify an authorization token
   * Called before EVERY action execution
   */
  static async verify(
    token: string,
    controllerPublicKey: CryptoKey
  ): Promise<AuthorizationToken> {
    const { payload } = await jwtVerify(token, controllerPublicKey, {
      algorithms: [this.ALGORITHM],
      clockTolerance: 5, // 5 second leeway for mesh latency
      issuer: 'nso-kryptonite-controller',
    });

    return payload as unknown as AuthorizationToken;
  }

  /**
   * Check if a token is expired or about to expire
   */
  static isExpiringSoon(token: AuthorizationToken, bufferSeconds = 10): boolean {
    const now = Math.floor(Date.now() / 1000);
    return token.exp - now <= bufferSeconds;
  }
}

/**
 * Scope Checker — Validates action against token scope
 */
export class ScopeChecker {
  /**
   * Check if target IP is within authorized ranges
   */
  static isIpAuthorized(ip: string, ranges: string[]): boolean {
    // CIDR matching logic
    return ranges.some(range => this.ipInCidr(ip, range));
  }

  /**
   * Check if technique is in authorized class
   */
  static isTechniqueAuthorized(techniqueId: string, allowedClasses: string[]): boolean {
    // Technique ID format: T1003.006
    // Class is the prefix: T1003
    const techniqueClass = techniqueId.split('.')[0];
    return allowedClasses.includes(techniqueClass);
  }

  /**
   * Check if current time is within authorized window
   */
  static isTimeAuthorized(timeWindow: TokenScope['timeWindow']): boolean {
    const now = new Date().toISOString();
    return now >= timeWindow.start && now <= timeWindow.end;
  }

  private static ipInCidr(ip: string, cidr: string): boolean {
    // Implementation of CIDR matching
    // This is a simplified version — production uses proper IP math
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);
    
    // Convert IP to integer for comparison
    const ipInt = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    const rangeInt = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    
    const maskInt = (0xFFFFFFFF << (32 - mask)) >>> 0;
    return (ipInt & maskInt) === (rangeInt & maskInt);
  }
}
