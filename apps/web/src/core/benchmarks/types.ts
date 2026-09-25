/**
 * SHARPIT — Scientific Benchmark Framework: Type System
 *
 * This module defines the type contracts for SHARPIT's inference model benchmarking.
 *
 * Design principles:
 *   1. Scenarios are pure data — no test framework dependency.
 *   2. Expectations support both strict values and acceptable-value sets.
 *   3. Safety-critical expectations carry higher weight (weight ≥ 3.0).
 *   4. The ModelDescriptor interface allows any inference implementation to be evaluated.
 *   5. BenchmarkReport is the serializable artifact produced after each run.
 *
 * Analogous to ML evaluation: scenarios are the test dataset, the runner is the
 * evaluation harness, and the report is the eval metric summary.
 */

import type { DayFeatures, RecoveryFeatureSet, LoadFeatureSet } from '@/core/features/types';
import type {
  RecoveryModelContext,
  RecoveryModelOutput,
  RecoveryVerdict,
  RecommendedIntensity,
  RecoverySignals,
} from '@/core/inference/recovery/types';
import type { ReadinessCategory, OverreachingRisk, IllnessRisk } from '@/core/digital-twin/types';

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports (convenience — consumers only need to import from this module)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  DayFeatures,
  RecoveryFeatureSet,
  LoadFeatureSet,
  RecoveryModelContext,
  RecoveryModelOutput,
  RecoveryVerdict,
  RecommendedIntensity,
  RecoverySignals,
  ReadinessCategory,
  OverreachingRisk,
  IllnessRisk,
};

// ─────────────────────────────────────────────────────────────────────────────
// Model descriptor — the unit of evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A versioned inference model that can be evaluated by the benchmark runner.
 *
 * Pass different `run` implementations to compare model versions:
 *   - v1: runRecoveryModel (current implementation)
 *   - v2: hypothetical improved model
 *   - experiment: A/B test variant
 */
export type ModelDescriptor = {
  readonly id: string;
  readonly version: string;
  readonly description?: string;
  readonly run: (features: DayFeatures, context: RecoveryModelContext) => RecoveryModelOutput;
};

