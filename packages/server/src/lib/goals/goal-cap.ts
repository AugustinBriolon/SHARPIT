/**
 * Goal Cap — primary objective identity for the Objectifs suivi page.
 * Pure presentation: no I/O, no React, no Core engines.
 */

import type { PlanGoalView } from '@sharpit/server/lib/plan/trajectory/plan-goal';

export type GoalCapPartition<T extends { id: string }> = {
  readonly primaryId: string | null;
  readonly inventory: readonly T[];
};

/** Split the registry: one Cap, everything else as secondary inventory. */
export function partitionGoalsForCap<T extends { id: string }>(
  goals: readonly T[],
  primaryId: string | null,
): GoalCapPartition<T> {
  if (!primaryId) {
    return { primaryId: null, inventory: goals };
  }
  return {
    primaryId,
    inventory: goals.filter((goal) => goal.id !== primaryId),
  };
}

export type GoalCapHeroView = {
  readonly goalId: string;
  readonly title: string;
  readonly eyebrow: 'Cap';
  readonly countdown: string | null;
  readonly countdownCaption: string | null;
  readonly detail: string | null;
  readonly progress: number | null;
  readonly phaseLabel: string | null;
  readonly isRace: boolean;
};

/** Identity for `/moi/objectifs` — volume lives in goal-cap-stats. */
export function buildGoalCapHero(input: {
  goal: PlanGoalView;
  phaseLabel?: string | null;
}): GoalCapHeroView {
  const { goal } = input;
  return {
    goalId: goal.id,
    title: goal.title,
    eyebrow: 'Cap',
    countdown: goal.countdown,
    countdownCaption: goal.countdownCaption,
    detail: goal.detail,
    progress: goal.progress,
    phaseLabel: input.phaseLabel ?? null,
    isRace: goal.isRace,
  };
}
