import { describe, expect, it } from 'vitest';
import { evaluateOutcome } from './evaluate-outcome';
import type { OutcomeEvaluation, OutcomeEvaluationInput } from './types';

const SESSION_DATE = new Date('2026-07-10T08:00:00.000Z');
const NOW = new Date('2026-07-13T12:00:00.000Z'); // ~76h later — window has elapsed

function baseInput(overrides: Partial<OutcomeEvaluationInput> = {}): OutcomeEvaluationInput {
  return {
    sessionDate: SESSION_DATE,
    now: NOW,
    plannedFields: { durationMin: 60, load: 50 },
    linkedActivity: null,
    sessionAnalysis: null,
    conditionObservations: [],
    recoverySnapshots: [],
    ...overrides,
  };
}

const FULL_RECOVERY_WINDOW = [
  { readiness: 70, fatigueIndex: 40 },
  { readiness: 65, fatigueIndex: 45 },
  { readiness: 72, fatigueIndex: 38 },
];

describe('evaluateOutcome', () => {
  it('is INCONCLUSIVE when there is no linked activity and no recovery-window data', () => {
    const result = evaluateOutcome(baseInput());

    expect(result.outcomeStatus).toBe('INCONCLUSIVE');
    expect(result.executionMatch).toBeNull();
    expect(result.shortTermRecoveryResponse).toBeNull();
    expect(result.confidence).toBe(0);
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it('is EVALUATED when an activity is linked, even with no recovery-window data', () => {
    const result = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 3600, load: 55, rpe: 6, feeling: 'good' },
      }),
    );

    expect(result.outcomeStatus).toBe('EVALUATED');
    expect(result.executionMatch).not.toBeNull();
    expect(result.shortTermRecoveryResponse).toBeNull();
    expect(result.limitations.some((l) => l.includes('recovery window'))).toBe(true);
  });

  it('is EVALUATED when recovery-window data exists, even with no linked activity', () => {
    const result = evaluateOutcome(baseInput({ recoverySnapshots: FULL_RECOVERY_WINDOW }));

    expect(result.outcomeStatus).toBe('EVALUATED');
    expect(result.executionMatch).toBeNull();
    expect(result.shortTermRecoveryResponse).not.toBeNull();
    expect(result.shortTermRecoveryResponse?.daysObserved).toBe(3);
  });

  it('omits the recovery-window field when fewer than 2 of 3 days have data', () => {
    const result = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 3600, load: 55, rpe: 6, feeling: 'good' },
        recoverySnapshots: [
          { readiness: 70, fatigueIndex: 40 },
          { readiness: null, fatigueIndex: null },
          { readiness: null, fatigueIndex: null },
        ],
      }),
    );

    expect(result.shortTermRecoveryResponse).toBeNull();
    expect(result.limitations.some((l) => l.includes('1/3'))).toBe(true);
  });

  it('includes the recovery-window field when exactly 2 of 3 days have data', () => {
    const result = evaluateOutcome(
      baseInput({
        recoverySnapshots: [
          { readiness: 70, fatigueIndex: 40 },
          { readiness: 65, fatigueIndex: null },
          { readiness: null, fatigueIndex: null },
        ],
      }),
    );

    expect(result.shortTermRecoveryResponse?.daysObserved).toBe(2);
    expect(result.outcomeStatus).toBe('EVALUATED');
  });

  it('reuses the existing SessionAnalysis (verdict/complianceScore) verbatim, not recomputed', () => {
    const result = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 3700, load: 58, rpe: 7, feeling: 'tired' },
        sessionAnalysis: {
          complianceScore: 82,
          verdict: 'HARDER',
          summary: 'Harder than planned.',
          remarks: [],
          recommendation: 'Ease off next time.',
        },
      }),
    );

    expect(result.executionMatch?.verdict).toBe('HARDER');
    expect(result.executionMatch?.complianceScore).toBe(82);
  });

  it('reports EVALUATED with both a good execution match and a new safety signal — conflicting-but-present evidence is not INCONCLUSIVE', () => {
    const result = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 3600, load: 50, rpe: 5, feeling: 'good' },
        sessionAnalysis: {
          complianceScore: 95,
          verdict: 'AS_PLANNED',
          summary: 'As planned.',
          remarks: [],
          recommendation: 'Keep it up.',
        },
        conditionObservations: [
          {
            observedAt: new Date('2026-07-11T09:00:00Z'),
            symptomPresent: true,
            severityReported: 3,
            comment: 'Knee twinge',
          },
        ],
      }),
    );

    expect(result.outcomeStatus).toBe('EVALUATED');
    expect(result.executionMatch?.complianceScore).toBe(95);
    expect(result.safetySignal?.newOrWorseningSymptomCount).toBe(1);
    expect(result.limitations.length).toBeGreaterThan(0); // tension is noted, not hidden
  });

  it('reports zero new symptoms (not null) when observations exist but none are symptomatic', () => {
    const result = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 3600, load: 50, rpe: 5, feeling: 'good' },
        conditionObservations: [
          {
            observedAt: new Date('2026-07-11T09:00:00Z'),
            symptomPresent: false,
            severityReported: null,
            comment: null,
          },
        ],
      }),
    );

    expect(result.safetySignal).not.toBeNull();
    expect(result.safetySignal?.newOrWorseningSymptomCount).toBe(0);
  });

  it('always states the AthleteSnapshotRecord-upsert limitation, even on a fully-evidenced EVALUATED outcome', () => {
    const result = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 3600, load: 50, rpe: 5, feeling: 'good' },
        recoverySnapshots: FULL_RECOVERY_WINDOW,
        conditionObservations: [
          {
            observedAt: new Date('2026-07-11T09:00:00Z'),
            symptomPresent: false,
            severityReported: null,
            comment: null,
          },
        ],
      }),
    );

    expect(result.limitations.some((l) => l.includes('upserted'))).toBe(true);
  });

  it('caps confidence at 1 and scales with the number of evidence categories present', () => {
    const oneCategory = evaluateOutcome(
      baseInput({ linkedActivity: { duration: 3600, load: 50, rpe: null, feeling: null } }),
    );
    const allCategories = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 3600, load: 50, rpe: 6, feeling: 'good' },
        recoverySnapshots: FULL_RECOVERY_WINDOW,
        conditionObservations: [
          {
            observedAt: new Date('2026-07-11T09:00:00Z'),
            symptomPresent: false,
            severityReported: null,
            comment: null,
          },
        ],
      }),
    );

    expect(oneCategory.confidence).toBeGreaterThan(0);
    expect(oneCategory.confidence).toBeLessThan(allCategories.confidence);
    expect(allCategories.confidence).toBeLessThanOrEqual(1);
  });

  it('has no success/quality field on its output type — only structured evidence, limitations, and confidence', () => {
    const result: OutcomeEvaluation = evaluateOutcome(
      baseInput({ recoverySnapshots: FULL_RECOVERY_WINDOW }),
    );
    const keys = Object.keys(result);

    expect(keys).not.toContain('success');
    expect(keys).not.toContain('quality');
    expect(keys.sort()).toEqual(
      [
        'outcomeStatus',
        'executionMatch',
        'subjectiveResponse',
        'shortTermRecoveryResponse',
        'safetySignal',
        'limitations',
        'confidence',
      ].sort(),
    );
  });

  it('never infers success from athlete compliance alone — a deliberate deviation with good recovery is representable as EVALUATED, not penalized', () => {
    // Athlete deliberately did something different from plan (poor execution match)
    // but recovery response was strong — the type has no field that collapses this
    // into a single "bad because non-compliant" verdict.
    const result = evaluateOutcome(
      baseInput({
        linkedActivity: { duration: 1800, load: 20, rpe: 3, feeling: 'easy' }, // much shorter/easier than planned
        sessionAnalysis: {
          complianceScore: 20,
          verdict: 'SHORTER',
          summary: 'Much shorter than planned.',
          remarks: [],
          recommendation: 'n/a',
        },
        recoverySnapshots: FULL_RECOVERY_WINDOW, // strong recovery afterward
      }),
    );

    expect(result.outcomeStatus).toBe('EVALUATED');
    expect(result.executionMatch?.complianceScore).toBe(20);
    expect(result.shortTermRecoveryResponse).not.toBeNull();
    // Both facts are present side by side — the evaluator does not resolve them into a verdict.
  });
});
