import { describe, expect, it } from 'vitest';
import {
  MIN_ADVICE_CONFIDENCE,
  applyTruthfulnessOverlay,
} from '@/lib/athlete-state/snapshot-truthfulness';
import { isAdviceActionableFromDecision } from '@/lib/decision/projection';
import { mockDailyPhase, mockPhaseNarrative } from '@/lib/daily-phase/test-fixtures';
import type { DecisionData } from '@/hooks/use-today';

function decision(partial: Partial<DecisionData>): DecisionData {
  return {
    primaryDecision: {
      verdict: 'TRAIN_SMART',
      headlineCode: 'decision.headline.trainSmart',
      verbCode: 'reasoning.topAction.trainSmart.verb',
      focusCode: 'reasoning.topAction.trainSmart.focus',
      rationaleCode: 'reasoning.topAction.trainSmart.rationale',
      expectedBenefit: 0.5,
    },
    limitingFactor: {
      domain: 'RECOVERY',
      system: 'RECOVERY',
      description: null,
      actionable: false,
      priority: 1,
    },
    supportingEvidence: [],
    suppressedEvidence: [],
    confidence: 0.7,
    confidenceTier: 'MEDIUM',
    dataCompleteness: 'PARTIAL',
    conflicts: [],
    priority: {
      attentionDomain: 'BALANCED',
      safetyOverrideApplied: false,
      confidenceGated: false,
    },
    explanationOrder: [],
    overallVerdict: 'TRAIN_SMART',
    systemAttentionPriority: 'BALANCED',
    physiologicalConsistency: 'ALIGNED',
    consistencyScore: 80,
    opportunities: [],
    topAction: {
      verbCode: 'reasoning.topAction.trainSmart.verb',
      focusCode: 'reasoning.topAction.trainSmart.focus',
      rationaleCode: 'reasoning.topAction.trainSmart.rationale',
      expectedBenefit: 0.5,
    },
    evidenceGraph: {
      recoveryContribution: 1,
      fatigueContribution: 1,
      adaptationContribution: 1,
    },
    modelId: 'decision-v1',
    computedAt: new Date().toISOString(),
    trainingDayId: '2026-07-07',
    ...partial,
  };
}

describe('snapshot-truthfulness', () => {
  it('blocks advice below minimum confidence', () => {
    expect(
      isAdviceActionableFromDecision(
        decision({
          confidence: MIN_ADVICE_CONFIDENCE - 0.1,
          priority: {
            attentionDomain: 'BALANCED',
            safetyOverrideApplied: false,
            confidenceGated: true,
          },
        }),
      ),
    ).toBe(false);
  });

  it('blocks INSUFFICIENT_DATA verdict', () => {
    expect(
      isAdviceActionableFromDecision(
        decision({
          primaryDecision: {
            verdict: 'INSUFFICIENT_DATA',
            headlineCode: 'decision.headline.insufficient',
            verbCode: 'x',
            focusCode: 'x',
            rationaleCode: 'x',
            expectedBenefit: 0,
          },
          overallVerdict: 'INSUFFICIENT_DATA',
          topAction: null,
        }),
      ),
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
      physicalHealth: null,
      environment: null,
      decision: decision({
        primaryDecision: {
          verdict: 'INSUFFICIENT_DATA',
          headlineCode: 'decision.headline.insufficient',
          verbCode: 'x',
          focusCode: 'x',
          rationaleCode: 'x',
          expectedBenefit: 0,
        },
        overallVerdict: 'INSUFFICIENT_DATA',
        topAction: null,
        confidence: 0.2,
        priority: {
          attentionDomain: 'BALANCED',
          safetyOverrideApplied: false,
          confidenceGated: true,
        },
      }),
      dailyStrain: null,
      reasoning: null,
      readiness: null,
      sleepScore: null,
      adaptationIndex: null,
      adaptationStatus: null,
      adaptationTrend: null,
      todaysDecision: 'INSUFFICIENT_DATA',
      limitingFactor: null,
      confidence: 0.2,
      briefing: null,
      recommendation: { type: 'x', keyEvidence: [] },
      primaryProductMessage: null,
      domainMessages: {},
      dailyPhase: mockDailyPhase(),
      phaseNarrative: mockPhaseNarrative(),
      sessionsDoneToday: [],
      plannedToday: [],
    });

    expect(overlay.adviceActionable).toBe(false);
    expect(overlay.recommendation).toBeNull();
    expect(overlay.todaysDecision).toBeNull();
    expect(overlay.insufficientDataMessage).toBeTruthy();
  });
});
