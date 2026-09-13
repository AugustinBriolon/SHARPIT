/**
 * Suivi d’avancées — pure presentation builder.
 * Goal progress + week execution + coaching adapts → athlete-facing panel VM.
 * No Core engines; no calendar mutation.
 */

import { goalDeepLinkHref } from '@/lib/today/rich/today-goal-anchor';
import type { PlanGoalView } from '@/lib/plan/trajectory/plan-goal';
import {
  adaptedSessionsThisWeek,
  type CoachingAdvancementEntry,
} from '@/lib/plan/coaching-advancement-ledger';

export type GoalAdvancementFact = {
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
  readonly facts: readonly GoalAdvancementFact[];
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

function pushFact(
  facts: GoalAdvancementFact[],
  input: { id: string; count: number; singular: string; plural: string },
): void {
  if (input.count <= 0) {
    return;
  }
  facts.push({
    id: input.id,
    label: `${input.count} ${sessionWord(input.count, input.singular, input.plural)}`,
  });
}

function buildFacts(input: {
  adaptedCount: number;
  weekDoneCount: number;
  weekRemainingCount: number;
  phaseLabel: string | null;
}): GoalAdvancementFact[] {
  const facts: GoalAdvancementFact[] = [];
  pushFact(facts, {
    id: 'adapted',
    count: input.adaptedCount,
    singular: 'adaptée',
    plural: 'adaptées',
  });
  pushFact(facts, {
    id: 'done',
    count: input.weekDoneCount,
    singular: 'faite',
    plural: 'faites',
  });
  pushFact(facts, {
    id: 'remaining',
    count: input.weekRemainingCount,
    singular: 'restante',
    plural: 'restantes',
  });
  const phase = input.phaseLabel?.trim();
  if (phase) {
    facts.push({ id: 'phase', label: phase });
  }
  return facts;
}

function emptyWhy(isRace: boolean, progress: number | null): string {
  if (progress !== null) {
    return 'Le Twin suit ta progression vers la cible. Les ajustements de plan apparaîtront ici.';
  }
  if (isRace) {
    return 'Le Twin ancre le plan sur cette échéance. Les séances adaptées et le fil de la semaine apparaîtront ici.';
  }
  return 'Le Twin suit ton avancée vers l’objectif.';
}

function weekBit(done: number, remaining: number): string | null {
  if (done <= 0 && remaining <= 0) {
    return null;
  }
  return `${done} faite${done > 1 ? 's' : ''} · ${remaining} restante${remaining > 1 ? 's' : ''}`;
}

function adaptedBit(adaptedCount: number): string | null {
  if (adaptedCount <= 0) {
    return null;
  }
  return `${adaptedCount} ${sessionWord(adaptedCount, 'séance adaptée', 'séances adaptées')} cette semaine`;
}

function buildWhy(input: {
  adaptedCount: number;
  weekDoneCount: number;
  weekRemainingCount: number;
  phaseLabel: string | null;
  isRace: boolean;
  progress: number | null;
}): string {
  const bits = [
    adaptedBit(input.adaptedCount),
    weekBit(input.weekDoneCount, input.weekRemainingCount),
    input.phaseLabel?.trim() ? `phase ${input.phaseLabel.trim()}` : null,
  ].filter((bit): bit is string => Boolean(bit));

  if (bits.length === 0) {
    return emptyWhy(input.isRace, input.progress);
  }

  const suffix =
    input.adaptedCount > 0
      ? 'Ce que le coaching a déjà changé vers ton objectif.'
      : 'Suite du plan vers ton objectif.';
  return `${bits.join(' · ')}. ${suffix}`;
}

/**
 * Builds the Suivi panel when an active goal has coaching / week facts.
 * Returns null without a goal, or when there is nothing meaningful to show
 * (goal alone must not surface emptyWhy under Plan vivant).
 */
export function buildGoalAdvancement(input: GoalAdvancementInput): GoalAdvancementView | null {
  const { goal } = input;
  if (!goal) {
    return null;
  }

  const adaptedCount = adaptedSessionsThisWeek(input.ledger, input.now);
  const facts = buildFacts({
    adaptedCount,
    weekDoneCount: input.weekDoneCount,
    weekRemainingCount: input.weekRemainingCount,
    phaseLabel: input.phaseLabel,
  });

  if (facts.length === 0) {
    return null;
  }

  return {
    visible: true,
    goalId: goal.id,
    goalLabel: goal.title,
    eyebrow: 'Suivi',
    headline: buildHeadline(goal),
    why: buildWhy({
      adaptedCount,
      weekDoneCount: input.weekDoneCount,
      weekRemainingCount: input.weekRemainingCount,
      phaseLabel: input.phaseLabel,
      isRace: goal.isRace,
      progress: goal.progress,
    }),
    progress: goal.progress,
    facts,
    href: goalDeepLinkHref(goal.id),
  };
}

/** Compact lab-note for Plan destination (same facts, one sentence). */
export function buildGoalAdvancementLabNote(view: GoalAdvancementView): string {
  if (view.facts.length === 0) {
    return view.why;
  }
  return `${view.headline} · ${view.facts.map((f) => f.label).join(' · ')}`;
}
