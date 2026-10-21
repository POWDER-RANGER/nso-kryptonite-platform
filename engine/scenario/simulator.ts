/**
 * Safe cyber-range simulator.
 *
 * This engine emits synthetic, pre-authored events only. It does not scan,
 * exploit, authenticate to, or send traffic to any external system.
 */

export type RangeMode = 'TRAINING' | 'OPERATOR_VS_OPERATOR';
export type RangeTeam = 'RED' | 'BLUE';
export type RangeAction = 'ADVANCE_SCENARIO' | 'INVESTIGATE' | 'CONTAIN' | 'SUBMIT_DETECTION' | 'END_TURN' | 'FINISH';

export interface RangeEvent {
  id: string;
  timestamp: string;
  source: 'WINDOWS' | 'DNS' | 'EDR' | 'NETWORK';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  title: string;
  detail: string;
  clue: string;
  stage: number;
}

export interface RangeObjective {
  id: string;
  label: string;
  team: RangeTeam;
  points: number;
  complete: boolean;
}

export interface RangeSession {
  id: string;
  name: string;
  scenarioId: string;
  mode: RangeMode;
  status: 'ACTIVE' | 'COMPLETED' | 'ABORTED';
  createdAt: string;
  stage: number;
  currentTurn: RangeTeam | null;
  redScore: number;
  blueScore: number;
  events: RangeEvent[];
  objectives: RangeObjective[];
  notes: string[];
}

const SCENARIOS = [
  {
    id: 'identity-anomaly',
    name: 'Identity Anomaly',
    description: 'Synthetic Windows identity telemetry with an anomalous authentication pattern.',
    stages: [
      { source: 'WINDOWS', severity: 'INFO', title: 'Baseline authentication', detail: 'Synthetic user sign-in matches the normal training baseline.', clue: 'This event is expected baseline activity.' },
      { source: 'WINDOWS', severity: 'MEDIUM', title: 'Authentication pattern deviates', detail: 'A synthetic service account produces an unusual sequence of authentication events.', clue: 'Compare account role, event cadence, and the baseline.' },
      { source: 'EDR', severity: 'HIGH', title: 'Correlated endpoint alert', detail: 'A pre-authored endpoint alert correlates with the identity anomaly.', clue: 'Correlate timestamps before declaring scope.' },
      { source: 'WINDOWS', severity: 'INFO', title: 'Recovery evidence available', detail: 'A synthetic reset event and clean follow-up sign-in are recorded.', clue: 'Validate recovery using subsequent clean evidence.' },
    ],
  },
  {
    id: 'wireless-baseline',
    name: 'Wireless Baseline Drift',
    description: 'Synthetic wireless inventory and signal observations; no radio transmission or scanning.',
    stages: [
      { source: 'NETWORK', severity: 'INFO', title: 'Known access point inventory', detail: 'Training inventory contains three approved access points.', clue: 'Establish the known-good inventory first.' },
      { source: 'NETWORK', severity: 'MEDIUM', title: 'Unrecognized access point record', detail: 'A synthetic sensor record contains an unfamiliar BSSID and mismatched inventory label.', clue: 'Validate identity and provenance; signal strength alone is not proof.' },
      { source: 'DNS', severity: 'LOW', title: 'Client behavior changes', detail: 'Synthetic DNS observations show a client reconnecting after the inventory mismatch.', clue: 'Correlate client, time, and inventory evidence.' },
      { source: 'NETWORK', severity: 'INFO', title: 'Authorized inventory correction', detail: 'The exercise facilitator confirms the expected inventory and records the decision.', clue: 'Document the evidence and the authorized disposition.' },
    ],
  },
  {
    id: 'protocol-anomaly',
    name: 'Protocol Anomaly Triage',
    description: 'Synthetic network and DNS logs for defensive triage.',
    stages: [
      { source: 'DNS', severity: 'INFO', title: 'Normal name resolution', detail: 'Synthetic host resolves an internal training name as expected.', clue: 'Use this as the baseline.' },
      { source: 'DNS', severity: 'MEDIUM', title: 'Unexpected fallback lookup', detail: 'A synthetic endpoint attempts an unusual fallback name lookup.', clue: 'Check host context and resolver sequence.' },
      { source: 'NETWORK', severity: 'HIGH', title: 'Correlated broadcast spike', detail: 'A generated network event indicates a brief broadcast-volume anomaly.', clue: 'Correlate the time window and affected segment.' },
      { source: 'EDR', severity: 'INFO', title: 'Endpoint triage result', detail: 'Synthetic endpoint review finds no persistence indicators in this scenario.', clue: 'State what evidence supports—and does not support—your conclusion.' },
    ],
  },
] as const;

