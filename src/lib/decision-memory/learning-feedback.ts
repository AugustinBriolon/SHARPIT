/**
 * Learning feedback — read-only, on-demand aggregate over evaluated CoachingDecisionOutcome
 * rows. Distinct from the deferred, persisted `AthleteCalibrationSignal` (see ADR-006/ADR-007):
 * this is recomputed on every read, nothing is stored, nothing feeds back into coach context.
 * Pure statistics only — mean/mode/count over already-evaluated outcomes, no new inference.
 */

import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { OutcomeEvaluation } from './types';

/** Below this sample count in a category, there's nothing honest to say about it yet. */
const MIN_SAMPLES = 3;
/** Mean complianceScore below this, combined with a modal HARDER verdict, reads as "repeatedly harder". */
const HARDER_COMPLIANCE_THRESHOLD = 70;

export type LearningFeedbackKind =
  'REPEATED_HARDER_THAN_PLANNED' | 'RECOVERED_WITHIN_EXPECTED_WINDOW' | 'INSUFFICIENT_EVIDENCE';

export type LearningFeedbackItem = {
  readonly kind: LearningFeedbackKind;
  /** null for INSUFFICIENT_EVIDENCE — that sentence is not category-specific. */
  readonly type: ActivityType | null;
  readonly intensity: SessionIntensity | null;
  readonly sampleCount: number;
};

type CategorizedOutcome = {
  readonly outcome: OutcomeEvaluation;
  readonly type: ActivityType;
  readonly intensity: SessionIntensity | null;
};

function categoryKey(type: ActivityType, intensity: SessionIntensity | null): string {
  return `${type}:${intensity ?? 'none'}`;
}

function mode<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function evaluateCategory(
  type: ActivityType,
  intensity: SessionIntensity | null,
  entries: CategorizedOutcome[],
): LearningFeedbackItem | null {
  const evaluated = entries.filter((e) => e.outcome.outcomeStatus === 'EVALUATED');
  if (evaluated.length < MIN_SAMPLES) return null;

  const complianceScores = evaluated
    .map((e) => e.outcome.executionMatch?.complianceScore)
    .filter((v): v is number => v != null);
  const verdicts = evaluated
    .map((e) => e.outcome.executionMatch?.verdict)
    .filter((v): v is NonNullable<typeof v> => v != null);
  const avgCompliance = mean(complianceScores);
  const modalVerdict = mode(verdicts);

  if (
    avgCompliance != null &&
    avgCompliance < HARDER_COMPLIANCE_THRESHOLD &&
    modalVerdict === 'HARDER'
  ) {
    return { kind: 'REPEATED_HARDER_THAN_PLANNED', type, intensity, sampleCount: evaluated.length };
  }

  const recoveryResponses = evaluated
    .map((e) => e.outcome.shortTermRecoveryResponse)
    .filter((r): r is NonNullable<typeof r> => r != null);
  if (recoveryResponses.length >= MIN_SAMPLES) {
    const deltas = recoveryResponses
      .map((r) => {
        const readings = r.readinessValues.filter((v): v is number => v != null);
        if (readings.length < 2) return null;
        return readings[readings.length - 1] - readings[0];
      })
      .filter((d): d is number => d != null);
    const avgDelta = mean(deltas);
    if (avgDelta != null && avgDelta >= -5) {
      return {
        kind: 'RECOVERED_WITHIN_EXPECTED_WINDOW',
        type,
        intensity,
        sampleCount: recoveryResponses.length,
      };
    }
  }

  return null;
}

/**
 * Groups evaluated outcomes by (type, intensity) and emits one sentence-worthy item per
 * category that crosses MIN_SAMPLES — silence for everything else (PRODUCT.md XI). If the
 * athlete has some outcome history but nothing crosses the bar, emits exactly one
 * INSUFFICIENT_EVIDENCE item. Zero outcomes at all → empty array (nothing to say yet).
 */
export function buildLearningFeedback(outcomes: CategorizedOutcome[]): LearningFeedbackItem[] {
  if (outcomes.length === 0) return [];

  const byCategory = new Map<string, CategorizedOutcome[]>();
  for (const entry of outcomes) {
    const key = categoryKey(entry.type, entry.intensity);
    const list = byCategory.get(key) ?? [];
    list.push(entry);
    byCategory.set(key, list);
  }

  const items: LearningFeedbackItem[] = [];
  for (const entries of byCategory.values()) {
    const [{ type, intensity }] = entries;
    const item = evaluateCategory(type, intensity, entries);
    if (item) items.push(item);
  }

  if (items.length === 0) {
    return [
      { kind: 'INSUFFICIENT_EVIDENCE', type: null, intensity: null, sampleCount: outcomes.length },
    ];
  }

  return items;
}
