/**
 * NSO Kryptonite Platform — Database Schema
 * Drizzle ORM with MySQL
 * 
 * This schema defines the core tables for exercises, operators,
 * audit logging, telemetry, and detection rules.
 */

import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  json,
  int,
  boolean,
  mysqlEnum,
  bigint,
} from 'drizzle-orm/mysql-core';

// --- Core Tables ---

export const exercises = mysqlTable('exercises', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  scenarioId: varchar('scenario_id', { length: 64 }).notNull(),
  status: mysqlEnum('status', [
    'DRAFT',
    'PENDING',
    'ACTIVE',
    'PAUSED',
    'COMPLETED',
    'DECOMMISSIONED',
  ]).notNull().default('DRAFT'),
  currentPhase: varchar('current_phase', { length: 50 }),
  scopeConfig: json('scope_config').$type<{
    ipRanges: string[];
    vlans: number[];
    techniqueClasses: string[];
    timeWindow: { start: string; end: string };
  }>(),
  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const operators = mysqlTable('operators', {
  id: serial('id').primaryKey(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  hardwareKey: varchar('hardware_key', { length: 255 }).notNull().unique(),
  role: mysqlEnum('role', [
    'ADMIN',
    'FACILITATOR',
    'RED_OPERATOR',
    'BLUE_ANALYST',
    'SPECTATOR',
  ]).notNull().default('SPECTATOR'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const exerciseParticipants = mysqlTable('exercise_participants', {
  id: serial('id').primaryKey(),
  exerciseId: bigint('exercise_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => exercises.id),
  operatorId: bigint('operator_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => operators.id),
  mode: mysqlEnum('mode', ['WEAPON', 'SHIELD', 'SANCTUARY', 'SPECTATOR']).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

export const authorizationTokens = mysqlTable('authorization_tokens', {
  id: serial('id').primaryKey(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  operatorId: bigint('operator_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => operators.id),
  exerciseId: bigint('exercise_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => exercises.id),
  mode: mysqlEnum('mode', ['WEAPON', 'SHIELD', 'SANCTUARY', 'SPECTATOR']).notNull(),
  scopeConfig: json('scope_config'),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
});

// --- Audit Tables ---

export const auditLog = mysqlTable('audit_log', {
  id: serial('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  entryHash: varchar('entry_hash', { length: 64 }).notNull(),
  previousHash: varchar('previous_hash', { length: 64 }).notNull(),
  deviceId: varchar('device_id', { length: 255 }).notNull(),
  operatorId: bigint('operator_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => operators.id),
  mode: varchar('mode', { length: 20 }).notNull(),
  action: varchar('action', { length: 255 }).notNull(),
  actionDetails: json('action_details'),
  scopeHash: varchar('scope_hash', { length: 64 }).notNull(),
  result: varchar('result', { length: 50 }).notNull(),
  merkleRoot: varchar('merkle_root', { length: 64 }),
});

export const blockchainAnchors = mysqlTable('blockchain_anchors', {
  id: serial('id').primaryKey(),
  auditLogId: bigint('audit_log_id', { mode: 'number', unsigned: true })
    .references(() => auditLog.id),
  merkleRoot: varchar('merkle_root', { length: 64 }).notNull(),
  blockchain: mysqlEnum('blockchain', ['BITCOIN', 'ETHEREUM']).notNull(),
  transactionHash: varchar('transaction_hash', { length: 255 }),
  anchoredAt: timestamp('anchored_at').defaultNow().notNull(),
});

// --- Telemetry Tables ---

export const telemetryEvents = mysqlTable('telemetry_events', {
  id: serial('id').primaryKey(),
  exerciseId: bigint('exercise_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => exercises.id),
  source: varchar('source', { length: 50 }).notNull(), // zeek, edr, dns, netflow
  eventType: varchar('event_type', { length: 100 }).notNull(),
  rawData: json('raw_data'),
  normalizedData: json('normalized_data'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const detectionRules = mysqlTable('detection_rules', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: mysqlEnum('type', ['SIGMA', 'KQL', 'YARA', 'SNORT']).notNull(),
  content: text('content').notNull(),
  techniqueId: varchar('technique_id', { length: 20 }), // MITRE ATT&CK
  tactic: varchar('tactic', { length: 100 }),
  author: bigint('author', { mode: 'number', unsigned: true })
    .references(() => operators.id),
  isCommunity: boolean('is_community').default(false),
  rating: int('rating').default(0), // Community rating
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Debrief Tables ---

export const debriefs = mysqlTable('debriefs', {
  id: serial('id').primaryKey(),
  exerciseId: bigint('exercise_id', { mode: 'number', unsigned: true })
    .notNull()
    .references(() => exercises.id)
    .unique(),
  blueNarrative: text('blue_narrative'),
  divergenceMap: json('divergence_map'),
  detectionHalfLife: int('detection_half_life'), // hours
  groundTruth: json('ground_truth'),
  lessonsLearned: text('lessons_learned'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Mesh Tables ---

export const meshNodes = mysqlTable('mesh_nodes', {
  id: serial('id').primaryKey(),
  nodeId: varchar('node_id', { length: 255 }).notNull().unique(),
  hostname: varchar('hostname', { length: 255 }).notNull(),
  nodeType: mysqlEnum('node_type', [
    'COMMAND_NODE',
    'SENSOR',
    'TARGET',
    'REDIRECTOR',
    'GATEWAY',
  ]).notNull(),
  wireguardPublicKey: varchar('wireguard_public_key', { length: 255 }),
  assignedIp: varchar('assigned_ip', { length: 50 }),
  status: mysqlEnum('status', ['ONLINE', 'OFFLINE', 'DEGRADED']).default('OFFLINE'),
  lastHeartbeat: timestamp('last_heartbeat'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