export function listScenarios() {
  return SCENARIOS.map(({ id, name, description, stages }) => ({
    id, name, description, stageCount: stages.length, source: 'BUILT_IN_SYNTHETIC',
  }));
}

export function createRangeSession(input: { name: string; scenarioId: string; mode: RangeMode; now?: Date }): RangeSession {
  const scenario = SCENARIOS.find((item) => item.id === input.scenarioId);
  if (!scenario) throw new Error('Unknown scenario');
  const now = input.now ?? new Date();
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    scenarioId: scenario.id,
    mode: input.mode,
    status: 'ACTIVE',
    createdAt: now.toISOString(),
    stage: 0,
    currentTurn: input.mode === 'OPERATOR_VS_OPERATOR' ? 'RED' : null,
    redScore: 0,
    blueScore: 0,
    events: [],
    objectives: [
      { id: 'red-progress', label: 'Reveal all 4 synthetic stages (10 points per stage)', team: 'RED', points: 40, complete: false },
      { id: 'blue-triage', label: 'Identify and explain the anomaly', team: 'BLUE', points: 20, complete: false },
      { id: 'blue-detection', label: 'Submit a detection condition tied to telemetry', team: 'BLUE', points: 15, complete: false },
      { id: 'blue-contain', label: 'Record a justified containment decision', team: 'BLUE', points: 15, complete: false },
      { id: 'blue-recover', label: 'Validate recovery evidence', team: 'BLUE', points: 15, complete: false },
    ],
    notes: ['Synthetic range only. No live targets, payloads, network scans, or external actions are available.'],
  };
}

