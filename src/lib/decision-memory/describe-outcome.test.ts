import { describe, expect, it } from 'vitest';
import { describeOutcome } from './describe-outcome';
import type { OutcomeEvaluation } from './types';

const COMPLIANCE_WORDS = ['bien exécuté', 'bien exécutée', 'respecté', 'respectée', 'correctement'];

function baseEvaluation(overrides: Partial<OutcomeEvaluation> = {}): OutcomeEvaluation {
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

describe('describeOutcome', () => {
  it('always states INCONCLUSIVE explicitly, never silently', () => {
    const lines = describeOutcome(baseEvaluation({ outcomeStatus: 'INCONCLUSIVE', confidence: 0 }));
    expect(lines).toEqual(['Preuves encore insuffisantes pour conclure.']);
  });

  it('describes planned vs. actual duration and load as facts, not a verdict', () => {
    const lines = describeOutcome(
      baseEvaluation({
        executionMatch: {
          plannedDurationMin: 60,
          actualDurationSec: 3720,
          plannedLoad: 50,
          actualLoad: 58,
          verdict: 'HARDER',
          complianceScore: 70,
        },
      }),
    );
    expect(lines[0]).toContain('62 min réalisées (60 min prévues)');
    expect(lines[0]).toContain('58 TSS réalisés (50 TSS prévus)');
    expect(lines[0]).toContain('Plus dur que prévu');
  });

  it('never emits a compliance-derived verdict word', () => {
    const lines = describeOutcome(
      baseEvaluation({
        executionMatch: {
          plannedDurationMin: 60,
          actualDurationSec: 3600,
          plannedLoad: 50,
          actualLoad: 50,
          verdict: 'AS_PLANNED',
          complianceScore: 100,
        },
        shortTermRecoveryResponse: {
          daysObserved: 3,
          readinessValues: [70, 72, 74],
          fatigueIndexValues: [40, 38, 35],
        },
      }),
    );
    const joined = lines.join(' ').toLowerCase();
    for (const word of COMPLIANCE_WORDS) {
      expect(joined).not.toContain(word);
    }
  });

  it('describes recovery trajectory direction from readiness values', () => {
    const rising = describeOutcome(
      baseEvaluation({
        shortTermRecoveryResponse: {
          daysObserved: 2,
          readinessValues: [60, 75],
          fatigueIndexValues: [null, null],
        },
      }),
    );
    expect(rising[0]).toContain('hausse');

    const falling = describeOutcome(
      baseEvaluation({
        shortTermRecoveryResponse: {
          daysObserved: 2,
          readinessValues: [75, 60],
          fatigueIndexValues: [null, null],
        },
      }),
    );
    expect(falling[0]).toContain('baisse');

    const stable = describeOutcome(
      baseEvaluation({
        shortTermRecoveryResponse: {
          daysObserved: 2,
          readinessValues: [70, 71],
          fatigueIndexValues: [null, null],
        },
      }),
    );
    expect(stable[0]).toContain('stable');
  });

  it('mentions safety signal only when new/worsening symptom count is above zero', () => {
    const withSymptom = describeOutcome(
      baseEvaluation({
        executionMatch: {
          plannedDurationMin: 60,
          actualDurationSec: 3600,
          plannedLoad: 50,
          actualLoad: 50,
          verdict: 'AS_PLANNED',
          complianceScore: 100,
        },
        safetySignal: { newOrWorseningSymptomCount: 1, observations: [] },
      }),
    );
    expect(withSymptom.some((l) => l.includes('1 signal physique'))).toBe(true);

    const withoutSymptom = describeOutcome(
      baseEvaluation({
        executionMatch: {
          plannedDurationMin: 60,
          actualDurationSec: 3600,
          plannedLoad: 50,
          actualLoad: 50,
          verdict: 'AS_PLANNED',
          complianceScore: 100,
        },
        safetySignal: { newOrWorseningSymptomCount: 0, observations: [] },
      }),
    );
    expect(withoutSymptom.some((l) => l.includes('signal physique'))).toBe(false);
  });

  it('renders conflicting-but-present evidence side by side, not collapsed into one verdict', () => {
    const lines = describeOutcome(
      baseEvaluation({
        executionMatch: {
          plannedDurationMin: 60,
          actualDurationSec: 1800,
          plannedLoad: 50,
          actualLoad: 20,
          verdict: 'SHORTER',
          complianceScore: 20,
        },
        shortTermRecoveryResponse: {
          daysObserved: 3,
          readinessValues: [70, 78, 80],
          fatigueIndexValues: [40, 38, 35],
        },
      }),
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('Plus court');
    expect(lines[1]).toContain('hausse');
  });
});
