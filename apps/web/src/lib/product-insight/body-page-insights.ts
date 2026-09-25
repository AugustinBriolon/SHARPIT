import { buildBodyInsightBundle } from '@/core/product-insight/body-insights';

export function buildBodyPageInsights(params: {
  latestWeightKg: number | null;
  weightDelta7d: number | null;
  bodyFatDelta7d: number | null;
  waterPercent: number | null;
  visceralFat: number | null;
  sourceLabel: string | null;
  measuredAtLabel: string | null;
}) {
  return buildBodyInsightBundle(params);
}
