/**
 * FATIGUE MODEL v1 — Domain Types
 *
 * Types specific to the Fatigue Intelligence Model.
 * Implements the type contracts defined in docs/models/FATIGUE_MODEL.md §5–7.
 *
 * Key design: fatigue ≠ recovery. These are complementary dimensions.
 * See FATIGUE_MODEL.md §2.1 for the four-state matrix.
 */

import type {
  OverreachingRisk,
  DataCompleteness,
  DimensionResult,
} from '@/core/digital-twin/types';
import type { RecoveryState } from '@/core/digital-twin/types';
import type { I18nItem } from '@/core/inference/shared/types';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export digital twin types for convenience
// ─────────────────────────────────────────────────────────────────────────────

export type { OverreachingRisk, DataCompleteness, DimensionResult, RecoveryState };

// ─────────────────────────────────────────────────────────────────────────────
// Fatigue taxonomy (FATIGUE_MODEL.md §4.8)
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueLevel =
  | 'FRESH' // 0–20: no detectable fatigue
  | 'FUNCTIONAL_LOW' // 21–40: normal training fatigue, fully adaptable
  | 'FUNCTIONAL_HIGH' // 41–60: productive load state, monitor closely
  | 'ACCUMULATED' // 61–75: accumulating beyond normal, recovery critical
  | 'NON_FUNCTIONAL_RISK' // 76–88: performance likely impaired, reduce load
  | 'OVERREACHING_RISK' // 89–100: mandatory extended rest
  | 'INSUFFICIENT_DATA'; // not enough dimensions to classify

export type FatigueType =
  | 'LOAD_DOMINANT' // ATL-driven — typical of hard training block
  | 'NEUROMUSCULAR_DOMINANT' // HRV + soreness — typical of high-impact sessions
  | 'METABOLIC_DOMINANT' // intensity-driven — typical of interval weeks
  | 'PSYCHOLOGICAL_DOMINANT' // wellness-driven — often non-training origin
  | 'CUMULATIVE_MULTI_SYSTEM' // all dimensions elevated simultaneously (worst case)
  | 'MIXED'
  | 'UNDETERMINED';

export type FatigueTrajectory = 'RESOLVING' | 'STABLE' | 'ACCUMULATING' | 'ACCELERATING';

export type TrainingCapacity = 'FULL' | 'REDUCED' | 'LIGHT_ONLY' | 'REST_ONLY';

export type FatigueDominantDimension =
  'LOAD' | 'NEUROMUSCULAR' | 'METABOLIC' | 'CUMULATIVE' | 'PSYCHOLOGICAL';

