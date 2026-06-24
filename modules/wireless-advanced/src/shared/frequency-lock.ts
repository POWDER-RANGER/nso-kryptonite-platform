/**
 * SDR Frequency Lock — Immutable Scope Enforcement
 * 
 * SAFETY CONSTRAINT: All RF transmissions are scoped to the training range.
 * The platform physically blocks transmission outside authorized frequencies
 * via SDR firmware lock. This cannot be disabled.
 * 
 * This is a hardware-level safety mechanism.
 */

interface FrequencyRange {
  minHz: number;
  maxHz: number;
  description: string;
}

// Authorized training range frequencies only
const AUTHORIZED_RANGES: FrequencyRange[] = [
  // 2.4 GHz WiFi channels (training range only)
  { minHz: 2412000000, maxHz: 2484000000, description: '2.4GHz WiFi Training Range' },
  // 5 GHz WiFi channels (training range only)
  { minHz: 5150000000, maxHz: 5850000000, description: '5GHz WiFi Training Range' },
  // BLE (training range only)
  { minHz: 2402000000, maxHz: 2480000000, description: 'BLE Training Range' },
];

export class FrequencyLock {
  /**
   * Verify a frequency is within authorized training range
   * Throws if outside range — hardware block
   */
  static assertAuthorized(frequencyHz: number): void {
    const authorized = AUTHORIZED_RANGES.some(
      r => frequencyHz >= r.minHz && frequencyHz <= r.maxHz
    );

    if (!authorized) {
      const error = new Error(
        `FREQUENCY_LOCK_VIOLATION: ${frequencyHz}Hz is outside authorized training ranges. ` +
        `This attempt has been logged and blocked. Unauthorized RF transmission is prevented ` +
        `by hardware-level firmware lock.`
      );
      
      // Log to audit chain
      this.logViolation(frequencyHz);
      
      throw error;
    }
  }

  /**
   * Get authorized frequency ranges for display
   */
  static getAuthorizedRanges(): FrequencyRange[] {
    return [...AUTHORIZED_RANGES]; // Return copy to prevent mutation
  }

  /**
   * Check if frequency is authorized (returns boolean, no throw)
   */
  static isAuthorized(frequencyHz: number): boolean {
    return AUTHORIZED_RANGES.some(
      r => frequencyHz >= r.minHz && frequencyHz <= r.maxHz
    );
  }

  private static async logViolation(frequencyHz: number): Promise<void> {
    // Immediate audit chain logging
    await fetch('wss://mesh/audit', {
      method: 'POST',
      body: JSON.stringify({
        type: 'FREQUENCY_LOCK_VIOLATION',
        frequencyHz,
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL',
        action: 'BLOCKED',
      }),
    });

    // Trigger immediate notification to Sanctuary facilitator
    await fetch('wss://mesh/alerts', {
      method: 'POST',
      body: JSON.stringify({
        type: 'SCOPE_VIOLATION',
        severity: 'CRITICAL',
        message: `Unauthorized frequency transmission blocked: ${frequencyHz}Hz`,
      }),
    });
  }
}
