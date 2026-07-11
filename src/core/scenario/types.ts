/**
 * Scenario Engine — domain types.
 *
 * Orchestration only — decision ownership stays in Decision Engine.
 * @see docs/product/SCENARIO_ENGINE.md
 */

import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { SerializedDecisionState } from '@/core/decision/adapters';
import type { DecisionDomain } from '@/core/decision/decision-state';
import type { OverallVerdict } from '@/core/digital-twin/types';
import type { TrainingEnvironmentalImpact } from '@/core/inference/environment/types';
import type { ProjectionHorizonDays, ProjectedAthleteState } from '@/core/projection/types';
import type { PlannedSessionExposureSetting } from '@/core/planned-session/types';

export const SCENARIO_MODEL_ID = 'scenario-engine-v1' as const;

/** Load modification constant — not a decision score. */
export const INTENSITY_REDUCTION_TSS_FACTOR = 0.75 as const;

export type ScenarioKind =
  'KEEP_PLAN' | 'DELAY_SESSION' | 'MOVE_EARLIER' | 'REDUCE_INTENSITY' | 'INDOOR' | 'REMOVE_SESSION';

export type ScenarioSessionSlice = {
  readonly sessionId: string;
  readonly trainingDayId: string;
  readonly tss: number;
  readonly environmentalImpact: TrainingEnvironmentalImpact;
  readonly exposureSetting: PlannedSessionExposureSetting;
  readonly intensity: SessionIntensity | null;
  readonly title: string | null;
  readonly type: ActivityType;
};

export type ScenarioDefinition = {
  readonly id: string;
  readonly kind: ScenarioKind;
  readonly label: string;
  readonly rationale: string;
  readonly targetSessionId: string | null;
  readonly modifiedSessions: readonly ScenarioSessionSlice[];
  /** Decision domain that triggered this alternative — null for KEEP_PLAN. */
  readonly triggeredByDomain: DecisionDomain | null;
};

/** Aggregated Decision Engine outputs for a scenario projection. */
export type ScenarioDecisionSnapshot = {
  readonly endVerdict: OverallVerdict;
  readonly endConfidence: number;
  readonly endConfidenceTier: SerializedDecisionState['confidenceTier'];
  readonly endExpectedBenefit: number;
  readonly endLimitingFactorDomain: DecisionDomain | null;
  readonly endLimitingFactorPriority: number;
  readonly worstVerdict: OverallVerdict;
  readonly riskDayCount: number;
  readonly horizonMeanConfidence: number;
};

export type ScenarioDecisionDelta = {
  readonly endVerdictChanged: boolean;
  readonly endVerdictImproved: boolean | null;
  readonly endConfidenceDelta: number;
  readonly endExpectedBenefitDelta: number;
  readonly endLimitingFactorDomainChanged: boolean;
  readonly worstVerdictImproved: boolean | null;
  readonly riskDayCountDelta: number;
};

export type ScenarioOutcomeMetrics = {
  readonly endReadiness: number | null;
  readonly endFatigue: number | null;
  readonly endAdaptation: number | null;
  readonly maxEnvironmentalImpact: TrainingEnvironmentalImpact;
  readonly endTsb: number | null;
};

export type ScenarioComparisonEntry = {
  readonly scenarioId: string;
  readonly kind: ScenarioKind;
  readonly label: string;
  readonly rationale: string;
  readonly targetSessionId: string | null;
  readonly triggeredByDomain: DecisionDomain | null;
  readonly decision: ScenarioDecisionSnapshot;
  readonly decisionDeltaVsBaseline: ScenarioDecisionDelta;
  readonly outcome: ScenarioOutcomeMetrics;
  readonly tradeOffs: readonly string[];
  readonly preferabilityExplanation: string;
  readonly isPreferredOverBaseline: boolean;
  readonly projection: ProjectedAthleteState;
};

export type ScenarioComparison = {
  readonly modelId: typeof SCENARIO_MODEL_ID;
  readonly athleteId: string;
  readonly anchorTrainingDayId: string;
  readonly horizonDays: ProjectionHorizonDays;
  readonly focusSessionId: string | null;
  readonly focusSessionLabel: string | null;
  readonly anchorDecisionDomain: DecisionDomain | null;
  readonly computedAt: string;
  readonly baselineScenarioId: string;
  readonly recommendedScenarioId: string;
  readonly recommendation: string;
  readonly recommendationRationale: string;
  /** How alternatives are ordered — lexicographic on Decision Engine fields only. */
  readonly comparisonMethod: string;
  readonly scenarios: readonly ScenarioComparisonEntry[];
};