// ─────────────────────────────────────────────────────────────────────────────
// Athlete profile
// ─────────────────────────────────────────────────────────────────────────────

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export type AthleteProfile = {
  /** Short identifier for this profile (e.g. 'INTERMEDIATE_TRIATHLETE'). */
  readonly id: string;
  /** Human-readable label. */
  readonly label: string;
  readonly experienceLevel: ExperienceLevel;
  readonly primarySport: 'TRIATHLON' | 'CYCLING' | 'RUNNING' | 'STRENGTH' | 'MULTI_SPORT';
  /** Full narrative description for documentation and report readability. */
  readonly description: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Literature references
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evidence level hierarchy (Oxford Centre for Evidence-Based Medicine, 2011).
 * L1 = systematic review/meta-analysis (highest)
 * L5 = expert opinion/practitioner consensus (lowest)
 */
export type EvidenceLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export type LiteratureReference = {
  readonly authors: string;
  readonly year: number;
  readonly title: string;
  readonly journal?: string;
  readonly doi?: string;
  readonly evidenceLevel: EvidenceLevel;
};

// ─────────────────────────────────────────────────────────────────────────────
// Expectation types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Expectation for a categorical output value.
 *
 * `acceptable` lists all physiologically valid values:
 *   - Single-element array → strict requirement (only one valid output)
 *   - Multi-element array → any of these values satisfies the expectation
 *
 * `weight` determines impact on the scientific regression score:
 *   1.0 = standard (informational, can tolerate failure)
 *   2.0 = physiologically important (should pass; failure warrants attention)
 *   3.0 = safety-critical (MUST pass; failure blocks deployment)
 */
export type ValueExpectation<T> = {
  /** One or more acceptable values. The model may produce any value in this set. */
  readonly acceptable: readonly T[];
  /** Physiological justification for this expectation. */
  readonly rationale: string;
  readonly weight: number;
};

/**
 * Expectation for a numerical output within an inclusive range [min, max].
 * Used for readiness scores, confidence levels, etc.
 */
export type RangeExpectation = {
  readonly min: number;
  readonly max: number;
  readonly rationale: string;
  readonly weight: number;
};

/**
 * Complete set of physiological expectations for one benchmark scenario.
 *
 * Required (always evaluated):
 *   readinessCategory, recommendedIntensity, verdict, confidenceRange
 *
 * Optional (evaluated when defined — include only what is scientifically relevant):
 *   overreachingRisk, illnessRisk, primaryLimitingFactor,
 *   readinessScoreRange, autonomicBalance, sleepAdequacy, dissonanceDetected
 */
export type PhysiologicalExpectations = {
  readonly readinessCategory: ValueExpectation<ReadinessCategory>;
  readonly recommendedIntensity: ValueExpectation<RecommendedIntensity>;
  readonly verdict: ValueExpectation<RecoveryVerdict>;
  readonly confidenceRange: RangeExpectation;
  readonly overreachingRisk?: ValueExpectation<OverreachingRisk>;
  readonly illnessRisk?: ValueExpectation<IllnessRisk>;
  readonly primaryLimitingFactor?: ValueExpectation<
    'autonomic' | 'sleep' | 'subjective' | 'loadContext' | null
  >;
  readonly readinessScoreRange?: RangeExpectation;
  readonly autonomicBalance?: ValueExpectation<RecoverySignals['autonomicBalance']>;
  readonly sleepAdequacy?: ValueExpectation<RecoverySignals['sleepAdequacy']>;
  readonly dissonanceDetected?: ValueExpectation<boolean>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Benchmark scenario
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A self-contained benchmark scenario.
 *
 * Scenarios are pure data — they carry no Vitest or test-framework dependency.
 * They can be evaluated by any runner (Vitest, CLI, CI, A/B harness).
 *
 * Each scenario represents a real physiological situation that an inference
 * model must handle correctly.
 */
export type BenchmarkScenario = {
  /** Short identifier (e.g. 'S01-ACUTE-OVERLOAD'). */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** One-paragraph description of the physiological situation. */
  readonly description: string;
  readonly athlete: AthleteProfile;
  /** Feature inputs the model will receive. */
  readonly features: DayFeatures;
  /** Non-feature context passed to the model. */
  readonly context: RecoveryModelContext;
  /** All physiological expectations this scenario asserts. */
  readonly expectations: PhysiologicalExpectations;
  /** Training periodization phase (e.g. "BASE week 6", "Pre-race taper"). */
  readonly physiologicalPhase: string;
  /** Scientific explanation of what this scenario validates and why. */
  readonly rationale: string;
  readonly literature: readonly LiteratureReference[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation results
// ─────────────────────────────────────────────────────────────────────────────

/** Result of evaluating one individual expectation. */
export type ExpectationResult = {
  /** Field name being evaluated (e.g. 'readinessCategory', 'confidence'). */
  readonly expectationId: string;
  /** The physiological rationale (copied from the expectation). */
  readonly label: string;
  readonly weight: number;
  readonly met: boolean;
  /** Expected value or range, formatted for display. */
  readonly expected: string;
  /** Actual value produced by the model, formatted for display. */
  readonly actual: string;
};

/** Result of running all expectations for one scenario. */
export type ScenarioResult = {
  readonly scenarioId: string;
  readonly scenarioName: string;
  /** True only when ALL expectations are met. */
  readonly passed: boolean;
  /** Proportion of individual expectations met (unweighted, 0–1). */
  readonly passRate: number;
  /** Weight-adjusted pass rate (0–1). Safety-critical failures penalized more. */
  readonly weightedPassRate: number;
  readonly expectations: readonly ExpectationResult[];
  readonly modelOutput: RecoveryModelOutput;
};

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate metrics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How well the model's stated confidence correlates with actual correctness.
 *
 * WELL_CALIBRATED:    Confidence is within the expected range for ≥ 80% of scenarios.
 * MISCALIBRATED:      Confidence is outside the expected range for > 20% of scenarios.
 * INSUFFICIENT_DATA:  Fewer than 3 scenarios to assess calibration.
 */
export type ConfidenceCalibration = 'WELL_CALIBRATED' | 'MISCALIBRATED' | 'INSUFFICIENT_DATA';

export type BenchmarkMetrics = {
  /** Proportion of ALL individual expectations that were met (unweighted, 0–1). */
  readonly passRate: number;
  /** Proportion of scenarios where ALL expectations were met (0–1). */
  readonly scenarioPassRate: number;
  /** Weight-adjusted pass rate (0–1). Safety-critical failures penalized more. */
  readonly weightedPassRate: number;
  /** How well model confidence correlates with expected confidence ranges. */
  readonly confidenceCalibration: ConfidenceCalibration;
  /** Proportion of decision expectations (verdict + intensity) that were met (0–1). */
  readonly decisionConsistency: number;
  /** Proportion of recommendation type expectations that were met (0–1). */
  readonly recommendationConsistency: number;
  /** Proportion of safety-critical (weight ≥ 3.0) expectations that were met (0–1). */
  readonly safetyScore: number;
  /**
   * Composite score [0–100]. The primary deployment gate metric.
   * Formula: (weightedPassRate × 0.7 + safetyScore × 0.3) × 100
   * A healthy model scores 100. Any regression reduces this score.
   */
  readonly scientificRegressionScore: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Benchmark report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete, serializable output produced by one benchmark run.
 * This is the artifact that should be committed to version control
 * when a new model version is evaluated.
 */
export type BenchmarkReport = {
  readonly modelId: string;
  readonly modelVersion: string;
  readonly executedAt: Date;
  readonly durationMs: number;
  readonly totalScenarios: number;
  readonly metrics: BenchmarkMetrics;
  readonly scenarios: readonly ScenarioResult[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Multi-model comparison
// ─────────────────────────────────────────────────────────────────────────────

/** A regression: the baseline model passed, the candidate model failed. */
export type BenchmarkRegression = {
  readonly scenarioId: string;
  readonly scenarioName: string;
  readonly expectationId: string;
  readonly expectationLabel: string;
  readonly expectedValue: string;
  readonly baselineActual: string;
  readonly candidateActual: string;
  /** True when this regression involves a weight ≥ 3.0 expectation. */
  readonly isSafetyCritical: boolean;
};

/** An improvement: the baseline model failed, the candidate model passed. */
export type BenchmarkImprovement = {
  readonly scenarioId: string;
  readonly scenarioName: string;
  readonly expectationId: string;
  readonly expectationLabel: string;
};

/**
 * Side-by-side comparison of two model versions.
 *
 * `verdict` is the deployment recommendation:
 *   DEPLOY      → no regressions detected, candidate is safe to deploy
 *   INVESTIGATE → non-safety regressions detected, requires review
 *   REJECT      → safety-critical regression detected, candidate must not be deployed
 */
export type ModelComparison = {
  readonly baseline: BenchmarkReport;
  readonly candidate: BenchmarkReport;
  readonly regressions: readonly BenchmarkRegression[];
  readonly improvements: readonly BenchmarkImprovement[];
  readonly verdict: 'DEPLOY' | 'INVESTIGATE' | 'REJECT';
  readonly summary: string;
};
