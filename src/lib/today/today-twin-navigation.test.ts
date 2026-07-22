import { describe, expect, it } from 'vitest';
import {
  resolveConfidenceHrefFromDecision,
  resolveLimitingFactorHrefFromDecision,
  TWIN_DRILL_DOWN,
} from './today-twin-navigation';
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
    topAction: null,
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

describe('today-twin-navigation', () => {
  it('builds planned-session deep links for bookmarks (in-app uses AppModal)', () => {
    expect(TWIN_DRILL_DOWN.plannedSession('abc-123')).toBe('/training/planning?planned=abc-123');
  });

  it('maps limiting factor systems to twin pages from DecisionState', () => {
    expect(
      resolveLimitingFactorHrefFromDecision(
        decision({
          limitingFactor: {
            domain: 'RECOVERY',
            system: 'RECOVERY',
            description: { code: 'x', params: {} },
            actionable: true,
            priority: 1,
          },
        }),
      ),
    ).toBe(TWIN_DRILL_DOWN.recovery);
    expect(
      resolveLimitingFactorHrefFromDecision(
        decision({
          limitingFactor: {
            domain: 'FATIGUE',
            system: 'FATIGUE',
            description: { code: 'x', params: {} },
            actionable: true,
            priority: 1,
          },
        }),
      ),
    ).toBe(TWIN_DRILL_DOWN.effort);
    expect(
      resolveLimitingFactorHrefFromDecision(
        decision({
          limitingFactor: {
            domain: 'ADAPTATION',
            system: 'ADAPTATION',
            description: { code: 'x', params: {} },
            actionable: true,
            priority: 1,
          },
        }),
      ),
    ).toBe(TWIN_DRILL_DOWN.adaptation);
    expect(resolveLimitingFactorHrefFromDecision(null)).toBeNull();
  });

  it('maps confidence to the attention priority model from DecisionState', () => {
    expect(
      resolveConfidenceHrefFromDecision(
        decision({
          priority: {
            attentionDomain: 'FATIGUE',
            safetyOverrideApplied: false,
            confidenceGated: false,
          },
        }),
      ),
    ).toBe(TWIN_DRILL_DOWN.effort);
    expect(
      resolveConfidenceHrefFromDecision(
        decision({
          priority: {
            attentionDomain: 'ADAPTATION',
            safetyOverrideApplied: false,
            confidenceGated: false,
          },
        }),
      ),
    ).toBe(TWIN_DRILL_DOWN.adaptation);
    expect(
      resolveConfidenceHrefFromDecision(
        decision({
          priority: {
            attentionDomain: 'RECOVERY',
            safetyOverrideApplied: false,
            confidenceGated: false,
          },
        }),
      ),
    ).toBe(TWIN_DRILL_DOWN.recovery);
    expect(resolveConfidenceHrefFromDecision(null)).toBe(TWIN_DRILL_DOWN.recovery);
  });
});
