import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { isHardSessionIntensity, shouldGateHardIntensities } from '@/lib/plan/intensity-gate';
import type { PlanWeek } from '@/lib/plan/plan-week';
import type { OverallVerdict } from '@/lib/today/today-mapping';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';

const WEEK_HREF = '/plan/semaine';
const BILAN_HREF = '/plan/bilan';
const COMPLETE_SENTENCE = 'La semaine est tenue. Lis ce qu’elle a produit.';

export type WeekDecisionAction = {
  label: string;
  href: string;
  sessionId: string | null;
};

export type WeekDecision = {
  kind: 'empty' | 'gated' | 'in_progress' | 'complete';
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

function firstGated(remaining: readonly ThreadEntry[]): ThreadEntry | null {
  return remaining.find((entry) => isHardSessionIntensity(entry.planned?.intensity)) ?? null;
}

function weekLink(label: string): WeekDecisionAction {
  return { label, href: WEEK_HREF, sessionId: null };
}

function sessionAction(label: string, sessionId: string): WeekDecisionAction {
  return { label, href: WEEK_HREF, sessionId };
}

function emptyDecision(reason: string | null): WeekDecision {
  return {
    kind: 'empty',
    sentence: 'Sans séance prévue ni réalisée, il n’y a rien à comparer.',
    reason,
    primary: weekLink('Construire la semaine'),
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
    secondary: weekLink('La semaine'),
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
    secondary: weekLink('La semaine'),
  };
}

function completeDecision(hasBrief: boolean, reason: string | null): WeekDecision {
  if (hasBrief) {
    return {
      kind: 'complete',
      sentence: COMPLETE_SENTENCE,
      reason,
      primary: { label: 'Voir le bilan', href: BILAN_HREF, sessionId: null },
      secondary: weekLink('La semaine'),
    };
  }
  return {
    kind: 'complete',
    sentence: COMPLETE_SENTENCE,
    reason,
    primary: weekLink('La semaine'),
    secondary: null,
  };
}

export function buildWeekDecision(input: {
  week: PlanWeek;
  verdict: OverallVerdict | null;
  cautionLabel: string | null;
  hasBrief: boolean;
}): WeekDecision {
  const reason = input.cautionLabel;
  if (input.week.isEmpty) {
    return emptyDecision(reason);
  }

  const gated = shouldGateHardIntensities(input.verdict) ? firstGated(input.week.remaining) : null;
  const gatedReading = gated ? gatedDecision(gated, reason) : null;
  if (gatedReading) {
    return gatedReading;
  }

  const next = input.week.remaining.find((entry) => entry.planned);
  const nextReading = next ? inProgressDecision(next, reason) : null;
  if (nextReading) {
    return nextReading;
  }

  return completeDecision(input.hasBrief, reason);
}
