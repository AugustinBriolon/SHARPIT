/**
 * Suivi d’avancées — pure presentation builder.
 * Goal progress + week execution + coaching adapts → athlete-facing VM.
 * Absorbed into Plan vivant shell on Today (not a twin panel).
 * No Core engines; no calendar mutation.
 */

import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { goalDeepLinkHref } from '@/lib/today/rich/today-goal-anchor';
import type { PlanGoalView } from '@/lib/plan/trajectory/plan-goal';
import {
  adaptedSessionsThisWeek,
  coachingAdvancementEntriesThisWeek,
  type CoachingAdvancementEntry,
} from '@/lib/plan/coaching-advancement-ledger';
import type { RearrangePreviewTone } from '@/lib/today/rich/rearrange-preview';

export type GoalAdvancementFact = {
  readonly id: string;
  readonly label: string;
};

export type GoalAdvancementWeekSegment = {
  readonly id: 'adapted' | 'done' | 'remaining';
  readonly tone: RearrangePreviewTone;
  /** Top chip line (count). */
  readonly dateLabel: string;
  /** Bottom chip line (full noun). */
  readonly intensityLabel: string;
};

export type GoalAdvancementTrailItem = {
  readonly id: string;
  readonly label: string;
};

export type GoalAdvancementView = {
  readonly visible: true;
  readonly goalId: string;
  readonly goalLabel: string;
  readonly eyebrow: string;
  readonly headline: string;
  readonly why: string;
  readonly progress: number | null;
  /** @deprecated Prefer weekSegments — kept for lab-note / transitional callers. */
  readonly facts: readonly GoalAdvancementFact[];
  readonly weekSegments: readonly GoalAdvancementWeekSegment[];
  readonly trail: readonly GoalAdvancementTrailItem[];
  readonly phaseLabel: string | null;
  readonly href: string;
};

export type GoalAdvancementInput = {
  readonly goal: PlanGoalView | null;
  readonly weekDoneCount: number;
  readonly weekRemainingCount: number;
  readonly ledger: readonly CoachingAdvancementEntry[];
  /** Required — never default to `new Date()` at call sites used during prerender. */
  readonly now: Date;
  /** Optional macro phase short label (e.g. « Build »). */
  readonly phaseLabel: string | null;
};

function sessionWord(count: number, singular: string, plural: string): string {
  return count > 1 ? plural : singular;
}

function buildHeadline(goal: PlanGoalView): string {
  if (goal.progress !== null) {
    return goal.progress >= 100 ? 'Cible atteinte' : `${goal.progress} % de la cible`;
  }
  if (goal.countdown) {
    return goal.detail ? `${goal.countdown} · ${goal.detail}` : goal.countdown;
  }
  return goal.detail ?? 'Cap sur l’objectif';
}

function pushSegment(
  segments: GoalAdvancementWeekSegment[],
  input: {
    id: GoalAdvancementWeekSegment['id'];
    tone: RearrangePreviewTone;
    count: number;
    intensityLabel: string;
  },
): void {
  if (input.count <= 0) {
    return;
  }
  segments.push({
    id: input.id,
    tone: input.tone,
    dateLabel: String(input.count),
    intensityLabel: input.intensityLabel,
  });
}

function buildWeekSegments(input: {
  adaptedCount: number;
  weekDoneCount: number;
  weekRemainingCount: number;
}): GoalAdvancementWeekSegment[] {
  const segments: GoalAdvancementWeekSegment[] = [];
  pushSegment(segments, {
    id: 'adapted',
    tone: 'tension',
    count: input.adaptedCount,
    intensityLabel: sessionWord(input.adaptedCount, 'séance adaptée', 'séances adaptées'),
  });
  pushSegment(segments, {
    id: 'done',
    tone: 'calm',
    count: input.weekDoneCount,
    intensityLabel: sessionWord(input.weekDoneCount, 'faite', 'faites'),
  });
  pushSegment(segments, {
    id: 'remaining',
    tone: 'neutral',
    count: input.weekRemainingCount,
    intensityLabel: sessionWord(input.weekRemainingCount, 'restante', 'restantes'),
  });
  return segments;
}

