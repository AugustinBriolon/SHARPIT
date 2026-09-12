/**
 * Visual preview chips for a rearrange proposal (presentation helpers).
 * Pure — no Core / LLM. Used by Today Plan vivant + Plan hub callout.
 */

import type { SessionIntensity } from '@prisma/client';
import { formatDate } from '@/lib/format';
import { intensityLabels } from '@/lib/planned-session/sessions';
import type { FeedbackRearrangeUpcomingSession } from '@/lib/today/rich/feedback-rearrange-proposal';

export type RearrangePreviewTone = 'tension' | 'calm' | 'neutral';

export type RearrangeKind = 'protect' | 'push' | 'effort' | 'habit';

export type RearrangePreviewSession = {
  id: string;
  dateLabel: string;
  intensityLabel: string;
  intensity: SessionIntensity | null;
  tone: RearrangePreviewTone;
};

const DEMANDING = new Set<SessionIntensity>(['TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);
const EASY = new Set<SessionIntensity>(['RECOVERY', 'ENDURANCE']);

function isDemanding(intensity: SessionIntensity | null): boolean {
  return intensity !== null && DEMANDING.has(intensity);
}

function isEasyOrUnknown(intensity: SessionIntensity | null): boolean {
  return intensity === null || EASY.has(intensity);
}

function toneForSession(
  intensity: SessionIntensity | null,
  kind: RearrangeKind,
): RearrangePreviewTone {
  if (kind === 'push') {
    return isEasyOrUnknown(intensity) ? 'calm' : 'neutral';
  }
  // protect / effort / habit — demanding sessions are the tension
  if (isDemanding(intensity)) {
    return 'tension';
  }
  return 'neutral';
}

/**
 * Build up to `limit` chips from upcoming sessions, ordered by date.
 * Tension tone depends on rearrange kind (protect highlights hard; push highlights easy).
 */
export function buildRearrangePreviewSessions(
  upcoming: readonly FeedbackRearrangeUpcomingSession[],
  kind: RearrangeKind,
  limit = 5,
): RearrangePreviewSession[] {
  return [...upcoming]
    .filter((session) => !session.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit)
    .map((session) => ({
      id: session.id,
      dateLabel: formatDate(session.date),
      intensityLabel: session.intensity ? intensityLabels[session.intensity] : 'Séance',
      intensity: session.intensity,
      tone: toneForSession(session.intensity, kind),
    }));
}

export function rearrangeKindFromTrigger(
  trigger: 'POST_SESSION' | 'MORNING_MISMATCH' | 'HABIT_ASSOCIATION' | 'HABIT_EXPERIMENT',
  kindHint?: RearrangeKind,
): RearrangeKind {
  if (kindHint) {
    return kindHint;
  }
  if (trigger === 'HABIT_ASSOCIATION' || trigger === 'HABIT_EXPERIMENT') {
    return 'habit';
  }
  return 'protect';
}
