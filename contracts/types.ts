/**
 * Shared types between frontend and backend
 * tRPC contracts ensure end-to-end type safety
 */

export type RuntimeMode = 'WEAPON' | 'SHIELD' | 'SANCTUARY' | 'SPECTATOR';

export type ExerciseStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'DECOMMISSIONED';

export type KillChainPhase =
  | 'RECON'
  | 'INITIAL_ACCESS'
  | 'PERSISTENCE'
  | 'LATERAL_MOVEMENT'
  | 'EXFILTRATION'
  | 'IMPACT';

export interface TokenScope {
  ipRanges: string[];
  vlans: number[];
  techniqueClasses: string[];
  timeWindow: {
    start: string;
    end: string;
  };
}

export interface Exercise {
  id: number;
  name: string;
  description: string | null;
  scenarioId: string;
  status: ExerciseStatus;
  currentPhase: string | null;
  scopeConfig: TokenScope | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Operator {
  id: number;
  displayName: string;
  email: string;
  role: 'ADMIN' | 'FACILITATOR' | 'RED_OPERATOR' | 'BLUE_ANALYST' | 'SPECTATOR';
  isActive: boolean;
}

export interface TelemetryEvent {
  id: number;
  exerciseId: number;
  source: 'zeek' | 'edr' | 'dns' | 'netflow' | 'windows';
  eventType: string;
  rawData: unknown;
  normalizedData: unknown;
  timestamp: string;
}

export interface DetectionRule {
  id: number;
  name: string;
  description: string | null;
  type: 'SIGMA' | 'KQL' | 'YARA' | 'SNORT';
  content: string;
  techniqueId: string | null;
  tactic: string | null;
  isCommunity: boolean;
  rating: number;
  createdAt: string;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  entryHash: string;
  previousHash: string;
  deviceId: string;
  operatorId: number;
  mode: string;
  action: string;
  result: string;
  merkleRoot: string | null;
}

export interface MeshNode {
  id: number;
  nodeId: string;
  hostname: string;
  nodeType: 'COMMAND_NODE' | 'SENSOR' | 'TARGET' | 'REDIRECTOR' | 'GATEWAY';
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  assignedIp: string | null;
  lastHeartbeat: string | null;
}

// WebSocket message types
export type WebSocketMessage =
  | { type: 'TELEMETRY'; data: TelemetryEvent }
  | { type: 'ALERT'; data: { severity: string; message: string; timestamp: string } }
  | { type: 'AUDIT'; data: AuditEntry }
  | { type: 'TOPOLOGY'; data: { nodes: MeshNode[]; edges: unknown[] } }
  | { type: 'HEARTBEAT'; timestamp: string };
