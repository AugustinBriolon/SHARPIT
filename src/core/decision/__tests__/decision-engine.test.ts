/**
 * Decision Engine — unit tests.
 */

import { describe, expect, it } from 'vitest';
import { runDecisionEngine } from '@/core/decision';
import type {
  AdaptationState,
  DimensionResult,
  FatigueState,
  RecoveryState,
} from '@/core/digital-twin/types';
import type { PhysicalHealthState } from '@/core/inference/physical-health/types';

const BASE_TRAINING_DAY = '2026-07-10';

function dim(score: number | null, available = score != null): DimensionResult {
  return { score, status: available ? 'OK' : 'UNAVAILABLE', available };
}

function recovery(partial: Partial<RecoveryState> = {}): RecoveryState {
  return {
    readinessScore: 75,
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
    computedAt: new Date('2026-07-10T08:00:00Z'),
    trainingDayId: BASE_TRAINING_DAY,
    ...partial,
  };
}

function fatigue(partial: Partial<FatigueState> = {}): FatigueState {
  return {
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
    computedAt: new Date('2026-07-10T08:00:00Z'),
    trainingDayId: BASE_TRAINING_DAY,
    ...partial,
  };
}

function adaptation(partial: Partial<AdaptationState> = {}): AdaptationState {
  return {
    adaptationIndex: 68,
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
    computedAt: new Date('2026-07-10T08:00:00Z'),
    trainingDayId: BASE_TRAINING_DAY,
    ...partial,
  };
}

describe('Decision Engine', () => {
  it('produces a single primary decision for aligned green states', () => {
    const { decisionState } = runDecisionEngine({
      trainingDayId: BASE_TRAINING_DAY,
      athleteId: 'default',
      recovery: recovery({ readinessCategory: 'OPTIMAL', readinessScore: 88 }),
      fatigue: fatigue({ fatigueLevel: 'FRESH' }),
      adaptation: adaptation({ adaptationStatus: 'POSITIVELY_ADAPTING' }),
      physicalHealth: null,
      environment: null,
    });

    expect(decisionState.primaryDecision.verdict).toBe('TRAIN_HARD');
    expect(decisionState.primaryDecision.headlineCode).toBeTruthy();
    expect(decisionState.explanationOrder.length).toBeLessThanOrEqual(3);
  });

  it('prioritizes physical health safety over performance verdict', () => {
    const physicalHealth: PhysicalHealthState = {
      conditions: [
        {
          conditionId: 'cond-1',
          label: 'Entorse cheville',
          bodyRegion: 'ANKLE',
          side: 'LEFT',
          type: 'INJURY',
          affectsTraining: true,
          severity: 7,
          status: 'ACTIVE',
          trend: 'STABLE',
          confidence: 0.9,
          functionalCapacity: 'UNABLE',
          estimatedRecoveryDays: 10,
          evidenceObservationIds: [],
          computedAt: new Date(),
        },
      ],
      activeConditionCount: 1,
      aggregateTrainingCapacity: 'UNABLE',
      primaryLimitingConditionId: 'cond-1',
      trainingBlockedByCondition: true,
      confidence: 0.9,
      dataCompleteness: 'FULL',
      modelId: 'physical-health-v1',
      computedAt: new Date(),
      trainingDayId: BASE_TRAINING_DAY,
    };

    const { decisionState } = runDecisionEngine({
      trainingDayId: BASE_TRAINING_DAY,
      athleteId: 'default',
      recovery: recovery({ readinessCategory: 'OPTIMAL' }),
      fatigue: fatigue({ fatigueLevel: 'FRESH' }),
      adaptation: adaptation(),
      physicalHealth,
      environment: null,
    });

    expect(decisionState.overallVerdict).toBe('RECOVER');
    expect(decisionState.priority.safetyOverrideApplied).toBe(true);
    expect(decisionState.limitingFactor.domain).toBe('PHYSICAL_HEALTH');
  });
});
