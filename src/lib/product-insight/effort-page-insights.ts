import { buildEffortInsightBundle } from '@/core/product-insight/effort-insights';
import { mapFatigueCapacityLabel, mapFatigueTypeToLabel } from '@/lib/today/today-mapping';
import type { FatigueType, TrainingCapacity } from '@/lib/today/today-mapping';

export function buildEffortPageInsights(params: {
  strainScore: number | null;
  fatigueType: FatigueType;
  verdictLabel: string;
  rationale: string[];
  trainingCapacity: TrainingCapacity;
  dominantDimension: string | null;
  primaryLimitingFactor: string | null;
  estimatedDaysToFresh: number | null;
  performancePercent: number | null;
  acwr: number;
  weeklyLoad: number;
  tsb: number | null;
  overreachingLabel?: string | null;
  keyEvidence: string[];
  confidence: number;
}) {
  return buildEffortInsightBundle({
    strainScore: params.strainScore,
    fatigueTypeLabel: mapFatigueTypeToLabel(params.fatigueType),
    verdictLabel: params.verdictLabel,
    rationale: params.rationale,
    trainingCapacityLabel: mapFatigueCapacityLabel(params.trainingCapacity),
    dominantDimensionLabel: params.dominantDimension,
    limitingFactorLabel: params.primaryLimitingFactor,
    estimatedDaysToFresh: params.estimatedDaysToFresh,
    performancePercent: params.performancePercent,
    acwr: params.acwr,
    weeklyLoad: params.weeklyLoad,
    tsb: params.tsb,
    overreachingLabel: params.overreachingLabel,
    keyEvidence: params.keyEvidence,
    confidence: params.confidence,
  });
}
