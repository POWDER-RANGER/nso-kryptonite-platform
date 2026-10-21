import { describe, expect, it } from 'vitest';
import { abortRangeSession, createRangeSession, evaluateDetectionRule, listScenarios, performRangeAction } from '../engine/scenario/simulator';

describe('safe range simulator', () => {
  it('lists only built-in synthetic scenarios', () => {
    expect(listScenarios()).toHaveLength(3);
    expect(listScenarios().every((item) => item.source === 'BUILT_IN_SYNTHETIC')).toBe(true);
  });

  it('rejects unknown scenarios', () => {
    expect(() => createRangeSession({ name: 'test', scenarioId: 'unknown', mode: 'TRAINING' })).toThrow('Unknown scenario');
  });

  it('emits synthetic events and scores each Red stage', () => {
    const session = createRangeSession({ name: 'test', scenarioId: 'identity-anomaly', mode: 'OPERATOR_VS_OPERATOR' });
    const first = performRangeAction(session, 'ADVANCE_SCENARIO');
    expect(() => performRangeAction(first, 'ADVANCE_SCENARIO')).toThrow('Red must wait');
    const redTurn = performRangeAction(first, 'END_TURN');
    const second = performRangeAction(redTurn, 'ADVANCE_SCENARIO');
    expect(first.events[0].detail).toContain('Synthetic');
    expect(first.redScore).toBe(10);
    expect(second.redScore).toBe(20);
    expect(second.stage).toBe(2);
    expect(second.currentTurn).toBe('BLUE');
  });

  it('enforces Red then Blue turns without treating training as multiplayer', () => {
    let session = createRangeSession({ name: 'turn test', scenarioId: 'identity-anomaly', mode: 'OPERATOR_VS_OPERATOR' });
    expect(session.currentTurn).toBe('RED');
    expect(() => performRangeAction(session, 'INVESTIGATE', 'Correlated identity events.')).toThrow('Blue actions are only allowed');
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    expect(session.currentTurn).toBe('BLUE');
    expect(() => performRangeAction(session, 'ADVANCE_SCENARIO')).toThrow('Red must wait');
    session = performRangeAction(session, 'INVESTIGATE', 'Baseline event is within expected identity behavior.');
    session = performRangeAction(session, 'END_TURN');
    expect(session.currentTurn).toBe('RED');
    expect(() => performRangeAction(session, 'INVESTIGATE', 'Correlated events.')).toThrow('Blue actions are only allowed');

    const training = createRangeSession({ name: 'solo test', scenarioId: 'identity-anomaly', mode: 'TRAINING' });
    expect(training.currentTurn).toBeNull();
    expect(performRangeAction(training, 'ADVANCE_SCENARIO').currentTurn).toBeNull();
  });

  it('requires all Blue turns to be handed back before finishing competition', () => {
    let session = createRangeSession({ name: 'finish turn test', scenarioId: 'identity-anomaly', mode: 'OPERATOR_VS_OPERATOR' });
    for (let stage = 0; stage < 4; stage += 1) {
      session = performRangeAction(session, 'ADVANCE_SCENARIO');
      expect(session.currentTurn).toBe('BLUE');
      if (stage === 3) expect(() => performRangeAction(session, 'FINISH')).toThrow('Blue must end the current turn');
      session = performRangeAction(session, 'END_TURN');
    }
    session = performRangeAction(session, 'FINISH');
    expect(session.status).toBe('COMPLETED');
  });

  it('scores defensive investigation and requires rationale', () => {
    let session = createRangeSession({ name: 'test', scenarioId: 'identity-anomaly', mode: 'TRAINING' });
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    expect(() => performRangeAction(session, 'INVESTIGATE')).toThrow('written finding');
    expect(() => performRangeAction(session, 'INVESTIGATE', 'Looks fine.')).toThrow('observable clue');
    session = performRangeAction(session, 'INVESTIGATE', 'Correlated identity events with the endpoint alert.');
    expect(session.blueScore).toBe(20);
  });

  it('scores a detection submission separately from triage', () => {
    let session = createRangeSession({ name: 'test', scenarioId: 'identity-anomaly', mode: 'TRAINING' });
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    session = performRangeAction(session, 'INVESTIGATE', 'Correlated identity events with the endpoint alert.');
    expect(() => performRangeAction(session, 'SUBMIT_DETECTION', 'Looks suspicious.')).toThrow('match condition');
    session = performRangeAction(session, 'SUBMIT_DETECTION', 'Sigma detection: when source is Windows and event ID matches baseline anomaly, create alert.');
    expect(session.blueScore).toBe(35);
    expect(session.objectives.find((item) => item.id === 'blue-detection')?.complete).toBe(true);
  });

  it('evaluates simple detection rules against labeled synthetic stages', () => {
    const passing = evaluateDetectionRule(
      'identity-anomaly',
      'source=WINDOWS,EDR;severity=MEDIUM,HIGH',
      new Date('2026-01-01T00:00:00.000Z'),
    );
    expect(passing.passed).toBe(true);
    expect(passing.matchedStages).toEqual([2, 3]);
    expect(passing.truePositives).toBe(2);
    expect(passing.falsePositives).toBe(0);
    expect(passing.falseNegatives).toBe(0);
    expect(passing.precision).toBe(1);
    expect(passing.recall).toBe(1);

    const tooBroad = evaluateDetectionRule('identity-anomaly', 'source=WINDOWS;severity=INFO,MEDIUM');
    expect(tooBroad.passed).toBe(false);
    expect(tooBroad.falsePositives).toBe(1);
    expect(tooBroad.falseNegatives).toBe(1);

    const malformed = evaluateDetectionRule('identity-anomaly', 'process=unknown');
    expect(malformed.passed).toBe(false);
    expect(malformed.error).toContain('Use source');
  });

  it('lets a testing-mode operator score a passing rule and finish without revealing event stages', () => {
    let session = createRangeSession({ name: 'Detection test', scenarioId: 'identity-anomaly', mode: 'TESTING' });
    expect(session.stage).toBe(0);
    expect(() => performRangeAction(session, 'FINISH')).toThrow('at least one detection test');
    session = performRangeAction(session, 'SUBMIT_DETECTION', 'source=WINDOWS,EDR;severity=MEDIUM,HIGH');
    expect(session.detectionTests[0].passed).toBe(true);
    expect(session.blueScore).toBe(15);
    expect(session.stage).toBe(0);
    session = performRangeAction(session, 'FINISH');
    expect(session.status).toBe('COMPLETED');
  });

  it('allows post-scenario recovery validation before finishing', () => {
    let session = createRangeSession({ name: 'test', scenarioId: 'identity-anomaly', mode: 'TRAINING' });
    for (let i = 0; i < 4; i += 1) session = performRangeAction(session, 'ADVANCE_SCENARIO');
    expect(session.status).toBe('ACTIVE');
    session = performRangeAction(session, 'INVESTIGATE', 'Verified reset event and clean follow-up sign-in.');
    expect(session.blueScore).toBe(35);
    session = performRangeAction(session, 'FINISH');
    expect(session.status).toBe('COMPLETED');
    expect(() => performRangeAction(session, 'ADVANCE_SCENARIO')).toThrow('not active');
  });

  it('requires justified containment and closes terminal sessions', () => {
    let session = createRangeSession({ name: 'test', scenarioId: 'identity-anomaly', mode: 'TRAINING' });
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    expect(() => performRangeAction(session, 'CONTAIN', 'I will look into this.')).toThrow('concrete defensive action');
    session = performRangeAction(session, 'CONTAIN', 'Isolate the synthetic training host pending validation.');
    expect(session.blueScore).toBe(15);
    session = abortRangeSession(session);
    expect(session.status).toBe('ABORTED');
    expect(() => performRangeAction(session, 'ADVANCE_SCENARIO')).toThrow('not active');
  });
});
