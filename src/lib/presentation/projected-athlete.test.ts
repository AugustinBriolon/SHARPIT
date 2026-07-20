import { describe, expect, it } from 'vitest';
import type { RecoveryState } from '@/core/digital-twin/types';
import { PROJECTION_MODEL_ID, type ProjectedAthleteState } from '@/core/projection/types';
import {
  buildProjectedAthleteViewModel,
  buildProjectionCaution,
  buildProjectionTrajectory,
} from '@/lib/presentation/projected-athlete';
import { buildPlanningDiscussPrompt } from '@/lib/coach-session-thread';

function makeState(overrides?: {
  tsbEnd?: number;
  peakReadinessDay?: string | null;
  highestRiskDay?: string | null;
  mainLimitingFactor?: string | null;
  planningConfidence?: number;
}): ProjectedAthleteState {
  const highestRiskDay = overrides?.highestRiskDay ?? null;
  const day = {
    trainingDayId: highestRiskDay ?? '2026-07-21',
    dayOffset: 1,
    dateLabel: 'mar. 21 juil.',
    load: {
      trainingDayId: highestRiskDay ?? '2026-07-21',
      plannedTss: 40,
      ctl: 55,
      atl: 40,
      tsb: overrides?.tsbEnd ?? 10,
    },
    physiology: {
      expectedReadiness: 70,
      expectedFatigueIndex: 40,
      expectedAdaptationIndex: 60,
      readinessCategory: 'ADEQUATE' as const,
      fatigueLevel: 'FUNCTIONAL_LOW' as const,
      adaptationStatus: 'MAINTAINING' as const,
    },
    environment: {
      trainingImpact: 'NONE' as const,
      sessionCount: 1,
      dominantConstraint: null,
    },
    decision: {
      overallVerdict: 'TRAIN_SMART' as const,
      limitingFactor: {
        domain: 'RECOVERY' as const,
        system: 'RECOVERY' as const,
        description: null,
        actionable: true,
        priority: 2,
      },
      confidence: 0.4,
      confidenceTier: 'LOW' as const,
      priority: {
        attentionDomain: 'RECOVERY' as const,
        safetyOverrideApplied: false,
        confidenceGated: true,
      },
      primaryDecision: {
        verdict: 'TRAIN_SMART' as const,
        headlineCode: 'test',
        verbCode: 'test',
        focusCode: 'test',
        rationaleCode: 'test',
        expectedBenefit: 0.5,
      },
    },
    projectionConfidence: overrides?.planningConfidence ?? 0.34,
    assumptions: [],
  };

  return {
    modelId: PROJECTION_MODEL_ID,
    athleteId: 'default',
    anchorTrainingDayId: '2026-07-20',
    horizonDays: 7,
    computedAt: new Date().toISOString(),
    anchor: {
      readiness: 62,
      fatigueIndex: 40,
      adaptationIndex: 55,
      ctl: 50,
      atl: 45,
      tsb: 5,
    },
    days: [day],
    summary: {
      peakReadinessDay: overrides?.peakReadinessDay ?? '2026-07-21',
      highestRiskDay,
      mainLimitingFactor: overrides?.mainLimitingFactor ?? null,
      planningConfidence: overrides?.planningConfidence ?? 0.34,
      headline: 'test',
      riskLines: [],
    },
    assumptions: [],
  };
}

function makeRecovery(limiter: RecoveryState['primaryLimitingFactor']): RecoveryState {
  return {
    readinessScore: 62,
    readinessCategory: 'REDUCED',
    dimensions: {
      autonomic: { score: 80, status: 'NORMAL', available: true },
      sleep: { score: 27.5, status: 'SEVERELY_INSUFFICIENT', available: true },
      subjective: { score: 100, status: 'HIGH', available: true },
      loadContext: { score: 73, status: 'ELEVATED', available: true },
    },
    primaryLimitingFactor: limiter,
    estimatedTimeToFullRecovery: 1,
    overreachingRisk: 'LOW',
    illnessRisk: 'LOW',
    dissonanceDetected: true,
    confidence: 0.41,
    dataCompleteness: 'FULL',
    computedAt: new Date(),
    trainingDayId: '2026-07-20',
    modelId: 'recovery-synthesis-v1',
  };
}

