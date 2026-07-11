/**
 * Projected Athlete State — domain types.
 *
 * Explainable forward projection — not a simulation engine.
 * @see docs/product/PROJECTED_ATHLETE_STATE.md
 */

import type { DecisionState } from '@/core/decision/decision-state';
import type {
  AdaptationState,
  FatigueState,
  OverallVerdict,
  RecoveryState,
} from '@/core/digital-twin/types';
import type { EnvironmentalDecisionSnapshot } from '@/core/inference/environment/types';
import type { TrainingEnvironmentalImpact } from '@/core/inference/environment/types';

export const PROJECTION_MODEL_ID = 'projected-athlete-v1' as const;

export type ProjectionHorizonDays = 1 | 3 | 7 | 14;

export type ProjectionAssumption = {
  readonly code: string;
  readonly label: string;
};

export type ProjectedLoadMetrics = {
  readonly trainingDayId: string;
  readonly plannedTss: number;
  readonly ctl: number;
  readonly atl: number;
  readonly tsb: number;
};

export type ProjectedPhysiologyMetrics = {
  readonly expectedReadiness: number | null;
  readonly expectedFatigueIndex: number | null;
  readonly expectedAdaptationIndex: number | null;
  readonly readinessCategory: RecoveryState['readinessCategory'] | null;
  readonly fatigueLevel: FatigueState['fatigueLevel'] | null;
  readonly adaptationStatus: AdaptationState['adaptationStatus'] | null;
};

export type ProjectedEnvironmentalMetrics = {
  readonly trainingImpact: TrainingEnvironmentalImpact;
  readonly sessionCount: number;
  readonly dominantConstraint: string | null;
};

export type ProjectedDayState = {
  readonly trainingDayId: string;
  readonly dayOffset: number;
  readonly dateLabel: string;
  readonly load: ProjectedLoadMetrics;
  readonly physiology: ProjectedPhysiologyMetrics;
  readonly environment: ProjectedEnvironmentalMetrics;
  readonly decision: Pick<
    DecisionState,
    | 'overallVerdict'
    | 'limitingFactor'
    | 'confidence'
    | 'confidenceTier'
    | 'priority'
    | 'primaryDecision'
  >;
  readonly projectionConfidence: number;
  readonly assumptions: readonly ProjectionAssumption[];
};

export type ProjectedAthleteSummary = {
  readonly peakReadinessDay: string | null;
  readonly highestRiskDay: string | null;
  readonly mainLimitingFactor: string | null;
  readonly planningConfidence: number;
  readonly headline: string;
  readonly riskLines: readonly string[];
};

export type ProjectedAthleteState = {
  readonly modelId: typeof PROJECTION_MODEL_ID;
  readonly athleteId: string;
  readonly anchorTrainingDayId: string;
  readonly horizonDays: ProjectionHorizonDays;
  readonly computedAt: string;
  readonly anchor: {
    readonly readiness: number | null;
    readonly fatigueIndex: number | null;
    readonly adaptationIndex: number | null;
    readonly ctl: number;
    readonly atl: number;
    readonly tsb: number;
  };
  readonly days: readonly ProjectedDayState[];
  readonly summary: ProjectedAthleteSummary;
  readonly assumptions: readonly ProjectionAssumption[];
};

export type ProjectedAthleteInput = {
  readonly athleteId: string;
  readonly anchorTrainingDayId: string;
  readonly horizonDays: ProjectionHorizonDays;
  readonly recovery: RecoveryState | null;
  readonly fatigue: FatigueState | null;
  readonly adaptation: AdaptationState | null;
  readonly physicalHealth:
    import('@/core/inference/physical-health/types').PhysicalHealthState | null;
  readonly environment: EnvironmentalDecisionSnapshot | null;
  readonly initialCtl: number;
  readonly initialAtl: number;
  readonly plannedTssByDay: ReadonlyMap<string, number>;
  readonly environmentalImpactByDay: ReadonlyMap<string, TrainingEnvironmentalImpact>;
  readonly plannedSessionCountByDay: ReadonlyMap<string, number>;
  readonly baseFreshnessConfidence: number;
};
