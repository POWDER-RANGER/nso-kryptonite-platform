/**
 * Merkle Tree Audit Chain
 * 
 * Every action is logged in a Merkle tree with the following structure:
 * [Timestamp] [Device] [Operator] [Mode] [Action Hash] [Scope Hash] [Result] [Previous Hash]
 * 
 * Properties:
 * - Append-only: No modification API exists
 * - Distributed: Every mesh node maintains a copy
 * - Blockchain-anchored: Periodic hashes anchored to public blockchain
 */

import { createHash } from 'crypto';

export interface AuditEntry {
  timestamp: string;       // ISO 8601
  deviceId: string;        // Hardware-bound device identity
  operatorId: string;      // Operator identity
  mode: string;            // WEAPON | SHIELD | SANCTUARY | SPECTATOR
  action: string;          // Action description
  actionHash: string;      // SHA-3 of action details
  scopeHash: string;       // SHA-3 of authorization scope
  result: string;          // SUCCESS | BLOCKED | ERROR
  previousHash: string;    // Hash of previous entry (chain linkage)
}

export class MerkleAuditChain {
  private entries: AuditEntry[] = [];
  private merkleRoot: string = '';

  /**
   * Append a new entry to the audit chain
   * This is the ONLY write operation. No updates, no deletes.
   */
  async append(entry: Omit<AuditEntry, 'previousHash'>): Promise<AuditEntry> {
    const previousHash = this.getLatestHash();
    
    const fullEntry: AuditEntry = {
      ...entry,
      previousHash,
    };

    // Compute entry hash
    const entryHash = this.hashEntry(fullEntry);
    fullEntry.actionHash = entryHash; // Embed hash for verification

    this.entries.push(fullEntry);
    this.rebuildMerkleRoot();

    // Distribute to mesh nodes
    await this.distributeToMesh(fullEntry);

    return fullEntry;
  }

  /**
   * Verify the integrity of the entire chain
   */
  verify(): { valid: boolean; brokenAt?: number } {
    for (let i = 1; i < this.entries.length; i++) {
      const current = this.entries[i];
      const previous = this.entries[i - 1];
      
      // Verify chain linkage
      if (current.previousHash !== this.hashEntry(previous)) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true };
  }

  /**
   * Generate Merkle proof for an entry
   */
  getProof(index: number): string[] {
    // Simplified: return path hashes
    // Full implementation would build proper Merkle proof
    const proof: string[] = [];
    let level = this.entries.map(e => this.hashEntry(e));
    
    let currentIndex = index;
    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        nextLevel.push(createHash('sha3-256').update(left + right).digest('hex'));
        
        if (i === currentIndex || i + 1 === currentIndex) {
          proof.push(i === currentIndex ? right : left);
        }
      }
      currentIndex = Math.floor(currentIndex / 2);
      level = nextLevel;
    }
    
    return proof;
  }

  /**
   * Export chain segment for evidence preservation
   */
  exportSegment(startTime: string, endTime: string): AuditEntry[] {
    return this.entries.filter(
      e => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Get the current Merkle root for blockchain anchoring
   */
  getMerkleRoot(): string {
    return this.merkleRoot;
  }

  /**
   * Get latest entry hash
   */
  getLatestHash(): string {
    if (this.entries.length === 0) {
      return '0'.repeat(64); // Genesis hash
    }
    return this.hashEntry(this.entries[this.entries.length - 1]);
  }

  private hashEntry(entry: AuditEntry): string {
    const data = JSON.stringify({
      timestamp: entry.timestamp,
      deviceId: entry.deviceId,
      operatorId: entry.operatorId,
      mode: entry.mode,
      action: entry.action,
      scopeHash: entry.scopeHash,
      result: entry.result,
      previousHash: entry.previousHash,
    });
    return createHash('sha3-256').update(data).digest('hex');
  }

  private rebuildMerkleRoot(): void {
    if (this.entries.length === 0) {
      this.merkleRoot = '';
      return;
    }

    let level = this.entries.map(e => this.hashEntry(e));
    
    while (level.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        nextLevel.push(createHash('sha3-256').update(left + right).digest('hex'));
      }
      level = nextLevel;
    }
    
    this.merkleRoot = level[0];
  }

  private async distributeToMesh(entry: AuditEntry): Promise<void> {
    // Distribute to all mesh nodes via WebSocket
    await fetch('wss://mesh/audit', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  }
}
