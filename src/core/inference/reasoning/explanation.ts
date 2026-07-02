/**
 * REASONING ENGINE v1 — Explanation Generator
 *
 * Template-based explanation generator.
 * Pure function — no side effects, no DB calls.
 */

import type { ReasoningState } from '@/core/digital-twin/types';
import type { ReasoningSignals } from './types';

export function generateReasoningExplanation(
  state: ReasoningState,
  signals: ReasoningSignals,
  athleteId: string,
): string {
  const lines: string[] = [];

  // Verdict opening
  lines.push(buildVerdictSentence(state));

  // Consistency statement
  lines.push(buildConsistencySentence(signals));

  // Limiting factor
  if (state.limitingFactor.system && state.limitingFactor.description) {
    lines.push(
      `The primary constraint is ${state.limitingFactor.system.toLowerCase()} — specifically, ${state.limitingFactor.description}.`,
    );
  }

  // Conflicts
  if (state.conflicts.length > 0) {
    const [c] = state.conflicts;
    lines.push(
      `Cross-model conflict detected (${c.type.replace(/_/g, ' ').toLowerCase()}): ${c.resolution}`,
    );
  }

  // Top opportunity
  if (state.opportunities.length > 0) {
    const [opp] = state.opportunities;
    lines.push(`Highest-value opportunity: ${opp.title}. ${opp.rationale}`);
  }

  // Critical finding (if any)
  const criticalFinding = state.keyFindings.find((f) => f.severity === 'CRITICAL');
  if (criticalFinding) {
    lines.push(`Critical: ${criticalFinding.title}`);
  }

  // Top action
  if (state.topAction) {
    lines.push(
      `Recommended action: ${state.topAction.verb} — ${state.topAction.focus}. ${state.topAction.rationale}`,
    );
  }

  // Confidence footer
  lines.push(
    `Overall confidence: ${Math.round(state.confidence * 100)}% (${state.dataCompleteness.toLowerCase()} data, ${signals.availableModelCount}/3 models active).`,
  );

  return lines.join(' ');
}

function buildVerdictSentence(state: ReasoningState): string {
  switch (state.overallVerdict) {
    case 'TRAIN_HARD':
      return 'All physiological systems are aligned and indicate high training capacity — today is a high-value day for a demanding session.';
    case 'TRAIN_SMART':
      return 'Physiological systems are in a moderate state. Training is productive but should be approached with quality over volume.';
    case 'TRAIN_EASY':
      return 'Training capacity is reduced across one or more systems. An easy, low-intensity session maintains fitness without deepening fatigue.';
    case 'RECOVER':
      return 'One or more physiological systems are in a recovery-critical state. Rest is the highest-value action today — training would deepen the deficit.';
    case 'RACE_READY':
      return 'Physiological markers indicate peak form is imminent or present. Protect this window — prioritise sleep, nutrition, and minimal training stress.';
    case 'CAUTION':
      return 'Cross-system conflicts detected. Conditions are contradictory — proceed with extreme caution and prefer a very easy or rest day.';
    case 'INSUFFICIENT_DATA':
      return 'Insufficient physiological data to produce a confident verdict. At least 2 active models are required — running more inference will improve guidance.';
  }
}

function buildConsistencySentence(signals: ReasoningSignals): string {
  const modelCount = signals.availableModelCount;
  const pct = signals.consistencyScore;

  if (signals.physiologicalConsistency === 'INSUFFICIENT_DATA') {
    return `Only ${modelCount} model(s) available — cross-model consistency cannot be evaluated.`;
  }

  const dir = signals.modelDirections;
  const dirSummary = `Recovery→${dir.recovery}, Fatigue→${dir.fatigue}, Adaptation→${dir.adaptation}`;

  switch (signals.physiologicalConsistency) {
    case 'ALIGNED':
      return `All active models are aligned (consistency score: ${pct}/100 — ${dirSummary}).`;
    case 'PARTIALLY_ALIGNED':
      return `Models are partially aligned (consistency score: ${pct}/100 — ${dirSummary}). Some divergence is present but not contradictory.`;
    case 'CONFLICTING':
      return `Active models are conflicting (consistency score: ${pct}/100 — ${dirSummary}). Directional signals from different systems point in opposite directions.`;
  }
}
