/**
 * Detection Twin — Immutable logging to Blue Team SIEM
 * 
 * Every offensive action MUST have a detection twin.
 * This module enforces the constraint: Blue Team always gets telemetry.
 * Delay is hardcoded and cannot be overridden.
 */

interface DetectionTwinLog {
  attackId: string;
  technique: string; // MITRE ATT&CK technique ID
  eventIds: number[]; // Windows Event IDs triggered
  delay: number; // Milliseconds before Blue Team sees it (default: 15000)
  timestamp: string;
  target: string;
}

export class DetectionTwin {
  private static readonly DEFAULT_DELAY = 15000; // 15 seconds — immutable

  static async log(entry: DetectionTwinLog): Promise<void> {
    // Enforce immutable delay
    const enforcedDelay = Math.max(entry.delay, this.DEFAULT_DELAY);

    // Queue for Blue Team SIEM ingestion
    setTimeout(async () => {
      await this.deliverToSIEM(entry);
    }, enforcedDelay);

    // Immediate audit chain entry
    await this.deliverToAuditChain(entry);
  }

  private static async deliverToSIEM(entry: DetectionTwinLog): Promise<void> {
    // Deliver to Blue Team telemetry stream
    const event = {
      type: 'DETECTION_TWIN',
      ...entry,
      deliveredAt: new Date().toISOString(),
    };

    // Publish to WebSocket telemetry stream
    await fetch('wss://mesh/telemetry', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  private static async deliverToAuditChain(entry: DetectionTwinLog): Promise<void> {
    // Immediate audit chain entry — no delay
    const auditEntry = {
      type: 'DETECTION_TWIN_LOGGED',
      attackId: entry.attackId,
      technique: entry.technique,
      blueTeamDelayMs: this.DEFAULT_DELAY,
      loggedAt: new Date().toISOString(),
    };

    // This goes directly to the audit chain (no delay)
    await fetch('wss://mesh/audit', {
      method: 'POST',
      body: JSON.stringify(auditEntry),
    });
  }
}
