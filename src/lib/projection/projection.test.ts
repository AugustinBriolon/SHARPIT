import { describe, expect, it } from 'vitest';
import { projectPmcForward } from '@/lib/projection/pmc-forward';
import { pmcTsb, stepPmc } from '@/lib/training/pmc';
import {
  projectAdaptationIndex,
  projectFatigueIndex,
  projectReadinessScore,
  projectionConfidenceForDay,
} from '@/lib/projection/score-projection';
import { projectAthleteState } from '@/lib/projection/project-athlete-state';
import type { ProjectedAthleteInput } from '@/core/projection/types';
import type {
  RecoveryState,
  FatigueState,
  AdaptationState,
  DimensionResult,
} from '@/core/digital-twin/types';

function dim(score: number | null, available = score != null): DimensionResult {
  return { score, status: available ? 'OK' : 'UNAVAILABLE', available };
}

describe('pmc-forward', () => {
  it('shares the recurrence with the historical series', () => {
    const next = stepPmc({ ctl: 50, atl: 40 }, 80);
    expect(next.ctl).toBeGreaterThan(50);
    expect(next.atl).toBeGreaterThan(40);
    expect(pmcTsb(next)).toBeCloseTo(next.ctl - next.atl, 10);
  });

  it('projects forward over multiple days', () => {
    const series = projectPmcForward(50, 40, [0, 100, 0]);
    expect(series).toHaveLength(3);
    expect(series[1].atl).toBeGreaterThan(series[0].atl);
    expect(series[2].atl).toBeLessThan(series[1].atl);
  });

  it('does not accumulate rounding error across the horizon', () => {
    // The emitted values are rounded to one decimal, but the state carried between
    // days is not: a 90-day projection must not drift from the raw recurrence.
    const horizon = Array.from({ length: 90 }, () => 60);
    const projected = projectPmcForward(50, 40, horizon).at(-1)!;

    let state = { ctl: 50, atl: 40 };
    for (const tss of horizon) state = stepPmc(state, tss);

    expect(projected.ctl).toBeCloseTo(state.ctl, 1);
    expect(projected.atl).toBeCloseTo(state.atl, 1);
  });
});

describe('score-projection', () => {
  it('adjusts readiness from TSB delta', () => {
    expect(projectReadinessScore(70, 10)).toBe(75);
    expect(projectReadinessScore(70, -20)).toBe(61);
  });

  it('decays projection confidence by day offset', () => {
    expect(projectionConfidenceForDay(0.8, 1)).toBeLessThan(0.8);
    expect(projectionConfidenceForDay(0.8, 7)).toBeLessThan(projectionConfidenceForDay(0.8, 1));
  });

  it('maps fatigue and adaptation from PMC deltas', () => {
    expect(projectFatigueIndex(40, 10)).toBeGreaterThan(40);
    expect(projectAdaptationIndex(60, 5)).toBeGreaterThan(60);
  });
});

function minimalTwinStates(trainingDayId: string): {
  recovery: RecoveryState;
  fatigue: FatigueState;
  adaptation: AdaptationState;
} {
  return {
    recovery: {
      readinessScore: 72,
      readinessCategory: 'ADEQUATE',
      primaryLimitingFactor: null,
      dissonanceDetected: false,
      estimatedTimeToFullRecovery: null,
      dimensions: {
        autonomic: dim(70),
        sleep: dim(72),
        subjective: dim(null, false),
        loadContext: dim(68),
      },
      overreachingRisk: 'LOW',
      illnessRisk: 'LOW',
      confidence: 0.8,
      dataCompleteness: 'FULL',
      modelId: 'recovery-synthesis-v1',
      computedAt: new Date(),
      trainingDayId,
    },
    fatigue: {
      fatigueIndex: 45,
      fatigueLevel: 'FUNCTIONAL_LOW',
      fatigueType: 'LOAD_DOMINANT',
      dimensions: {
        load: dim(50),
        neuromuscular: dim(null, false),
        metabolic: dim(null, false),
        cumulative: dim(45),
        psychological: dim(null, false),
      },
      trajectory: 'STABLE',
      consecutiveAccumulationDays: 0,
      dominantDimension: 'LOAD',
      primaryLimitingFactor: null,
      functionalOverreachingRisk: 'LOW',
      estimatedTimeToFresh: null,
      performanceImpairmentEstimate: 0,
      trainingCapacity: 'FULL',
      confidence: 0.8,
      dataCompleteness: 'FULL',
      modelId: 'fatigue-v1',
      computedAt: new Date(),
      trainingDayId,
    },
    adaptation: {
      adaptationIndex: 65,
      adaptationStatus: 'MAINTAINING',
      adaptationTrend: 'STABLE',
      dimensions: {
        loadProgression: dim(65),
        neuromuscularEfficiency: dim(null, false),
        autonomicAdaptation: dim(60),
        recoveryQuality: dim(62),
      },
      limitingFactor: null,
      estimatedAdaptationPeak: null,
      plateauRisk: false,
      overreachingWithoutAdaptationDetected: false,
      confidence: 0.75,
      dataCompleteness: 'FULL',
      modelId: 'adaptation-v1',
      computedAt: new Date(),
      trainingDayId,
    },
  };
}

describe('projectAthleteState', () => {
  it('produces deterministic projected days from planned load', () => {
    const anchor = '2026-07-10';
    const twins = minimalTwinStates(anchor);
    const day1 = '2026-07-11';
    const day2 = '2026-07-12';
    const day3 = '2026-07-13';

    const input: ProjectedAthleteInput = {
      athleteId: 'default',
      anchorTrainingDayId: anchor,
      horizonDays: 3,
      recovery: twins.recovery,
      fatigue: twins.fatigue,
      adaptation: twins.adaptation,
      physicalHealth: null,
      environment: null,
      initialCtl: 50,
      initialAtl: 40,
      plannedTssByDay: new Map([
        [day1, 100],
        [day2, 0],
      ]),
      environmentalImpactByDay: new Map([
        [day1, 'MODERATE'],
        [day2, 'NONE'],
        [day3, 'NONE'],
      ]),
      plannedSessionCountByDay: new Map([
        [day1, 1],
        [day2, 0],
        [day3, 0],
      ]),
      baseFreshnessConfidence: 0.8,
    };

    const state = projectAthleteState(input);
    expect(state).not.toBeNull();
    expect(state!.days).toHaveLength(3);
    expect(state!.days[0].load.plannedTss).toBe(100);
    expect(state!.days[0].environment.trainingImpact).toBe('MODERATE');
    expect(state!.days[0].decision.overallVerdict).toBeTruthy();
    expect(state!.summary.headline).toBeTruthy();

    const again = projectAthleteState(input);
    expect(again!.days[0].physiology.expectedReadiness).toBe(
      state!.days[0].physiology.expectedReadiness,
    );
  });
});