// ─────────────────────────────────────────────────────────────────────────────
// Fatigue State (persisted in Digital Twin)
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueState = {
  /** 0–100. null when INSUFFICIENT_DATA. */
  readonly fatigueIndex: number | null;
  readonly fatigueLevel: FatigueLevel;
  readonly fatigueType: FatigueType;

  readonly dimensions: {
    readonly load: DimensionResult; // Dimension 1 — LoadFatigue (0-100)
    readonly neuromuscular: DimensionResult; // Dimension 2 — NeuromuscularFatigue (0-100)
    readonly metabolic: DimensionResult; // Dimension 3 — MetabolicFatigue (0-100)
    readonly cumulative: DimensionResult; // Dimension 4 — CumulativeTrajectory (0-100)
    readonly psychological: DimensionResult; // Dimension 5 — PsychologicalFatigue (0-100)
  };

  readonly trajectory: FatigueTrajectory;
  readonly consecutiveAccumulationDays: number;
  readonly dominantDimension: FatigueDominantDimension;
  readonly primaryLimitingFactor: string | null;

  readonly functionalOverreachingRisk: OverreachingRisk;
  /** Rough estimate in days to reach FatigueLevel = FRESH. null when already FRESH. */
  readonly estimatedTimeToFresh: number | null;
  /** Estimated fraction of maximal capacity lost: 0.0–0.25. See FATIGUE_MODEL.md §5. */
  readonly performanceImpairmentEstimate: number;
  readonly trainingCapacity: TrainingCapacity;

  readonly confidence: number;
  readonly dataCompleteness: DataCompleteness;
  readonly modelId: 'fatigue-v1';
  readonly computedAt: Date;
  readonly trainingDayId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Ephemeral signals (per FATIGUE_MODEL.md §5, ADR-004)
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueSignals = {
  readonly fatigueLevel: FatigueLevel;
  readonly fatigueType: FatigueType;
  readonly fatigueTrajectory: FatigueTrajectory;

  readonly dominantFatigueDimension: FatigueDominantDimension;
  readonly primaryLimitingFactor: string;

  readonly functionalOverreachingRisk: OverreachingRisk;
  readonly estimatedTimeToFresh: number | null;
  readonly performanceImpairmentEstimate: number;
  readonly trainingCapacity: TrainingCapacity;

  readonly isAccumulating: boolean;
  readonly consecutiveAccumulationDays: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Decision and Recommendation
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueVerdict =
  | 'BUILD' // increase training load safely
  | 'MAINTAIN' // sustain current load
  | 'REDUCE' // reduce intensity or volume
  | 'REST_WEEK' // full deload week recommended
  | 'TAPER' // race-preparation reduction
  | 'INSUFFICIENT_DATA';

export type FatigueDecision = {
  readonly verdict: FatigueVerdict;
  readonly trainingCapacity: TrainingCapacity;
  /** Localizable evidence points driving this decision (max 3). */
  readonly rationale: readonly I18nItem[];
};

export type FatigueRecommendation = {
  readonly type: FatigueVerdict;
  /** 2–3 localizable evidence items surfaced to the athlete. */
  readonly keyEvidence: readonly I18nItem[];
  readonly confidence: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Model output
// ─────────────────────────────────────────────────────────────────────────────

export type FatigueModelOutput = {
  readonly signals: FatigueSignals;
  readonly fatigueState: FatigueState;
  readonly decision: FatigueDecision;
  readonly recommendation: FatigueRecommendation;
};

// ─────────────────────────────────────────────────────────────────────────────
// Model context (non-feature inputs — from Digital Twin)
// ─────────────────────────────────────────────────────────────────────────────

import type { EnvironmentalImpact } from '@/core/environment';

export type FatigueModelContext = {
  readonly trainingDayId: string;
  readonly athleteId: string;

  /**
   * Recovery state from the Digital Twin (from the last Recovery Model run).
   * Used for the Neuromuscular dimension (autonomic score) and Cumulative
   * dimension (sleepDebt, dissonance).
   * Null on cold start before the Recovery Model has run.
   */
  readonly recoveryState: RecoveryState | null;

  /**
   * Number of consecutive days with FatigueIndex > 55 ending with yesterday.
   * Drives the CumulativeTrajectory dimension's accumulation pressure.
   * 0 on cold start (no history).
   */
  readonly consecutiveAccumulationDays: number;

  /**
   * FatigueIndex values for the last 14 days (most recent first), excluding today.
   * Used to compute trajectory direction (RESOLVING / STABLE / ACCUMULATING).
   * Empty array on cold start.
   */
  readonly recentFatigueHistory: readonly number[];

  /** Optional overlay from Environmental Context Engine. */
  readonly environmentalImpact?: EnvironmentalImpact | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal scoring types (used within scoring.ts only)
// ─────────────────────────────────────────────────────────────────────────────

export type DimensionScore = {
  readonly score: number | null;
  readonly available: boolean;
  readonly qualityFactor: number;
};

export type ScoredFatigueDimensions = {
  readonly load: DimensionScore;
  readonly neuromuscular: DimensionScore;
  readonly metabolic: DimensionScore;
  readonly cumulative: DimensionScore;
  readonly psychological: DimensionScore;
};
