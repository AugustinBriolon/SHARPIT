import { format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  isHardSessionIntensity,
  shouldGateHardIntensities,
} from '@/lib/plan/trajectory/intensity-gate';
import type { PlanWeek } from '@/lib/plan/week/plan-week';
import type { OverallVerdict } from '@/lib/today/dashboard/today-mapping';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';

const WEEK_HREF = '/plan/semaine';
const BILAN_HREF = '/plan/bilan';
const COMPLETE_SENTENCE = 'La semaine est tenue. Lis ce qu’elle a produit.';
const MISSED_SENTENCE = 'Des séances prévues n’ont pas été tenues.';

export type WeekDecisionAction = {
  label: string;
  href: string;
  sessionId: string | null;
};

export type WeekDecision = {
  kind: 'empty' | 'gated' | 'in_progress' | 'missed' | 'complete';
  sentence: string;
  reason: string | null;
  primary: WeekDecisionAction;
  secondary: WeekDecisionAction | null;
};

function weekdayLabel(date: Date): string {
  return format(date, 'EEEE', { locale: fr });
}

function entryDate(entry: ThreadEntry): Date {
  return entry.planned?.date ? new Date(entry.planned.date) : new Date();
}

/** « Prochaine » only makes sense from today forward — past remaining is overdue. */
export function upcomingRemaining(remaining: readonly ThreadEntry[], now: Date): ThreadEntry[] {
  const today = startOfDay(now).getTime();
  return remaining.filter((entry) => startOfDay(entryDate(entry)).getTime() >= today);
}

function firstGated(remaining: readonly ThreadEntry[]): ThreadEntry | null {
  return remaining.find((entry) => isHardSessionIntensity(entry.planned?.intensity)) ?? null;
}

function weekLink(label = 'Planning'): WeekDecisionAction {
  return { label, href: WEEK_HREF, sessionId: null };
}

function sessionAction(label: string, sessionId: string): WeekDecisionAction {
  return { label, href: WEEK_HREF, sessionId };
}

function emptyDecision(reason: string | null): WeekDecision {
  return {
    kind: 'empty',
    sentence: 'Rien de prévu cette semaine.',
    reason,
    primary: weekLink('Ouvrir le calendrier'),
    secondary: null,
  };
}

function missedDecision(reason: string | null): WeekDecision {
  return {
    kind: 'missed',
    sentence: MISSED_SENTENCE,
    reason,
    primary: weekLink('Voir la semaine'),
    secondary: null,
  };
}

function gatedDecision(entry: ThreadEntry, reason: string | null): WeekDecision | null {
  if (!entry.planned) {
    return null;
  }
  const day = weekdayLabel(entryDate(entry));
  return {
    kind: 'gated',
    sentence: 'Prochaine séance',
    reason,
    primary: sessionAction(`Adapter ${day}`, entry.planned.id),
    secondary: weekLink(),
  };
}

function inProgressDecision(entry: ThreadEntry, reason: string | null): WeekDecision | null {
  if (!entry.planned) {
    return null;
  }
  return {
    kind: 'in_progress',
    sentence: 'Prochaine séance',
    reason,
    primary: sessionAction('Ouvrir la séance', entry.planned.id),
    secondary: weekLink(),
  };
}

function completeDecision(hasBrief: boolean, reason: string | null): WeekDecision {
  if (hasBrief) {
    return {
      kind: 'complete',
      sentence: COMPLETE_SENTENCE,
      reason,
      primary: { label: 'Voir le bilan', href: BILAN_HREF, sessionId: null },
      secondary: weekLink(),
    };
  }
  return {
    kind: 'complete',
    sentence: COMPLETE_SENTENCE,
    reason,
    primary: weekLink(),
    secondary: null,
  };
}

export function buildWeekDecision(input: {
  week: PlanWeek;
  verdict: OverallVerdict | null;
  cautionLabel: string | null;
  hasBrief: boolean;
  /** Athlete-local clock — required so past remaining never reads as « prochaine ». */
  now: Date;
}): WeekDecision {
  const reason = input.cautionLabel;
  if (input.week.isEmpty) {
    return emptyDecision(reason);
  }

  const upcoming = upcomingRemaining(input.week.remaining, input.now);

  const gated = shouldGateHardIntensities(input.verdict) ? firstGated(upcoming) : null;
  const gatedReading = gated ? gatedDecision(gated, reason) : null;
  if (gatedReading) {
    return gatedReading;
  }

  const next = upcoming.find((entry) => entry.planned);
  const nextReading = next ? inProgressDecision(next, reason) : null;
  if (nextReading) {
    return nextReading;
  }

  if (input.week.remaining.length > 0) {
    return missedDecision(reason);
  }

  return completeDecision(input.hasBrief, reason);
}