describe('buildProjectionTrajectory', () => {
  it('states form rebound without a confidence percentage', () => {
    const sentence = buildProjectionTrajectory(
      makeState({ tsbEnd: 10, peakReadinessDay: '2026-07-21', planningConfidence: 0.34 }),
    );
    expect(sentence).toContain('Ta forme devrait remonter');
    expect(sentence).not.toMatch(/\d+\s*%/);
    expect(sentence).not.toMatch(/incertain/i);
  });

  it('keeps risk-day vigilance inside the trajectory without a %', () => {
    const sentence = buildProjectionTrajectory(
      makeState({
        tsbEnd: 10,
        peakReadinessDay: '2026-07-21',
        highestRiskDay: '2026-07-22',
        planningConfidence: 0.34,
      }),
    );
    expect(sentence).toMatch(/point de vigilance/i);
    expect(sentence).not.toMatch(/\d+\s*%/);
  });
});

describe('buildProjectionCaution', () => {
  it('names sleep when recovery primary limiter is sleep', () => {
    const caution = buildProjectionCaution(makeState(), makeRecovery('sleep'));
    expect(caution).not.toBeNull();
    expect(caution!.label.toLowerCase()).toContain('sommeil');
    expect(caution!.body.toLowerCase()).toMatch(/marge|séances|coucher/);
    expect(caution!.body).not.toMatch(/\d+\s*%/);
  });

  it('returns null when no clear frein', () => {
    const caution = buildProjectionCaution(
      makeState({ highestRiskDay: null, mainLimitingFactor: null }),
      makeRecovery(null),
    );
    expect(caution).toBeNull();
  });

  it('falls back to projected domain when recovery has no limiter', () => {
    const caution = buildProjectionCaution(
      makeState({ highestRiskDay: '2026-07-22', mainLimitingFactor: 'FATIGUE' }),
      makeRecovery(null),
    );
    expect(caution?.label.toLowerCase()).toContain('récupération');
  });
});

describe('buildProjectedAthleteViewModel', () => {
  it('exposes trajectory + sleep caution without %', () => {
    const vm = buildProjectedAthleteViewModel(makeState(), 7, makeRecovery('sleep'));
    expect(vm.visible).toBe(true);
    expect(vm.synthesisSentence).not.toMatch(/\d+\s*%/);
    expect(vm.caution?.label.toLowerCase()).toContain('sommeil');
  });

  it('coexists risk day trajectory with sleep caution', () => {
    const vm = buildProjectedAthleteViewModel(
      makeState({
        peakReadinessDay: '2026-07-21',
        highestRiskDay: '2026-07-22',
        planningConfidence: 0.34,
      }),
      7,
      makeRecovery('sleep'),
    );
    expect(vm.synthesisSentence).toMatch(/point de vigilance/i);
    expect(vm.caution?.label.toLowerCase()).toContain('sommeil');
    expect(`${vm.synthesisSentence}${vm.caution?.body ?? ''}`).not.toMatch(/\d+\s*%/);
  });
});

describe('buildPlanningDiscussPrompt', () => {
  it('includes vigilance block when caution is present', () => {
    const prompt = buildPlanningDiscussPrompt({
      synthesisSentence: 'Ta forme devrait remonter.',
      horizonDays: 7,
      caution: {
        label: 'Vigilance — sommeil',
        body: 'Le sommeil freine ta récupération.',
      },
    });
    expect(prompt).toContain('Vigilance — sommeil');
    expect(prompt).toContain('Le sommeil freine ta récupération.');
    expect(prompt).not.toMatch(/\d+\s*%/);
  });
});