function matchesAny(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

export function performRangeAction(session: RangeSession, action: RangeAction, note?: string, now = new Date()): RangeSession {
  if (session.status !== 'ACTIVE') throw new Error('Session is not active');
  if (session.notes.length >= 100) throw new Error('Session note limit reached.');
  const next: RangeSession = {
    ...session,
    events: [...session.events],
    objectives: session.objectives.map((objective) => ({ ...objective })),
    notes: [...session.notes],
  };
  const objective = (id: string) => next.objectives.find((item) => item.id === id)!;
  if (session.mode === 'OPERATOR_VS_OPERATOR') {
    if (action === 'ADVANCE_SCENARIO' && session.currentTurn !== 'RED') {
      throw new Error('Red must wait until Blue ends the turn.');
    }
    if (['INVESTIGATE', 'CONTAIN', 'SUBMIT_DETECTION'].includes(action) && session.currentTurn !== 'BLUE') {
      throw new Error('Blue actions are only allowed during the Blue turn.');
    }
    if (action === 'END_TURN' && session.currentTurn !== 'BLUE') {
      throw new Error('Only Blue can end the active Blue turn.');
    }
  }
  const award = (id: string) => {
    const item = objective(id);
    if (!item.complete) {
      item.complete = true;
      if (item.team === 'RED') next.redScore += item.points;
      else next.blueScore += item.points;
    }
  };

  if (action === 'ADVANCE_SCENARIO') {
    const scenario = SCENARIOS.find((item) => item.id === next.scenarioId)!;
    if (next.stage >= scenario.stages.length) throw new Error('Scenario has no remaining stages');
    const stage = scenario.stages[next.stage];
    next.events.unshift({
      id: crypto.randomUUID(),
      timestamp: now.toISOString(),
      source: stage.source,
      severity: stage.severity,
      title: stage.title,
      detail: stage.detail,
      clue: stage.clue,
      stage: next.stage + 1,
    });
    next.stage += 1;
    if (next.mode === 'OPERATOR_VS_OPERATOR') next.currentTurn = 'BLUE';
    next.redScore += 10;
    if (next.stage === scenario.stages.length) objective('red-progress').complete = true;
    // Keep the session open for investigation and recovery validation after the last event.
  } else if (action === 'INVESTIGATE') {
    if (!note?.trim()) throw new Error('Investigation requires a written finding');
    const finding = note.trim().slice(0, 500);
    if (!matchesAny(finding, ['correlat', 'baseline', 'anomal', 'timestamp', 'identity', 'endpoint', 'resolver', 'inventory', 'event', 'alert', 'client'])) {
      throw new Error('Finding must cite an observable clue, source, baseline, or correlation.');
    }
    next.notes.push(`BLUE INVESTIGATION: ${finding}`);
    if (next.events.some((event) => event.severity === 'MEDIUM' || event.severity === 'HIGH')) award('blue-triage');
    const scenario = SCENARIOS.find((item) => item.id === next.scenarioId)!;
    if (next.stage === scenario.stages.length && matchesAny(finding, ['reset', 'recover', 'clean', 'follow-up', 'correction', 'restored', 'triage result'])) award('blue-recover');
  } else if (action === 'CONTAIN') {
    if (!note?.trim()) throw new Error('Containment requires a justification');
    const rationale = note.trim().slice(0, 500);
    if (!matchesAny(rationale, ['isolate', 'contain', 'disable', 'quarantine', 'block', 'segment', 'restrict', 'reset'])) {
      throw new Error('Containment rationale must name a concrete defensive action.');
    }
    next.notes.push(`BLUE CONTAINMENT DECISION: ${rationale}`);
    if (next.events.some((event) => event.severity === 'HIGH')) award('blue-contain');
  } else if (action === 'SUBMIT_DETECTION') {
    if (!note?.trim()) throw new Error('Detection submission requires a rule or detection rationale');
    const detection = note.trim().slice(0, 500);
    if (!matchesAny(detection, ['detect', 'condition', 'match', 'event id', 'eventid', 'threshold', 'sigma', 'alert', 'when', 'source'])) {
      throw new Error('Detection submission must describe a match condition, source, threshold, or detection rule.');
    }
    next.notes.push(`BLUE DETECTION SUBMISSION: ${detection}`);
    if (next.events.some((event) => event.severity === 'MEDIUM' || event.severity === 'HIGH')) award('blue-detection');
  } else if (action === 'END_TURN') {
    if (next.mode !== 'OPERATOR_VS_OPERATOR' || next.currentTurn !== 'BLUE') {
      throw new Error('End turn is only available during an operator-vs-operator Blue turn.');
    }
    next.currentTurn = 'RED';
    next.notes.push('Blue turn ended. Red may advance the next scenario stage.');
  } else if (action === 'FINISH') {
    const scenario = SCENARIOS.find((item) => item.id === next.scenarioId)!;
    if (next.stage < scenario.stages.length) throw new Error('Reveal all scenario stages before finishing');
    if (next.mode === 'OPERATOR_VS_OPERATOR' && next.currentTurn === 'BLUE') throw new Error('Blue must end the current turn before finishing');
    next.status = 'COMPLETED';
    next.notes.push('Session completed by the operator. Review the scorecard and evidence during debrief.');
  }
  return next;
}

export function abortRangeSession(session: RangeSession): RangeSession {
  if (session.status !== 'ACTIVE') throw new Error('Only active sessions can be aborted');
  return { ...session, status: 'ABORTED', notes: [...session.notes, 'Session aborted by an operator.'] };
}
