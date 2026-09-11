import { resolveTodayGoalContext, type TodayGoalContext } from '@/lib/daily-phase/goal-context';
import { MOI_OBJECTIFS_PATH } from '@/lib/moi/paths';
import type { ClientGoal } from '@/lib/query/types';

export const TODAY_GOAL_DOM_ID_PREFIX = 'goal-' as const;

export type TodayGoalAnchor = {
  goalId: string;
  label: string;
  href: string;
  linkedToSession: boolean;
};

type PlannedSessionGoalRef = {
  date: Date | string;
  goalId?: string | null;
  completed?: boolean;
  activityId?: string | null;
};

export function goalDomId(goalId: string): string {
  return `${TODAY_GOAL_DOM_ID_PREFIX}${goalId}`;
}

export function goalDeepLinkHref(goalId: string): string {
  return `${MOI_OBJECTIFS_PATH}#${goalDomId(goalId)}`;
}

function labelFromContext(context: TodayGoalContext, narrativeGoalLine: string | null): string {
  if (narrativeGoalLine?.trim()) {
    return narrativeGoalLine.trim();
  }
  return context.badge ? `${context.title} · ${context.badge}` : context.title;
}

/**
 * Living goal anchor for Today — outside the verdict plate.
 * Prefer narrative goalLine when present; always surface when a context exists.
 */
export function buildTodayGoalAnchor(input: {
  goals: ClientGoal[];
  plannedSessions: PlannedSessionGoalRef[];
  trainingDayId: string;
  narrativeGoalLine: string | null;
}): TodayGoalAnchor | null {
  const context = resolveTodayGoalContext(input.goals, input.plannedSessions, input.trainingDayId);
  if (!context) {
    return null;
  }

  return {
    goalId: context.goalId,
    label: labelFromContext(context, input.narrativeGoalLine),
    href: goalDeepLinkHref(context.goalId),
    linkedToSession: context.linkedToTodaySession,
  };
}
