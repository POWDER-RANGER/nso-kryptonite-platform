import { describe, expect, it } from 'vitest';
import { abortRangeSession, createRangeSession, listScenarios, performRangeAction } from '../engine/scenario/simulator';

describe('safe range simulator', () => {
  it('lists only built-in synthetic scenarios', () => {
    expect(listScenarios()).toHaveLength(3);
    expect(listScenarios().every((item) => item.source === 'BUILT_IN_SYNTHETIC')).toBe(true);
  });

  it('rejects unknown scenarios', () => {
    expect(() => createRangeSession({ name: 'test', scenarioId: 'unknown', mode: 'TRAINING' })).toThrow('Unknown scenario');
  });

  it('emits a synthetic event and awards the red objective once', () => {
    const session = createRangeSession({ name: 'test', scenarioId: 'identity-anomaly', mode: 'OPERATOR_VS_OPERATOR' });
    const first = performRangeAction(session, 'ADVANCE_SCENARIO');
    const second = performRangeAction(first, 'ADVANCE_SCENARIO');
    expect(first.events[0].detail).toContain('Synthetic');
    expect(first.redScore).toBe(10);
    expect(second.redScore).toBe(20);
    expect(second.stage).toBe(2);
  });

  it('scores defensive investigation and requires rationale', () => {
    let session = createRangeSession({ name: 'test', scenarioId: 'identity-anomaly', mode: 'TRAINING' });
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    session = performRangeAction(session, 'ADVANCE_SCENARIO');
    expect(() => performRangeAction(session, 'INVESTIGATE')).toThrow('written finding');
    session = performRangeAction(session, 'INVESTIGATE', 'Correlated identity events with the endpoint alert.');
    expect(session.blueScore).toBe(20);
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
    session = performRangeAction(session, 'CONTAIN', 'Isolate the synthetic training host pending validation.');
    expect(session.blueScore).toBe(15);
    session = abortRangeSession(session);
    expect(session.status).toBe('ABORTED');
    expect(() => performRangeAction(session, 'ADVANCE_SCENARIO')).toThrow('not active');
  });
});
