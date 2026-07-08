import { buildRecoveryInsightBundle } from '@/core/product-insight/recovery-insights';
import type { RecoveryInsightInput } from '@/core/product-insight/types';

export function buildRecoveryPageInsights(input: RecoveryInsightInput) {
  return buildRecoveryInsightBundle(input);
}
