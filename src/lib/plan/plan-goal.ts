/**
 * The one goal the plan is built around.
 *
 * Ranking is delegated to `selectTodayGoals` so Plan and Today never disagree
 * about which goal is the priority one; this layer only adds the figures the
 * Plan band shows that a Today line does not need.
 */

import { GoalKind } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import { daysUntil } from '@/lib/goals/goals';
import { selectTodayGoals } from '@/lib/today/today-goals-summary';
import type { ClientGoal } from '@/lib/query/types';

export type PlanGoalView = {
  readonly id: string;
  readonly title: string;
  /** "J-42" / "J+3". Null when the goal carries no target date. */
  readonly countdown: string | null;
  /** What the countdown counts, so "J-42" needs no training literacy to read. */
  readonly countdownCaption: string | null;
  /** Race format, or the current/target pair for a metric goal. */
  readonly detail: string | null;
  /** 0-100 for metric goals. Null for races: a race has no partial progress. */
  readonly progress: number | null;
  readonly targetDate: Date | null;
  readonly isRace: boolean;
};

function countdownCaptionFor(targetDate: Date | null): string | null {
  const days = daysUntil(targetDate);
  if (!isSet(days)) {
    return null;
  }
  if (days > 1) {
    return 'jours restants';
  }
  if (days === 1) {
    return 'jour restant';
  }
  return days === 0 ? "c'est aujourd'hui" : 'date dépassée';
}

function resolveTargetDate(goal: ClientGoal | undefined): Date | null {
  if (!goal?.targetDate) {
    return null;
  }
  return new Date(goal.targetDate);
}

/**
 * What qualifies the goal beside its title.
 *
 * For a race the target performance comes first: "Sub 5h00" is what the plan is
 * built for, where the format is only how long the day lasts. Falls back to the
 * format so a race with no stated target still says what it is.
 */
function resolveDetail(goal: ClientGoal | undefined, targetPerformance: string | null) {
  if (goal?.kind !== GoalKind.RACE) {
    return targetPerformance;
  }
  return targetPerformance ?? goal.raceFormat ?? null;
}

export function selectPlanGoal(goals: readonly ClientGoal[]): PlanGoalView | null {
  const [line] = selectTodayGoals([...goals], 1);
  if (!line) {
    return null;
  }

  const goal = goals.find((candidate) => candidate.id === line.id);
  const targetDate = resolveTargetDate(goal);

  return {
    id: line.id,
    title: line.title,
    countdown: line.badge,
    countdownCaption: countdownCaptionFor(targetDate),
    detail: resolveDetail(goal, line.detail),
    progress: line.progress,
    targetDate,
    isRace: goal?.kind === GoalKind.RACE,
  };
}
