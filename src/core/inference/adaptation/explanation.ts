/**
 * ADAPTATION MODEL v1 — Explanation Generator
 *
 * Produces human-readable, template-based explanations for the Adaptation
 * Intelligence output. Output is embedded in the DecisionRecord and surfaced
 * in the AI Coach context.
 *
 * References: ADAPTATION_MODEL.md §6
 */

import type { AdaptationState, AdaptationDecision, AdaptationSignals } from './types';

export function generateAdaptationExplanation(
  state: AdaptationState,
  decision: AdaptationDecision,
  signals: AdaptationSignals,
): string {
  if (state.adaptationStatus === 'INSUFFICIENT_DATA') {
    const needed = 14 - signals.historyLength;
    return (
      `Adaptation assessment requires at least 14 days of training data. ` +
      `${needed > 0 ? `${needed} more day(s) needed.` : 'Analysis will improve with continued data collection.'} ` +
      `Connect a device and log sessions to enable full adaptation intelligence.`
    );
  }

  const indexStr = state.adaptationIndex !== null ? `${state.adaptationIndex}/100` : 'unknown';
  const trendStr = {
    IMPROVING: 'improving',
    STABLE: 'stable',
    DECLINING: 'declining',
  }[state.adaptationTrend];

  const statusDesc = {
    POSITIVELY_ADAPTING: 'positive supercompensation',
    MAINTAINING: 'fitness maintenance',
    PLATEAUING: 'adaptation plateau',
    MALADAPTING: 'maladaptation',
    DETRAINING: 'detraining',
    INSUFFICIENT_DATA: 'insufficient data',
  }[state.adaptationStatus];

  let explanation =
    `Adaptation index: ${indexStr} (${statusDesc}). ` +
    `Long-term trend is ${trendStr} based on ${signals.historyLength} days of history. `;

  if (state.limitingFactor) {
    const limitingLabels: Record<string, string> = {
      loadProgression: 'Load progression',
      neuromuscularEfficiency: 'Neuromuscular efficiency',
      autonomicAdaptation: 'Autonomic adaptation (HRV/RHR)',
      recoveryQuality: 'Recovery quality',
    };
    explanation += `Primary limiting factor: ${limitingLabels[state.limitingFactor] ?? state.limitingFactor}. `;
  }

  if (state.overreachingWithoutAdaptationDetected) {
    explanation +=
      'Warning: training load is accumulating without corresponding autonomic adaptation — ' +
      'a pattern consistent with non-functional overreaching. Immediate load reduction is advised. ';
  } else if (state.plateauRisk) {
    explanation +=
      'Plateau risk detected: load is being applied but adaptation has stalled for ≥ 14 days. ' +
      'A stimulus change (intensity variation, volume progression, or sport-specific emphasis) is needed. ';
  }

  explanation += `Recommended action: ${verdictDescription(decision.verdict)} `;
  explanation += `(load multiplier: ×${decision.loadMultiplier.toFixed(2)}).`;

  if (state.estimatedAdaptationPeak !== null) {
    explanation += ` Estimated adaptation peak in ~${state.estimatedAdaptationPeak} day(s).`;
  }

  explanation +=
    ` Confidence: ${Math.round(state.confidence * 100)}% ` +
    `(data completeness: ${state.dataCompleteness}, ${signals.availableDimensionCount}/4 dimensions active).`;

  return explanation;
}

function verdictDescription(verdict: import('./types').AdaptationVerdict): string {
  const map: Record<import('./types').AdaptationVerdict, string> = {
    INCREASE_LOAD: 'Increase training load to break through the current plateau.',
    SUSTAIN: 'Sustain current training progression.',
    CONSOLIDATE: 'Consolidate current fitness before progressing.',
    REDUCE_LOAD: 'Reduce training load to allow adaptive processes to complete.',
    RECOVERY_PRIORITY: 'Prioritise recovery to unlock supercompensation potential.',
    INSUFFICIENT_DATA: 'Insufficient data to prescribe load changes.',
  };
  return map[verdict];
}
