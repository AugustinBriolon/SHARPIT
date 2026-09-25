import { describe, expect, it } from 'vitest';
import { buildLearningFeedback } from './learning-feedback';
import type { OutcomeEvaluation } from './types';

function evaluatedOutcome(overrides: Partial<OutcomeEvaluation> = {}): OutcomeEvaluation {
  return {
    outcomeStatus: 'EVALUATED',
    executionMatch: null,
    subjectiveResponse: null,
    shortTermRecoveryResponse: null,
    safetySignal: null,
    limitations: [],
    confidence: 0.5,
    ...overrides,
  };
}

function harderOutcome(): OutcomeEvaluation {
  return evaluatedOutcome({
    executionMatch: {
      plannedDurationMin: 60,
      actualDurationSec: 4200,
      plannedLoad: 50,
      actualLoad: 70,
      verdict: 'HARDER',
      complianceScore: 40,
    },
  });
}

function stableRecoveryOutcome(): OutcomeEvaluation {
  return evaluatedOutcome({
    shortTermRecoveryResponse: {
      daysObserved: 3,
      readinessValues: [70, 72, 74],
      fatigueIndexValues: [40, 38, 35],
    },
  });
}

describe('buildLearningFeedback', () => {
  it('returns nothing when there is no outcome history at all', () => {
    expect(buildLearningFeedback([])).toEqual([]);
  });

  it('returns a single INSUFFICIENT_EVIDENCE item when history exists but no category crosses the threshold', () => {
    const outcomes = [
      { outcome: harderOutcome(), type: 'RUN' as const, intensity: 'THRESHOLD' as const },
    ];
    const result = buildLearningFeedback(outcomes);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('emits REPEATED_HARDER_THAN_PLANNED once a category has >=3 evaluated samples with low compliance and modal HARDER verdict', () => {
    const outcomes = Array.from({ length: 3 }, () => ({
      outcome: harderOutcome(),
      type: 'RUN' as const,
      intensity: 'THRESHOLD' as const,
    }));
    const result = buildLearningFeedback(outcomes);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: 'REPEATED_HARDER_THAN_PLANNED',
      type: 'RUN',
      intensity: 'THRESHOLD',
      sampleCount: 3,
    });
  });

  it('emits RECOVERED_WITHIN_EXPECTED_WINDOW once a category has >=3 stable/positive recovery samples', () => {
    const outcomes = Array.from({ length: 3 }, () => ({
      outcome: stableRecoveryOutcome(),
      type: 'BIKE' as const,
      intensity: 'ENDURANCE' as const,
    }));
    const result = buildLearningFeedback(outcomes);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'RECOVERED_WITHIN_EXPECTED_WINDOW', sampleCount: 3 });
  });

  it('never emits a category sentence with fewer than 3 samples', () => {
    const outcomes = Array.from({ length: 2 }, () => ({
      outcome: harderOutcome(),
      type: 'RUN' as const,
      intensity: 'THRESHOLD' as const,
    }));
    const result = buildLearningFeedback(outcomes);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('does not duplicate the insufficient-evidence line per category — exactly one', () => {
    const outcomes = [
      { outcome: harderOutcome(), type: 'RUN' as const, intensity: 'THRESHOLD' as const },
      { outcome: stableRecoveryOutcome(), type: 'BIKE' as const, intensity: 'ENDURANCE' as const },
    ];
    const result = buildLearningFeedback(outcomes);
    expect(result.filter((r) => r.kind === 'INSUFFICIENT_EVIDENCE')).toHaveLength(1);
  });

  it('handles multiple categories independently once both cross the threshold', () => {
    const outcomes = [
      ...Array.from({ length: 3 }, () => ({
        outcome: harderOutcome(),
        type: 'RUN' as const,
        intensity: 'THRESHOLD' as const,
      })),
      ...Array.from({ length: 3 }, () => ({
        outcome: stableRecoveryOutcome(),
        type: 'BIKE' as const,
        intensity: 'ENDURANCE' as const,
      })),
    ];
    const result = buildLearningFeedback(outcomes);
    expect(result).toHaveLength(2);
    const kinds = result.map((r) => r.kind).sort();
    expect(kinds).toEqual(['RECOVERED_WITHIN_EXPECTED_WINDOW', 'REPEATED_HARDER_THAN_PLANNED']);
  });
});
