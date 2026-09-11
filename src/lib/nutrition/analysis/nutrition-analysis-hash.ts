import { createHash } from 'node:crypto';
import type { NutritionAnalysisFacts } from './nutrition-analysis-facts';

/** Bump when the prompt or output schema changes meaningfully — stored readings then read as stale. */
export const NUTRITION_ANALYSIS_VERSION = 1;

/** Regeneration key: the facts are built in a fixed key order, so their JSON is stable. */
export function nutritionAnalysisInputHash(facts: NutritionAnalysisFacts): string {
  return createHash('sha256')
    .update(`v${NUTRITION_ANALYSIS_VERSION}:${JSON.stringify(facts)}`)
    .digest('hex');
}
