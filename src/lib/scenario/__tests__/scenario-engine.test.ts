import { describe, expect, it } from 'vitest';
import type { ScenarioSessionSlice } from '@/core/scenario/types';
import { applyScenarioModification } from '@/lib/scenario/apply-modification';
import {
  compareDecisionSnapshots,
  COMPARISON_METHOD,
  computeDecisionDelta,
} from '@/lib/scenario/decision-comparison';
import { extractScenarioDecisionSnapshot } from '@/lib/scenario/decision-snapshot';
import {
  generateScenariosFromDecision,
  resolveAnchorDecisionDomain,
} from '@/lib/scenario/generate-from-decision';
import type { SerializedDecisionState } from '@/core/decision/adapters';
import type { ProjectedAthleteState } from '@/core/projection/types';
import { PROJECTION_MODEL_ID } from '@/core/projection/types';

const FUTURE_DAYS = ['2026-07-11', '2026-07-12', '2026-07-13'];

function session(
  partial: Partial<ScenarioSessionSlice> & Pick<ScenarioSessionSlice, 'sessionId'>,
): ScenarioSessionSlice {
  return {
    trainingDayId: '2026-07-11',
    tss: 80,
    environmentalImpact: 'SIGNIFICANT',
    exposureSetting: 'OUTDOOR',
    intensity: 'THRESHOLD',
    title: 'Sortie longue',
    type: 'RUN',
    ...partial,
  };
}

function mockProjection(overrides: {
  endVerdict?: ProjectedAthleteState['days'][0]['decision']['overallVerdict'];
  expectedBenefit?: number;
  confidence?: number;
}): ProjectedAthleteState {
  const day = {
    trainingDayId: '2026-07-13',
    dayOffset: 3,
    dateLabel: 'dim. 13 juil.',
    load: { trainingDayId: '2026-07-13', plannedTss: 0, ctl: 50, atl: 40, tsb: 10 },
    physiology: {
      expectedReadiness: 70,
      expectedFatigueIndex: 40,
      expectedAdaptationIndex: 65,
      readinessCategory: 'ADEQUATE' as const,
      fatigueLevel: 'FUNCTIONAL_LOW' as const,
      adaptationStatus: 'MAINTAINING' as const,
    },
    environment: { trainingImpact: 'NONE' as const, sessionCount: 0, dominantConstraint: null },
    decision: {
      overallVerdict: overrides.endVerdict ?? 'TRAIN_SMART',
      limitingFactor: {
        domain: 'RECOVERY' as const,
        system: 'RECOVERY' as const,
        description: null,
        actionable: true,
        priority: 2,
      },
      confidence: overrides.confidence ?? 0.7,
      confidenceTier: 'MEDIUM' as const,
      priority: {
        attentionDomain: 'RECOVERY' as const,
        safetyOverrideApplied: false,
        confidenceGated: false,
      },
      primaryDecision: {
        verdict: overrides.endVerdict ?? 'TRAIN_SMART',
        headlineCode: 'test',
        verbCode: 'test',
        focusCode: 'test',
        rationaleCode: 'test',
        expectedBenefit: overrides.expectedBenefit ?? 0.5,
      },
    },
    projectionConfidence: 0.6,
    assumptions: [],
  };

  return {
    modelId: PROJECTION_MODEL_ID,
    athleteId: 'default',
    anchorTrainingDayId: '2026-07-10',
    horizonDays: 3,
    computedAt: new Date().toISOString(),
    anchor: {
      readiness: 72,
      fatigueIndex: 45,
      adaptationIndex: 65,
      ctl: 50,
      atl: 40,
      tsb: 10,
    },
    days: [day],
    summary: {
      peakReadinessDay: null,
      highestRiskDay: null,
      mainLimitingFactor: null,
      planningConfidence: 0.65,
      headline: 'test',
      riskLines: [],
    },
    assumptions: [],
  };
}

describe('applyScenarioModification', () => {
  const baseline = [session({ sessionId: 's1' })];

  it('removes environmental impact for indoor scenario', () => {
    const modified = applyScenarioModification(baseline, 'INDOOR', 's1', FUTURE_DAYS);
    expect(modified?.[0].environmentalImpact).toBe('NONE');
  });
});

describe('generateScenariosFromDecision', () => {
  const anchorDecision = {
    limitingFactor: {
      domain: 'ENVIRONMENT' as const,
      system: null,
      description: null,
      actionable: true,
      priority: 1,
    },
    priority: {
      attentionDomain: 'ENVIRONMENT' as const,
      safetyOverrideApplied: false,
      confidenceGated: false,
    },
  } as SerializedDecisionState;

  it('generates environment-driven alternatives', () => {
    const scenarios = generateScenariosFromDecision(
      [session({ sessionId: 's1' })],
      FUTURE_DAYS,
      anchorDecision,
    );
    expect(scenarios.some((s) => s.kind === 'KEEP_PLAN')).toBe(true);
    expect(scenarios.some((s) => s.kind === 'INDOOR')).toBe(true);
    expect(
      scenarios.every((s) => s.kind === 'KEEP_PLAN' || s.triggeredByDomain === 'ENVIRONMENT'),
    ).toBe(true);
  });

  it('resolves anchor domain from decision state', () => {
    expect(resolveAnchorDecisionDomain(anchorDecision)).toBe('ENVIRONMENT');
  });
});

describe('decision-comparison', () => {
  it('uses lexicographic Decision Engine comparison — no benefit score', () => {
    expect(COMPARISON_METHOD).toContain('Decision Engine');
    expect(COMPARISON_METHOD).not.toContain('×');

    const baseline = extractScenarioDecisionSnapshot(
      mockProjection({ endVerdict: 'RECOVER', expectedBenefit: 0.3, confidence: 0.6 }),
    );
    const improved = extractScenarioDecisionSnapshot(
      mockProjection({ endVerdict: 'TRAIN_EASY', expectedBenefit: 0.6, confidence: 0.75 }),
    );

    expect(compareDecisionSnapshots(improved, baseline)).toBe(1);
    const delta = computeDecisionDelta(improved, baseline);
    expect(delta.endExpectedBenefitDelta).toBeGreaterThan(0);
  });
});
