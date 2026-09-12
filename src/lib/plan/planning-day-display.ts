/**
 * How one planning day renders a session (ADR pending — see DESIGN_LANGUAGE
 * "Planning de la semaine").
 *
 * The week answers "what am I doing today and next?". A day already settled —
 * done, or past and missed — states its outcome in one quiet line instead of
 * competing with what is still ahead.
 *
 * Pure: no I/O, no React.
 */

import { formatDistance, formatDuration } from '@/lib/format';
import {
  SESSION_VERDICT_LABELS,
  sessionScoreColor,
} from '@/lib/planned-session/display/session-analysis-display';

export type PlanningDisplayMode = 'done' | 'missed' | 'planned';

/**
 * `done` as soon as an activity is linked — a session realised today reads as
 * settled too, so the rest of the day moves up.
 */
export function planningSessionMode(input: {
  completed: boolean;
  activityId: string | null | undefined;
  isPastDay: boolean;
}): PlanningDisplayMode {
  if (input.completed && input.activityId) {
    return 'done';
  }
  return input.isPastDay ? 'missed' : 'planned';
}

export type PlanningComplianceView = {
  label: string;
  score: number;
  colorClass: string;
};

type AnalysisLike = { complianceScore?: unknown; verdict?: unknown };

function isVerdict(value: unknown): value is keyof typeof SESSION_VERDICT_LABELS {
  return typeof value === 'string' && value in SESSION_VERDICT_LABELS;
}

/** Compliance is shown only when the coach analysis actually landed. */
export function planningComplianceView(analysis: unknown): PlanningComplianceView | null {
  if (!analysis || typeof analysis !== 'object') {
    return null;
  }
  const { complianceScore, verdict } = analysis as AnalysisLike;
  if (typeof complianceScore !== 'number' || !isVerdict(verdict)) {
    return null;
  }
  return {
    label: SESSION_VERDICT_LABELS[verdict],
    score: Math.round(complianceScore),
    colorClass: sessionScoreColor(complianceScore),
  };
}

/** One line of numbers for a settled session: duration, then distance when it means something. */
export function planningDoneMetrics(input: {
  durationSec?: number | null;
  distanceM?: number | null;
}): string {
  const parts: string[] = [];
  if (input.durationSec && input.durationSec > 0) {
    parts.push(formatDuration(input.durationSec));
  }
  if (input.distanceM && input.distanceM > 0) {
    parts.push(formatDistance(input.distanceM));
  }
  return parts.join(' · ');
}

/** Accessible name for a settled row — the outcome first, since that is the point. */
export function planningDoneAccessibleName(input: {
  title: string;
  mode: PlanningDisplayMode;
  compliance: PlanningComplianceView | null;
}): string {
  if (input.mode === 'missed') {
    return `${input.title}, non réalisée`;
  }
  if (!input.compliance) {
    return `${input.title}, réalisée`;
  }
  return `${input.title}, réalisée, ${input.compliance.label}, conformité ${input.compliance.score} sur 100`;
}
