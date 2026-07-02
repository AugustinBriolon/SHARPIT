/**
 * FATIGUE MODEL v1 — Explanation Generator
 *
 * Generates human-readable explanations from Fatigue Model outputs.
 * Template-based in v1 — fully deterministic.
 *
 * Can be replaced with AI generation in v2 without changing the rest of the pipeline.
 */

import type {
  FatigueLevel,
  FatigueSignals,
  FatigueDecision,
  ScoredFatigueDimensions,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<FatigueLevel, string> = {
  FRESH: 'fresh (no detectable fatigue)',
  FUNCTIONAL_LOW: 'functional — low (normal training fatigue)',
  FUNCTIONAL_HIGH: 'functional — high (productive load state)',
  ACCUMULATED: 'accumulated (exceeding normal training fatigue)',
  NON_FUNCTIONAL_RISK: 'elevated risk (performance likely impaired)',
  OVERREACHING_RISK: 'overreaching risk (mandatory rest indicated)',
  INSUFFICIENT_DATA: 'undetermined (insufficient data)',
};

const TRAJECTORY_LABELS: Record<FatigueSignals['fatigueTrajectory'], string> = {
  RESOLVING: 'fatigue is decreasing — recovery is working',
  STABLE: 'fatigue is stable — no significant change in recent days',
  ACCUMULATING: 'fatigue is increasing — monitor closely',
  ACCELERATING: 'fatigue is accelerating — load reduction is critical',
};

const CAPACITY_LABELS: Record<FatigueSignals['trainingCapacity'], string> = {
  FULL: 'full training capacity available',
  REDUCED: 'reduced capacity — avoid high-intensity sessions',
  LIGHT_ONLY: 'light training only (Z1–Z2, no intervals)',
  REST_ONLY: 'rest or active recovery only',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main explanation builder
// ─────────────────────────────────────────────────────────────────────────────

export function generateFatigueExplanation(
  fatigueIndex: number | null,
  level: FatigueLevel,
  signals: FatigueSignals,
  dims: ScoredFatigueDimensions,
  decision: FatigueDecision,
  confidence: number,
): string {
  const parts: string[] = [];

  // ── Opening: fatigue index + level ────────────────────────────────────────
  if (fatigueIndex !== null) {
    const confidenceLabel =
      confidence >= 0.8
        ? 'based on complete data'
        : confidence >= 0.6
          ? 'based on available data'
          : 'based on limited data';
    parts.push(
      `Your fatigue index today is **${fatigueIndex}/100** (${LEVEL_LABELS[level]}), ${confidenceLabel}.`,
    );
  } else {
    parts.push(
      `Fatigue index: **undetermined** — not enough data to compute a reliable estimate. Connect a training device and log sessions consistently.`,
    );
    return parts.join(' ');
  }

  // ── Trajectory ────────────────────────────────────────────────────────────
  if (dims.cumulative.available || signals.consecutiveAccumulationDays > 0) {
    parts.push(`**Trend:** ${TRAJECTORY_LABELS[signals.fatigueTrajectory]}.`);
  }

  // ── Primary limiting dimension ────────────────────────────────────────────
  if (level !== 'FRESH' && level !== 'FUNCTIONAL_LOW') {
    parts.push(`**Primary concern:** ${signals.primaryLimitingFactor}.`);
  }

  // ── Per-dimension highlights (only notable findings) ─────────────────────
  if (dims.load.available && dims.load.score !== null && dims.load.score > 60) {
    parts.push(
      `**Load fatigue (${dims.load.score}/100):** your training load relative to your chronic baseline is elevated. ` +
        (dims.load.score > 85
          ? 'This is a critical load spike — injury risk is elevated.'
          : 'Monitor the trend carefully before adding more volume.'),
    );
  }

  if (
    dims.neuromuscular.available &&
    dims.neuromuscular.score !== null &&
    dims.neuromuscular.score > 60
  ) {
    parts.push(
      `**Neuromuscular fatigue (${dims.neuromuscular.score}/100):** ` +
        (dims.neuromuscular.score > 80
          ? 'significant neuromuscular stress detected — reduce mechanical loading (avoid downhill running, heavy strength work).'
          : 'moderate neuromuscular stress — prefer low-impact modalities today.'),
    );
  }

  if (dims.metabolic.available && dims.metabolic.score !== null && dims.metabolic.score > 55) {
    parts.push(
      `**Metabolic fatigue (${dims.metabolic.score}/100):** recent high-intensity sessions are still creating metabolic stress. Prioritize carbohydrate replenishment and sleep for recovery.`,
    );
  }

  if (
    dims.psychological.available &&
    dims.psychological.score !== null &&
    dims.psychological.score > 60
  ) {
    if (signals.fatigueType === 'PSYCHOLOGICAL_DOMINANT') {
      parts.push(
        `**Psychological fatigue (${dims.psychological.score}/100):** your subjective indicators suggest motivational/psychological fatigue. ` +
          `This may not be training-origin — consider external stressors (work, sleep environment, life events).`,
      );
    } else {
      parts.push(
        `**Psychological fatigue (${dims.psychological.score}/100):** low mood or energy levels noted alongside physical fatigue. Adequate rest and nutrition will address both.`,
      );
    }
  }

  // ── Overreaching risk ─────────────────────────────────────────────────────
  if (signals.functionalOverreachingRisk === 'CRITICAL') {
    parts.push(
      '**⚠ Critical overreaching risk.** ' +
        'Multiple indicators are simultaneously elevated and fatigue has been accumulating for several days. ' +
        'Continued training without a full deload is likely to result in performance decrements or injury.',
    );
  } else if (signals.functionalOverreachingRisk === 'HIGH') {
    parts.push(
      `**Overreaching risk: HIGH.** Fatigue has been accumulating for ${signals.consecutiveAccumulationDays} day(s). ` +
        'A structured deload is strongly recommended within the next 2–3 days.',
    );
  }

  // ── Training capacity ─────────────────────────────────────────────────────
  parts.push(`**Training capacity:** ${CAPACITY_LABELS[signals.trainingCapacity]}.`);

  // ── Decision rationale ────────────────────────────────────────────────────
  if (decision.verdict !== 'INSUFFICIENT_DATA' && decision.rationale.length > 0) {
    parts.push(`**Load guidance:** ${decision.rationale[0]}`);
  }

  // ── Time to fresh ─────────────────────────────────────────────────────────
  if (signals.estimatedTimeToFresh !== null && level !== 'FRESH') {
    const text =
      signals.estimatedTimeToFresh === 14
        ? 'Estimated recovery time exceeds 14 days — clinical assessment may be warranted.'
        : `Estimated ${signals.estimatedTimeToFresh} day(s) to return to a fresh state with appropriate recovery.`;
    parts.push(text);
  }

  // ── Low confidence disclaimer ─────────────────────────────────────────────
  if (confidence < 0.4) {
    parts.push(
      '⚠ Confidence is very low — this estimate is tentative. ' +
        'Wearing a heart rate monitor daily and logging training sessions consistently will significantly improve accuracy.',
    );
  }

  return parts.join(' ');
}
