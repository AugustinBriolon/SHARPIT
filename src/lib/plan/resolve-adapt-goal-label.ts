/**
 * Resolve athlete-facing goal label at PlanAdapter apply / ack time.
 * Presentation-only — avoids recording null when goals query is still settling.
 */

import { selectPlanGoal } from '@/lib/plan/trajectory/plan-goal';
import type { ClientGoal } from '@/lib/query/types';

function titleByPlanGoalId(
  goals: readonly ClientGoal[],
  planGoalId: string | null | undefined,
): string | null {
  const id = planGoalId?.trim();
  if (!id) {
    return null;
  }
  return goals.find((goal) => goal.id === id)?.title?.trim() || null;
}

export function resolveAdaptGoalLabel(input: {
  readonly goals: readonly ClientGoal[] | undefined | null;
  readonly planGoalId: string | null | undefined;
  /** Required — never default to `new Date()` at prerender call sites. */
  readonly now: Date;
}): string | null {
  const goals = input.goals ?? [];
  const byPlan = titleByPlanGoalId(goals, input.planGoalId);
  if (byPlan) {
    return byPlan;
  }
  if (goals.length === 0) {
    return null;
  }
  return selectPlanGoal(goals, input.now)?.title?.trim() || null;
}
