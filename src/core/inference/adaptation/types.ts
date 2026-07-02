/**
 * ADAPTATION MODEL v1 — Domain Types
 *
 * Types specific to the Adaptation Intelligence Model.
 * Implements the type contracts defined in docs/models/ADAPTATION_MODEL.md §5–6.
 *
 * Key design: adaptation ≠ fatigue ≠ recovery.
 * See ADAPTATION_MODEL.md §2 for the conceptual distinction.
 */

import type {
  DataCompleteness,
  DimensionResult,
  RecoveryState,
  FatigueState,
} from '@/core/digital-twin/types';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export digital twin types for convenience
// ─────────────────────────────────────────────────────────────────────────────

export type { DataCompleteness, DimensionResult, RecoveryState, FatigueState };
export type { AdaptationStatus, AdaptationTrend, AdaptationState } from '@/core/digital-twin/types';

// ─────────────────────────────────────────────────────────────────────────────
// Ephemeral signals (per ADAPTATION_MODEL.md §5, ADR-004)
// ─────────────────────────────────────────────────────────────────────────────

export type AdaptationSignals = {
  readonly adaptationIndex: number | null;
  readonly adaptationStatus: import('@/core/digital-twin/types').AdaptationStatus;
  readonly adaptationTrend: import('@/core/digital-twin/types').AdaptationTrend;
  readonly dimensionScores: {
    readonly loadProgression: number | null;
    readonly neuromuscularEfficiency: number | null;
    readonly autonomicAdaptation: number | null;
    readonly recoveryQuality: number | null;
  };
  readonly plateauRisk: boolean;
  readonly overreachingWithoutAdaptationDetected: boolean;
  readonly availableDimensionCount: number;
  readonly totalAvailableWeight: number;
  readonly confidence: number;
  readonly historyLength: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Decision and Recommendation
// ─────────────────────────────────────────────────────────────────────────────

export type AdaptationVerdict =
  | 'INCREASE_LOAD'
  | 'SUSTAIN'
  | 'CONSOLIDATE'
  | 'REDUCE_LOAD'
  | 'RECOVERY_PRIORITY'
  | 'INSUFFICIENT_DATA';

export type AdaptationDecision = {
  readonly verdict: AdaptationVerdict;
  readonly loadMultiplier: number;
  readonly rationale: readonly string[];
};

export type AdaptationRecommendation = {
  readonly type: AdaptationVerdict;
  readonly title: string;
  readonly summary: string;
  readonly keyEvidence: readonly string[];
  readonly limitingFactor: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Model output
// ─────────────────────────────────────────────────────────────────────────────

export type AdaptationModelOutput = {
  readonly signals: AdaptationSignals;
  readonly adaptationState: import('@/core/digital-twin/types').AdaptationState;
  readonly decision: AdaptationDecision;
  readonly recommendation: AdaptationRecommendation;
  readonly explanation: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Model context (non-feature inputs — from Digital Twin + history)
// ─────────────────────────────────────────────────────────────────────────────

export type AdaptationModelContext = {
  readonly trainingDayId: string;
  readonly athleteId: string;

  /**
   * Current RecoveryState from the Digital Twin (Recovery Intelligence output).
   * Used for recoveryQuality dimension.
   * Null on cold start before Recovery Model has run.
   */
  readonly recoveryState: RecoveryState | null;

  /**
   * Current FatigueState from the Digital Twin (Fatigue Intelligence output).
   * Used for recoveryQuality dimension and overreaching detection.
   * Null on cold start before Fatigue Model has run.
   */
  readonly fatigueState: FatigueState | null;

  /**
   * AdaptationIndex values for the last 28 days (most recent first), excluding today.
   * Used to compute adaptationTrend and detect plateau patterns.
   * Empty array on cold start.
   */
  readonly recentAdaptationHistory: readonly number[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal scoring types (used within scoring.ts only)
// ─────────────────────────────────────────────────────────────────────────────

export type DimensionScore = {
  readonly score: number | null;
  readonly available: boolean;
  readonly reason?: string;
};

export type ScoredAdaptationDimensions = {
  readonly loadProgression: DimensionScore;
  readonly neuromuscularEfficiency: DimensionScore;
  readonly autonomicAdaptation: DimensionScore;
  readonly recoveryQuality: DimensionScore;
};
