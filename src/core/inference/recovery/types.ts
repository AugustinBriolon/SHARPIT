/**
 * RECOVERY MODEL v1 — Domain Types
 *
 * Types specific to the Recovery Synthesis Model.
 * Implements the type contracts defined in RECOVERY_MODEL.md §6–7.
 *
 * All types here are value objects — they carry data, no behavior.
 */

import type {
  ReadinessCategory,
  OverreachingRisk,
  IllnessRisk,
  RecoveryState,
  DimensionResult,
} from '@/core/digital-twin/types';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export digital twin types for convenience
// ─────────────────────────────────────────────────────────────────────────────

export type { ReadinessCategory, OverreachingRisk, IllnessRisk, RecoveryState, DimensionResult };

// ─────────────────────────────────────────────────────────────────────────────
// Ephemeral signals (per RECOVERY_MODEL.md §6)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signals produced during one inference pass of the Recovery Model.
 * These are ephemeral — they are embedded into the DecisionRecord
 * but NOT persisted independently (per ADR-004).
 */
export type RecoverySignals = {
  /** Autonomic nervous system balance — primary recovery marker (HRV + RHR). */
  readonly autonomicBalance:
    'ENHANCED' | 'NORMAL' | 'MILDLY_SUPPRESSED' | 'SUPPRESSED' | 'CRITICALLY_SUPPRESSED';

  /** Sleep restoration quality. */
  readonly sleepAdequacy: 'EXCELLENT' | 'ADEQUATE' | 'INSUFFICIENT' | 'SEVERELY_INSUFFICIENT';

  /** Subjective readiness self-report. */
  readonly subjectiveWellness: 'HIGH' | 'NORMAL' | 'LOW' | 'VERY_LOW';

  /** Load-to-recovery context — is training stress manageable? */
  readonly loadStressContext: 'UNDERTRAINED' | 'OPTIMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

  /**
   * Cross-dimensional risk signal.
   * Emerges when multiple dimensions simultaneously indicate incomplete recovery.
   */
  readonly overreachingRisk: OverreachingRisk;

  /**
   * Pattern consistent with immune activation.
   * NOT a diagnosis — indicates the physiological pattern warrants attention.
   */
  readonly illnessRisk: IllnessRisk;

  /**
   * True when objective (HRV, sleep) and subjective markers disagree > 20 points.
   * Diagnostically significant — see RECOVERY_MODEL.md §9.1.
   */
  readonly dissonanceDetected: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Decision (action verdict)
// ─────────────────────────────────────────────────────────────────────────────

export type RecoveryVerdict =
  'RECOVERED' | 'PARTIALLY_RECOVERED' | 'FATIGUED' | 'OVERREACHED' | 'INSUFFICIENT_DATA';

export type RecommendedIntensity = 'REST' | 'VERY_EASY' | 'EASY' | 'MODERATE' | 'HARD';

export type RecoveryDecision = {
  readonly verdict: RecoveryVerdict;
  readonly recommendedIntensity: RecommendedIntensity;
  /** Evidence points driving this decision (max 3, for UI display). */
  readonly rationale: readonly string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation (athlete-facing output)
// ─────────────────────────────────────────────────────────────────────────────

export type RecoveryRecommendation = {
  readonly type: RecommendedIntensity;
  /** Short athlete-facing title (< 60 chars). */
  readonly title: string;
  /** One-paragraph summary. */
  readonly summary: string;
  /** 2–3 evidence points surfaced to the athlete. */
  readonly keyEvidence: readonly string[];
  readonly confidence: number;
  /** The dimension most limiting recovery today (null if full recovery). */
  readonly limitingFactor: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Model output
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete output of one Recovery Model inference pass.
 * All fields are pure values — no side effects.
 *
 * The Orchestrator takes this output and:
 *   1. Writes signals + stateUpdate to a DecisionRecord
 *   2. Applies stateUpdate to the Digital Twin
 *   3. Returns recommendation to the API caller
 */
export type RecoveryModelOutput = {
  readonly signals: RecoverySignals;
  readonly recoveryState: RecoveryState;
  readonly decision: RecoveryDecision;
  readonly recommendation: RecoveryRecommendation;
  readonly explanation: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Model context (non-feature inputs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Additional context the Recovery Model needs that is NOT in DayFeatures.
 * Provided by the Orchestrator from the Digital Twin before calling the model.
 */
export type RecoveryModelContext = {
  /** Previous readiness score (from Digital Twin) — for trend computation. */
  readonly previousReadinessScore: number | null;
  /** Training day being inferred. */
  readonly trainingDayId: string;
  readonly athleteId: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal scoring types (used within scoring.ts only)
// ─────────────────────────────────────────────────────────────────────────────

export type DimensionScore = {
  readonly score: number | null;
  readonly available: boolean;
  readonly qualityFactor: number;
};

export type ScoredDimensions = {
  readonly autonomic: DimensionScore;
  readonly sleep: DimensionScore;
  readonly subjective: DimensionScore;
  readonly loadContext: DimensionScore;
};
