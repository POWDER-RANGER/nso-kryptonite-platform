/**
 * Platform-wide constants
 */

export const TOKEN_TTL_SECONDS = 60;
export const MESH_HEARTBEAT_INTERVAL_MS = 15000;
export const KILL_SWITCH_HOLD_MS = 3000;
export const DETECTION_TWIN_DELAY_MS = 15000;
export const MAX_ERROR_BUDGET = 10;

export const RUNTIME_MODES = ['WEAPON', 'SHIELD', 'SANCTUARY', 'SPECTATOR'] as const;

export const KILL_CHAIN_PHASES = [
  'RECON',
  'INITIAL_ACCESS',
  'PERSISTENCE',
  'LATERAL_MOVEMENT',
  'EXFILTRATION',
  'IMPACT',
] as const;

export const EXERCISE_STATUSES = [
  'DRAFT',
  'PENDING',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'DECOMMISSIONED',
] as const;

export const NODE_TYPES = [
  'COMMAND_NODE',
  'SENSOR',
  'TARGET',
  'REDIRECTOR',
  'GATEWAY',
] as const;

export const TELEMETRY_SOURCES = [
  'zeek',
  'edr',
  'dns',
  'netflow',
  'windows',
] as const;

export const DETECTION_RULE_TYPES = [
  'SIGMA',
  'KQL',
  'YARA',
  'SNORT',
] as const;
