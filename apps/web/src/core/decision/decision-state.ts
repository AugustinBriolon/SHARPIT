/**
 * Decision Engine — canonical decision state (decision-v1).
 *
 * @see docs/models/DECISION_ENGINE.md
 */

import type {
  DataCompleteness,
  OverallVerdict,
  PhysiologicalConsistency,
  ReasoningConflict,
  ReasoningOpportunity,
  ReasoningState,
  SystemAttentionPriority,
} from '@/core/digital-twin/types';
import type { I18nItem } from '@/core/inference/shared/types';

export const DECISION_ENGINE_VERSION = 'decision-v1' as const;

export type DecisionDomain =
  | 'RECOVERY'
  | 'FATIGUE'
  | 'ADAPTATION'
  | 'PHYSICAL_HEALTH'
  | 'ENVIRONMENT'
  | 'DAILY_STRAIN'
  | 'PLANNING'
  | 'GOALS';

export type DecisionConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

export type DecisionSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type PrimaryDecision = {
  /** Single canonical daily verdict — same vocabulary as OverallVerdict. */
  readonly verdict: OverallVerdict;
  /** The one thing the athlete should understand right now. */
  readonly headlineCode: string;
  readonly verbCode: string;
  readonly focusCode: string;
  readonly rationaleCode: string;
  readonly expectedBenefit: number;
};

export type DecisionLimitingFactor = {
  readonly domain: DecisionDomain | null;
  readonly system: ReasoningState['limitingFactor']['system'] | 'PHYSICAL_HEALTH' | null;
  readonly description: I18nItem | null;
  readonly actionable: boolean;
  /** Lower number = higher priority (0 = safety override). */
  readonly priority: number;
};

export type DecisionEvidence = {
  readonly id: string;
  readonly domain: DecisionDomain;
  readonly severity: DecisionSeverity;
  readonly title: I18nItem;
  readonly evidenceItems: readonly I18nItem[];
  readonly confidence: number;
  readonly rank: number;
};

export type SuppressedDecisionEvidence = DecisionEvidence & {
  readonly suppressionReason: string;
};

export type DecisionConflict = {
  readonly id: string;
  readonly type: ReasoningConflict['type'];
  readonly domains: readonly DecisionDomain[];
  readonly descriptionCode: string;
  readonly resolutionCode: string;
  readonly resolvedBy: DecisionDomain | null;
};

export type DecisionPriority = {
  readonly attentionDomain: SystemAttentionPriority | 'PHYSICAL_HEALTH' | 'ENVIRONMENT';
  readonly safetyOverrideApplied: boolean;
  readonly confidenceGated: boolean;
};

/**
 * Canonical athlete decision — single source of truth for product surfaces.
 * Downstream layers (Reasoning projection, Coach, Today, notifications) consume this.
 */
export type DecisionState = {
  readonly primaryDecision: PrimaryDecision;
  readonly limitingFactor: DecisionLimitingFactor;
  readonly supportingEvidence: readonly DecisionEvidence[];
  readonly suppressedEvidence: readonly SuppressedDecisionEvidence[];
  readonly confidence: number;
  readonly confidenceTier: DecisionConfidenceTier;
  readonly dataCompleteness: DataCompleteness;
  readonly conflicts: readonly DecisionConflict[];
  readonly priority: DecisionPriority;
  /** Ordered finding ids for progressive disclosure (max cognitive load = 1 headline + 2 evidence). */
  readonly explanationOrder: readonly string[];

  readonly overallVerdict: OverallVerdict;
  readonly systemAttentionPriority: SystemAttentionPriority;
  readonly physiologicalConsistency: PhysiologicalConsistency;
  readonly consistencyScore: number;
  readonly opportunities: readonly ReasoningOpportunity[];
  readonly topAction: ReasoningState['topAction'];
  readonly evidenceGraph: ReasoningState['evidenceGraph'];

  readonly modelId: typeof DECISION_ENGINE_VERSION;
  readonly computedAt: Date;
  readonly trainingDayId: string;
};

export type DecisionEngineInput = {
  readonly trainingDayId: string;
  readonly athleteId: string;
  readonly recovery: import('@/core/digital-twin/types').RecoveryState | null;
  readonly fatigue: import('@/core/digital-twin/types').FatigueState | null;
  readonly adaptation: import('@/core/digital-twin/types').AdaptationState | null;
  readonly physicalHealth:
    import('@/core/inference/physical-health/types').PhysicalHealthState | null;
  readonly environment:
    import('@/core/inference/environment/types').EnvironmentalDecisionSnapshot | null;
  readonly environmentalImpact?: import('@/core/environment').EnvironmentalImpact | null;
  /** Freshness aggregate confidence — gates speculative advice. */
  readonly freshnessConfidence?: number | null;
};

export type DecisionEngineOutput = {
  readonly decisionState: DecisionState;
  readonly signals: {
    readonly availableModelCount: number;
    readonly hasRecoveryState: boolean;
    readonly hasFatigueState: boolean;
    readonly hasAdaptationState: boolean;
    readonly hasPhysicalHealthState: boolean;
    readonly hasEnvironmentState: boolean;
    readonly conflictCount: number;
    readonly suppressedEvidenceCount: number;
  };
};
