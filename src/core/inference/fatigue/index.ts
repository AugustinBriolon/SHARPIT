/**
 * FATIGUE MODEL v1 — Public API
 *
 * Single entry point for the Fatigue Intelligence module.
 * Import from this module only — do not import from submodules directly.
 */

export { runFatigueModel } from './model';

export type {
  FatigueModelContext,
  FatigueModelOutput,
  FatigueState,
  FatigueSignals,
  FatigueDecision,
  FatigueRecommendation,
  FatigueLevel,
  FatigueType,
  FatigueTrajectory,
  TrainingCapacity,
  FatigueVerdict,
  FatigueDominantDimension,
  DimensionScore as FatigueDimensionScore,
  ScoredFatigueDimensions,
} from './types';
