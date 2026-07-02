/**
 * DIGITAL TWIN — Type System
 *
 * The Digital Twin is the persistent, mutable representation of an athlete's
 * estimated current state. It is the OUTPUT of all inference models combined.
 *
 * Architecture invariants (from DIGITAL_TWIN.md and ADR-004):
 *   1. The Digital Twin is never the primary source for inference inputs.
 *      Models always read from the Feature Repository, not from the Twin.
 *   2. The Twin is updated by the Inference Orchestrator after each model run.
 *   3. Each model updates its own sub-dimension only.
 *   4. The Twin may be stale (computedAt < today) — staleness is explicit.
 *   5. The Twin is readable by the Dashboard and Recommendation Engine.
 *
 * Design decision: the Digital Twin state is stored as typed sub-objects
 * (one per model). As new models are implemented, new sub-dimensions are
 * added without touching existing dimensions.
 */

import type { I18nItem } from '@/core/inference/shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared dimension primitives
// ─────────────────────────────────────────────────────────────────────────────

export type DataCompleteness = 'FULL' | 'PARTIAL' | 'SPARSE' | 'INSUFFICIENT';

export type DimensionResult = {
  readonly score: number | null;
  readonly status: string;
  readonly available: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Recovery State (produced by the Recovery Model)
// ─────────────────────────────────────────────────────────────────────────────

export type ReadinessCategory =
  | 'OPTIMAL' // 85–100
  | 'ADEQUATE' // 70–84
  | 'REDUCED' // 50–69
  | 'LOW' // 30–49
  | 'VERY_LOW' // < 30
  | 'BASELINE_PENDING' // cold start — < 7 days of data
  | 'INSUFFICIENT_DATA'; // not enough dimensions to compute

export type OverreachingRisk = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type IllnessRisk = 'LOW' | 'ELEVATED' | 'HIGH';

export type RecoveryState = {
  /** 0–100. null when INSUFFICIENT_DATA or BASELINE_PENDING. */
  readonly readinessScore: number | null;
  readonly readinessCategory: ReadinessCategory;

  readonly dimensions: {
    readonly autonomic: DimensionResult;
    readonly sleep: DimensionResult;
    readonly subjective: DimensionResult;
    readonly loadContext: DimensionResult;
  };

  /** The dimension with the lowest score — tells the athlete what to address. */
  readonly primaryLimitingFactor: 'autonomic' | 'sleep' | 'subjective' | 'loadContext' | null;

  /** Rough estimate in days. null when readiness is already adequate. */
  readonly estimatedTimeToFullRecovery: number | null;

  readonly overreachingRisk: OverreachingRisk;
  readonly illnessRisk: IllnessRisk;

  /**
   * True when objective markers (HRV, sleep) and subjective markers disagree
   * by more than 20 points. Scientifically significant — see RECOVERY_MODEL.md §9.1.
   */
  readonly dissonanceDetected: boolean;

  /** 0.0–1.0 */
  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
  readonly modelId: 'recovery-synthesis-v1';
  readonly computedAt: Date;
  readonly trainingDayId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fatigue State (produced by the Fatigue Model v1)
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueLevel =
  | 'FRESH'
  | 'FUNCTIONAL_LOW'
  | 'FUNCTIONAL_HIGH'
  | 'ACCUMULATED'
  | 'NON_FUNCTIONAL_RISK'
  | 'OVERREACHING_RISK'
  | 'INSUFFICIENT_DATA';

export type FatigueType =
  | 'LOAD_DOMINANT'
  | 'NEUROMUSCULAR_DOMINANT'
  | 'METABOLIC_DOMINANT'
  | 'PSYCHOLOGICAL_DOMINANT'
  | 'CUMULATIVE_MULTI_SYSTEM'
  | 'MIXED'
  | 'UNDETERMINED';

export type FatigueTrajectory = 'RESOLVING' | 'STABLE' | 'ACCUMULATING' | 'ACCELERATING';
export type TrainingCapacity = 'FULL' | 'REDUCED' | 'LIGHT_ONLY' | 'REST_ONLY';
export type FatigueDominantDimension =
  'LOAD' | 'NEUROMUSCULAR' | 'METABOLIC' | 'CUMULATIVE' | 'PSYCHOLOGICAL';

export type FatigueState = {
  readonly fatigueIndex: number | null;
  readonly fatigueLevel: FatigueLevel;
  readonly fatigueType: FatigueType;

  readonly dimensions: {
    readonly load: DimensionResult;
    readonly neuromuscular: DimensionResult;
    readonly metabolic: DimensionResult;
    readonly cumulative: DimensionResult;
    readonly psychological: DimensionResult;
  };

  readonly trajectory: FatigueTrajectory;
  readonly consecutiveAccumulationDays: number;
  readonly dominantDimension: FatigueDominantDimension;
  readonly primaryLimitingFactor: string | null;

  readonly functionalOverreachingRisk: OverreachingRisk;
  readonly estimatedTimeToFresh: number | null;
  readonly performanceImpairmentEstimate: number;
  readonly trainingCapacity: TrainingCapacity;

  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
  readonly modelId: 'fatigue-v1';
  readonly computedAt: Date;
  readonly trainingDayId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Adaptation State (produced by the Adaptation Model v1)
// ─────────────────────────────────────────────────────────────────────────────

export type AdaptationStatus =
  | 'POSITIVELY_ADAPTING'
  | 'MAINTAINING'
  | 'PLATEAUING'
  | 'MALADAPTING'
  | 'DETRAINING'
  | 'INSUFFICIENT_DATA';

export type AdaptationTrend = 'IMPROVING' | 'STABLE' | 'DECLINING';

export type AdaptationState = {
  readonly adaptationIndex: number | null;
  readonly adaptationStatus: AdaptationStatus;
  readonly adaptationTrend: AdaptationTrend;

  readonly dimensions: {
    readonly loadProgression: DimensionResult;
    readonly neuromuscularEfficiency: DimensionResult;
    readonly autonomicAdaptation: DimensionResult;
    readonly recoveryQuality: DimensionResult;
  };

  readonly limitingFactor:
    | 'loadProgression'
    | 'neuromuscularEfficiency'
    | 'autonomicAdaptation'
    | 'recoveryQuality'
    | null;

  readonly estimatedAdaptationPeak: number | null;
  readonly plateauRisk: boolean;
  readonly overreachingWithoutAdaptationDetected: boolean;

  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
  readonly modelId: 'adaptation-v1';
  readonly computedAt: Date;
  readonly trainingDayId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Reasoning State (produced by the Reasoning Engine v1)
// ─────────────────────────────────────────────────────────────────────────────

export type OverallVerdict =
  | 'TRAIN_HARD'
  | 'TRAIN_SMART'
  | 'TRAIN_EASY'
  | 'RECOVER'
  | 'RACE_READY'
  | 'CAUTION'
  | 'INSUFFICIENT_DATA';

export type SystemAttentionPriority = 'RECOVERY' | 'FATIGUE' | 'ADAPTATION' | 'BALANCED';

export type PhysiologicalConsistency =
  'ALIGNED' | 'PARTIALLY_ALIGNED' | 'CONFLICTING' | 'INSUFFICIENT_DATA';

export type FindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type FindingCategory = 'RECOVERY' | 'FATIGUE' | 'ADAPTATION' | 'CROSS_SYSTEM';

export type ReasoningFinding = {
  readonly id: string;
  readonly category: FindingCategory;
  readonly severity: FindingSeverity;
  readonly title: I18nItem;
  readonly evidenceItems: readonly I18nItem[];
  readonly confidence: number;
};

export type OpportunityType =
  'LOAD_INCREASE' | 'QUALITY_SESSION' | 'DELOAD' | 'RACE_READINESS' | 'RECOVERY_WINDOW';

export type OpportunityTimeWindow = 'TODAY' | 'THIS_WEEK' | 'NEXT_WEEK';

export type ReasoningOpportunity = {
  readonly id: string;
  readonly type: OpportunityType;
  readonly title: I18nItem;
  readonly rationale: I18nItem;
  readonly expectedBenefit: number;
  readonly timeWindow: OpportunityTimeWindow;
};

export type ConflictType = 'CAPACITY_CONFLICT' | 'TIMING_CONFLICT' | 'SIGNAL_CONFLICT';

export type ReasoningConflict = {
  readonly id: string;
  readonly type: ConflictType;
  readonly descriptionCode: string;
  readonly models: readonly string[];
  readonly resolutionCode: string;
};

export type ReasoningState = {
  readonly overallVerdict: OverallVerdict;
  readonly systemAttentionPriority: SystemAttentionPriority;
  readonly physiologicalConsistency: PhysiologicalConsistency;
  readonly consistencyScore: number;

  readonly keyFindings: readonly ReasoningFinding[];
  readonly limitingFactor: {
    readonly system: 'RECOVERY' | 'FATIGUE' | 'ADAPTATION' | null;
    readonly description: I18nItem | null;
    readonly actionable: boolean;
  };
  readonly opportunities: readonly ReasoningOpportunity[];
  readonly conflicts: readonly ReasoningConflict[];

  readonly topAction: {
    readonly verbCode: string;
    readonly focusCode: string;
    readonly rationaleCode: string;
    readonly expectedBenefit: number;
  } | null;

  readonly evidenceGraph: {
    readonly recoveryContribution: number;
    readonly fatigueContribution: number;
    readonly adaptationContribution: number;
  };

  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
  readonly modelId: 'reasoning-v1';
  readonly computedAt: Date;
  readonly trainingDayId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Athlete State (aggregated view across all models)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete inferred state of an athlete at a point in time.
 * Each model updates its own dimension independently.
 *
 * Null sub-dimensions mean the corresponding model has not yet run.
 */
export type AthleteState = {
  readonly recovery: RecoveryState | null;
  readonly fatigue: FatigueState | null;
  readonly adaptation: AdaptationState | null;
  readonly reasoning: ReasoningState | null;
  // trainingStress: TrainingStressState | null → future
  // performance: PerformanceState | null  → future
};

// ─────────────────────────────────────────────────────────────────────────────
// Digital Twin entity (stored in database)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One Digital Twin per athlete. Mutable — updated by the Inference Orchestrator.
 *
 * The `state` field stores the complete AthleteState, enabling future model
 * additions without schema migrations.
 */
export type DigitalTwin = {
  readonly id: string;
  readonly athleteId: string;
  readonly state: AthleteState;
  readonly updatedAt: Date;
  readonly createdAt: Date;
};
