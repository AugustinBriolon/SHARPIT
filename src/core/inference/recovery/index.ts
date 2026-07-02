/**
 * RECOVERY MODEL v1 — Public API
 *
 * The single entry point for the Recovery Inference module.
 * External consumers (Orchestrator, tests) import from here only.
 */

export { runRecoveryModel } from './model';
export { generateExplanation } from './explanation';
export {
  scoreAutonomic,
  scoreSleep,
  scoreSubjective,
  scoreLoadContext,
  scoreAllDimensions,
  synthesizeScore,
} from './scoring';

export type {
  RecoveryModelOutput,
  RecoveryModelContext,
  RecoverySignals,
  RecoveryDecision,
  RecoveryRecommendation,
  RecoveryVerdict,
  RecommendedIntensity,
  ReadinessCategory,
  OverreachingRisk,
  IllnessRisk,
  RecoveryState,
  DimensionScore,
  ScoredDimensions,
} from './types';
