import { buildRecoveryInsightBundle } from '@sharpit/core/product-insight/recovery-insights';
import type { RecoveryInsightInput } from '@sharpit/core/product-insight/types';

export function buildRecoveryPageInsights(input: RecoveryInsightInput) {
  return buildRecoveryInsightBundle(input);
}