/** Coaching-only facts for lab-note / transitional `facts` field (no phase, no %). */
function buildCoachingFacts(
  segments: readonly GoalAdvancementWeekSegment[],
): GoalAdvancementFact[] {
  return segments.map((segment) => ({
    id: segment.id,
    label: `${segment.dateLabel} ${segment.intensityLabel}`,
  }));
}

function buildWhy(adaptedCount: number, hasWeek: boolean): string {
  if (!hasWeek) {
    return 'Aucune séance planifiée cette semaine.';
  }
  return adaptedCount > 0
    ? 'Ce que le coaching a déjà changé cette semaine.'
    : 'Le Twin suit l’exécution de ta semaine.';
}

/** A countdown or a percentage is a reading on its own — an empty week is not silence. */
function hasReadableGoal(goal: PlanGoalView): boolean {
  return Boolean(goal.countdown) || goal.progress !== null;
}

function capitalizeFrDay(label: string): string {
  if (!label) {
    return label;
  }
  return label.charAt(0).toLocaleUpperCase('fr-FR') + label.slice(1);
}

function trailDayLabel(dayKey: string): string {
  try {
    return capitalizeFrDay(format(parseISO(dayKey), 'EEE', { locale: fr }));
  } catch {
    return dayKey;
  }
}

function buildTrailItem(entry: CoachingAdvancementEntry): GoalAdvancementTrailItem {
  const count = entry.changeCount;
  const adaptBit = `${count} ${sessionWord(count, 'séance adaptée', 'séances adaptées')}`;
  const goalBit = entry.goalLabel ? ` · vers ${entry.goalLabel}` : '';
  return {
    id: `${entry.dayKey}-${entry.appliedAt}`,
    label: `${trailDayLabel(entry.dayKey)} · ${adaptBit}${goalBit}`,
  };
}

function buildTrail(
  ledger: readonly CoachingAdvancementEntry[],
  now: Date,
): GoalAdvancementTrailItem[] {
  return coachingAdvancementEntriesThisWeek(ledger, now)
    .filter((entry) => entry.changeCount > 0)
    .map(buildTrailItem);
}

/**
 * Builds the Suivi VM when an active goal has week / coaching segments.
 * Returns null without a goal, or when there is nothing meaningful to show
 * (phase alone must not surface under Plan vivant).
 */
export function buildGoalAdvancement(input: GoalAdvancementInput): GoalAdvancementView | null {
  const { goal } = input;
  if (!goal) {
    return null;
  }

  const adaptedCount = adaptedSessionsThisWeek(input.ledger, input.now);
  const weekSegments = buildWeekSegments({
    adaptedCount,
    weekDoneCount: input.weekDoneCount,
    weekRemainingCount: input.weekRemainingCount,
  });

  if (weekSegments.length === 0 && !hasReadableGoal(goal)) {
    return null;
  }

  const phase = input.phaseLabel?.trim() || null;
  const facts = buildCoachingFacts(weekSegments);

  return {
    visible: true,
    goalId: goal.id,
    goalLabel: goal.title,
    eyebrow: 'Plan vivant',
    headline: buildHeadline(goal),
    why: buildWhy(adaptedCount, weekSegments.length > 0),
    progress: goal.progress,
    facts,
    weekSegments,
    trail: buildTrail(input.ledger, input.now),
    phaseLabel: phase,
    href: goalDeepLinkHref(goal.id),
  };
}

/** Compact lab-note for Plan destination — coaching facts only (no countdown / %). */
export function buildGoalAdvancementLabNote(view: GoalAdvancementView): string {
  if (view.facts.length === 0) {
    return view.why;
  }
  return view.facts.map((f) => f.label).join(' · ');
}
