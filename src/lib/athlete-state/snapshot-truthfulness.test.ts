import { describe, expect, it } from 'vitest';
import {
  isAdviceActionable,
  MIN_ADVICE_CONFIDENCE,
  applyTruthfulnessOverlay,
} from '@/lib/athlete-state/snapshot-truthfulness';
import { mockDailyPhase, mockPhaseNarrative } from '@/lib/daily-phase/test-fixtures';
import type { ReasoningData } from '@/hooks/use-today';

function reasoning(partial: Partial<ReasoningData>): ReasoningData {
  return {
    overallVerdict: 'TRAIN_SMART',
    systemAttentionPriority: 'BALANCED',
    physiologicalConsistency: 'ALIGNED',
    consistencyScore: 0.8,
    confidence: 0.7,
    dataCompleteness: 'PARTIAL',
    keyFindings: [],
    limitingFactor: { system: 'RECOVERY', description: null, actionable: false },
    topAction: {
      verbCode: 'reasoning.topAction.trainSmart.verb',
      focusCode: 'reasoning.topAction.trainSmart.focus',
      rationaleCode: 'reasoning.topAction.trainSmart.rationale',
      expectedBenefit: 0.5,
    },
    opportunities: [],
    conflicts: [],
    evidenceGraph: null,
    signals: {
      availableModelCount: 3,
      hasRecoveryState: true,
      hasFatigueState: true,
      hasAdaptationState: true,
    },
    computedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('snapshot-truthfulness', () => {
  it('blocks advice below minimum confidence', () => {
    expect(isAdviceActionable(reasoning({ confidence: MIN_ADVICE_CONFIDENCE - 0.1 }), 0.5)).toBe(
      false,
    );
  });

  it('blocks INSUFFICIENT_DATA verdict', () => {
    expect(
      isAdviceActionable(reasoning({ overallVerdict: 'INSUFFICIENT_DATA', topAction: null }), 0.8),
    ).toBe(false);
  });

  it('nulls recommendation when not actionable', () => {
    const overlay = applyTruthfulnessOverlay({
      snapshotId: 'x',
      athleteId: 'default',
      trainingDayId: '2026-07-07',
      generatedAt: new Date().toISOString(),
      freshness: {
        athleteId: 'default',
        trainingDayId: '2026-07-07',
        computedAt: new Date().toISOString(),
        domains: [],
        providers: [],
        overallFresh: false,
        primaryProductMessage: null,
      },
      recovery: null,
      fatigue: null,
      adaptation: null,
      dailyStrain: null,
      reasoning: reasoning({ overallVerdict: 'INSUFFICIENT_DATA', topAction: null }),
      readiness: null,
      todaysDecision: 'INSUFFICIENT_DATA',
      limitingFactor: null,
      confidence: 0.2,
      briefing: null,
      recommendation: { type: 'x', keyEvidence: [] },
      primaryProductMessage: null,
      domainMessages: {},
      dailyPhase: mockDailyPhase(),
      phaseNarrative: mockPhaseNarrative(),
    });

    expect(overlay.adviceActionable).toBe(false);
    expect(overlay.recommendation).toBeNull();
    expect(overlay.todaysDecision).toBeNull();
    expect(overlay.insufficientDataMessage).toBeTruthy();
  });
});
