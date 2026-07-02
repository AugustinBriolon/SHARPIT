/**
 * ADAPTATION MODEL v1 — Public API
 *
 * Re-exports the stable public surface of Adaptation Intelligence v1.
 * Internal scoring helpers are intentionally NOT re-exported.
 */

export { runAdaptationModel } from './model';
export type {
  AdaptationModelContext,
  AdaptationModelOutput,
  AdaptationSignals,
  AdaptationDecision,
  AdaptationRecommendation,
  AdaptationVerdict,
} from './types';
export type { AdaptationState, AdaptationStatus, AdaptationTrend } from '@/core/digital-twin/types';
