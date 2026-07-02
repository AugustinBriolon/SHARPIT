/**
 * RECOVERY MODEL v1 — Explanation Generator
 *
 * Generates human-readable explanations from Recovery Model outputs.
 * Template-based in v1 — no AI generation, fully deterministic.
 *
 * Design goals:
 *   1. Explain the score in terms the athlete understands.
 *   2. Surface the primary limiting factor clearly.
 *   3. Acknowledge uncertainty when confidence is low.
 *   4. Never generate a recommendation without rationale.
 *   5. Maintain scientific honesty (no false precision).
 *
 * Can be replaced with AI generation in v2 without changing the rest of the pipeline.
 */

import type {
  RecoverySignals,
  RecoveryDecision,
  ReadinessCategory,
  ScoredDimensions,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ReadinessCategory, string> = {
  OPTIMAL: 'excellent',
  ADEQUATE: 'good',
  REDUCED: 'partial',
  LOW: 'incomplete',
  VERY_LOW: 'insufficient',
  BASELINE_PENDING: 'undetermined (baseline accumulating)',
  INSUFFICIENT_DATA: 'undetermined (insufficient data)',
};

const AUTONOMIC_LABELS: Record<RecoverySignals['autonomicBalance'], string> = {
  ENHANCED: 'your autonomic nervous system is showing enhanced recovery (HRV above baseline)',
  NORMAL: 'your autonomic balance is within normal range',
  MILDLY_SUPPRESSED: 'mild autonomic suppression is detected (HRV slightly below baseline)',
  SUPPRESSED: 'your autonomic nervous system shows suppression (HRV below baseline)',
  CRITICALLY_SUPPRESSED:
    'significant autonomic suppression is detected (HRV well below baseline) — this is the primary concern today',
};

const SLEEP_LABELS: Record<RecoverySignals['sleepAdequacy'], string> = {
  EXCELLENT: 'sleep quality was excellent',
  ADEQUATE: 'sleep quality was adequate',
  INSUFFICIENT: 'sleep quality was below target',
  SEVERELY_INSUFFICIENT: 'sleep quality was significantly below target — this is limiting recovery',
};

const LOAD_LABELS: Record<RecoverySignals['loadStressContext'], string> = {
  UNDERTRAINED: 'training load is low (below optimal stimulus range)',
  OPTIMAL: 'training load is in the optimal zone',
  ELEVATED: 'training load is elevated — recovery is under some pressure',
  HIGH: 'training load is high — recovery capacity is being challenged',
  CRITICAL: 'training load is critically high — immediate load reduction is recommended',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main explanation builder
// ─────────────────────────────────────────────────────────────────────────────

export function generateExplanation(
  score: number | null,
  category: ReadinessCategory,
  signals: RecoverySignals,
  dims: ScoredDimensions,
  decision: RecoveryDecision,
  confidence: number,
): string {
  const parts: string[] = [];

  // ── Opening: score + category ─────────────────────────────────────────────
  if (score !== null) {
    const confidenceLabel =
      confidence >= 0.8
        ? 'based on complete data'
        : confidence >= 0.6
          ? 'based on available data'
          : 'based on limited data';
    parts.push(
      `Your recovery score today is **${score}/100** (${CATEGORY_LABELS[category]}), ${confidenceLabel}.`,
    );
  } else {
    parts.push(
      `Recovery score: **undetermined** — ${
        category === 'BASELINE_PENDING'
          ? 'accumulating baseline data. Continue wearing your device for 7+ consecutive days.'
          : 'insufficient data available. Connect a heart rate monitor and log sleep to enable personalized recovery assessment.'
      }`,
    );
  }

  // ── Primary signals ────────────────────────────────────────────────────────
  if (dims.autonomic.available) {
    parts.push(`**Autonomic balance:** ${AUTONOMIC_LABELS[signals.autonomicBalance]}.`);
  }

  if (dims.sleep.available) {
    parts.push(`**Sleep:** ${SLEEP_LABELS[signals.sleepAdequacy]}.`);
    if (
      signals.sleepAdequacy === 'INSUFFICIENT' ||
      signals.sleepAdequacy === 'SEVERELY_INSUFFICIENT'
    ) {
      parts.push(
        'Sleep quality is the most direct lever for recovery. Prioritize 7–9 hours with consistent bedtime.',
      );
    }
  }

  if (dims.subjective.available && signals.subjectiveWellness !== 'NORMAL') {
    const subjectiveNote =
      signals.subjectiveWellness === 'HIGH'
        ? 'You feel well today — a positive sign.'
        : signals.subjectiveWellness === 'LOW'
          ? 'Subjective wellbeing is below average. Listen to your body.'
          : 'Subjective wellbeing is low. Rest is the recommended priority.';
    parts.push(subjectiveNote);
  }

  // ── Load context ──────────────────────────────────────────────────────────
  if (dims.loadContext.available && signals.loadStressContext !== 'OPTIMAL') {
    parts.push(`**Training load:** ${LOAD_LABELS[signals.loadStressContext]}.`);
  }

  // ── Special patterns ──────────────────────────────────────────────────────
  if (signals.illnessRisk === 'HIGH') {
    parts.push(
      '**Pattern alert:** HRV is significantly suppressed without a corresponding training load explanation. ' +
        'This physiological pattern is consistent with immune activation. ' +
        'Rest is mandatory. Consult a healthcare professional if systemic symptoms are present.',
    );
  }

  if (signals.overreachingRisk === 'HIGH' || signals.overreachingRisk === 'CRITICAL') {
    parts.push(
      `**Overreaching risk: ${signals.overreachingRisk}.** ` +
        'Multiple recovery dimensions are suppressed simultaneously. ' +
        'This pattern is associated with functional overreaching if load is not reduced.',
    );
  }

  if (signals.dissonanceDetected) {
    parts.push(
      '**Note:** Your objective markers (HRV, sleep) and subjective perception disagree today. ' +
        'This can indicate non-training stressors (work, sleep environment, life events). ' +
        "A conservative approach has been applied — trust the data that's less flattering.",
    );
  }

  // ── Decision rationale ────────────────────────────────────────────────────
  if (decision.verdict !== 'INSUFFICIENT_DATA') {
    const intensityMap: Record<string, string> = {
      REST: 'complete rest is recommended',
      VERY_EASY: 'only light movement (active recovery) is appropriate',
      EASY: 'easy zone 1–2 training is appropriate',
      MODERATE: 'a moderate structured session is appropriate',
      HARD: 'high-intensity training is appropriate — this is an optimal window',
    };
    parts.push(
      `**Today's recommendation:** ${intensityMap[decision.recommendedIntensity] ?? 'conservative training'}.`,
    );
  }

  // ── Low confidence disclaimer ─────────────────────────────────────────────
  if (confidence < 0.4) {
    parts.push(
      '⚠ Confidence is very low — this estimate is tentative. ' +
        'Wearing a heart rate monitor daily and logging sleep will significantly improve accuracy.',
    );
  }

  return parts.join(' ');
}
