/**
 * PHYSICAL HEALTH MODEL v1 — Domain Types
 *
 * Inference layer for persistent physical conditions.
 * Observations are evidence; this model infers latent physiological state.
 *
 * Model ID: 'physical-health-v1'
 * @see docs/models/PHYSICAL_HEALTH_ENGINE.md
 */

import type { DataCompleteness } from '@/core/digital-twin/types';
import type { I18nItem } from '@/core/inference/shared/types';
import type {
  ConditionStatus,
  ConditionTrend,
  ConditionType,
  FunctionalImpact,
  TrainingCapacityLevel,
} from '@/core/physical-health/types';

// ─────────────────────────────────────────────────────────────────────────────
// Input context (loaded by orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

export type ConditionInferenceInput = {
  readonly id: string;
  readonly label: string;
  readonly bodyRegion: string;
  readonly side: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'NA';
  readonly type: ConditionType;
  readonly affectsTraining: boolean;
  readonly startedAt: Date;
  readonly resolvedAt: Date | null;
  readonly recurrenceCount: number;
  readonly observations: readonly ConditionObservationInput[];
  readonly functionalCapacities: readonly FunctionalCapacityInput[];
  readonly episodes: readonly {
    readonly id: string;
    readonly episodeNumber: number;
    readonly status: string;
    readonly startedAt: Date;
    readonly resolvedAt: Date | null;
  }[];
};

export type ConditionObservationInput = {
  readonly id: string;
  readonly observedAt: Date;
  readonly symptomPresent: boolean;
  readonly severityReported: number | null;
  readonly functionalImpact: FunctionalImpact | null;
  readonly context: string;
};

export type FunctionalCapacityInput = {
  readonly id: string;
  readonly observationId: string | null;
  readonly assessedAt: Date;
  readonly painSeverity: number | null;
  readonly trainingCapacity: TrainingCapacityLevel;
};

export type PhysicalHealthModelContext = {
  readonly athleteId: string;
  readonly trainingDayId: string;
  readonly referenceAt: Date;
  readonly conditions: readonly ConditionInferenceInput[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Inferred per-condition state (persisted + Twin)
// ─────────────────────────────────────────────────────────────────────────────

export type InferredConditionView = {
  readonly conditionId: string;
  readonly label: string;
  readonly bodyRegion: string;
  readonly side: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'NA';
  readonly type: ConditionType;
  readonly affectsTraining: boolean;
  readonly severity: number;
  readonly status: ConditionStatus;
  readonly trend: ConditionTrend;
  readonly confidence: number;
  readonly functionalCapacity: TrainingCapacityLevel | null;
  readonly estimatedRecoveryDays: number | null;
  readonly evidenceObservationIds: readonly string[];
  readonly computedAt: Date;
};

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate state (Digital Twin)
// ─────────────────────────────────────────────────────────────────────────────

export type PhysicalHealthState = {
  readonly conditions: readonly InferredConditionView[];
  readonly activeConditionCount: number;
  readonly aggregateTrainingCapacity: TrainingCapacityLevel;
  readonly primaryLimitingConditionId: string | null;
  readonly trainingBlockedByCondition: boolean;
  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
  readonly modelId: 'physical-health-v1';
  readonly computedAt: Date;
  readonly trainingDayId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Ephemeral signals (ADR-004)
// ─────────────────────────────────────────────────────────────────────────────

export type PhysicalHealthSignals = {
  readonly activeConditionCount: number;
  readonly maxSeverity: number;
  readonly aggregateTrainingCapacity: TrainingCapacityLevel;
  readonly trainingBlockedByCondition: boolean;
  readonly improvingCount: number;
  readonly worseningCount: number;
  readonly recurrentCount: number;
};

export type PhysicalHealthDecisionVerdict =
  'CLEAR' | 'MONITOR' | 'REDUCE_LOAD' | 'LIMIT_TRAINING' | 'REST_RECOMMENDED' | 'INSUFFICIENT_DATA';

export type PhysicalHealthDecision = {
  readonly verdict: PhysicalHealthDecisionVerdict;
  readonly rationale: readonly I18nItem[];
};

export type PhysicalHealthRecommendation = {
  readonly trainingCapacity: TrainingCapacityLevel;
  readonly confidence: number;
  readonly evidence: readonly I18nItem[];
};

export type PhysicalHealthModelOutput = {
  readonly signals: PhysicalHealthSignals;
  readonly physicalHealthState: PhysicalHealthState;
  readonly decision: PhysicalHealthDecision;
  readonly recommendation: PhysicalHealthRecommendation;
  /** Per-condition updates to persist on Condition rows. */
  readonly conditionUpdates: readonly {
    readonly conditionId: string;
    readonly severity: number;
    readonly status: ConditionStatus;
    readonly confidence: number;
    readonly estimatedRecoveryDays: number | null;
    readonly recurrenceCount: number;
  }[];
};
