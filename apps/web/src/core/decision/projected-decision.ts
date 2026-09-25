/**
 * Decision Engine wrapper for projected future days.
 */

import { runDecisionEngine } from '@/core/decision/decision-engine';
import type { DecisionEngineInput, DecisionEngineOutput } from '@/core/decision/decision-state';

const MIN_PROJECTED_FRESHNESS = 0.25;

export function runProjectedDecision(
  input: DecisionEngineInput & {
    readonly dayOffset: number;
    readonly baseFreshnessConfidence: number;
  },
): DecisionEngineOutput {
  const { dayOffset, baseFreshnessConfidence, freshnessConfidence, ...engineInput } = input;
  const decayed =
    freshnessConfidence ??
    Math.max(MIN_PROJECTED_FRESHNESS, baseFreshnessConfidence * 0.92 ** dayOffset);

  return runDecisionEngine({
    ...engineInput,
    freshnessConfidence: decayed,
  });
}
