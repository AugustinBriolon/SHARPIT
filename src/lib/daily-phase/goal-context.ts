import { GoalKind } from '@prisma/client';
import { format } from 'date-fns';
import { daysUntil } from '@/lib/goals/goals';
import { isGoalExpired } from '@/lib/goals/goal-metric-config';
import { selectTodayGoals } from '@/lib/today/today-goals-summary';
import type { ClientGoal } from '@/lib/query/types';

export type TodayGoalContext = {
  goalId: string;
  title: string;
  badge: string | null;
  /** Séance planifiée aujourd'hui rattachée à cet objectif. */
  linkedToTodaySession: boolean;
  isPrimaryRace: boolean;
  daysUntil: number | null;
};

type PlannedSessionGoalRef = {
  date: Date | string;
  goalId?: string | null;
  completed?: boolean;
  activityId?: string | null;
};

function goalById(goals: ClientGoal[], id: string): ClientGoal | undefined {
  return goals.find((g) => g.id === id);
}

function toContext(goal: ClientGoal, linkedToTodaySession: boolean): TodayGoalContext {
  const d = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);
  let badge: string | null = null;
  if (d != null) {
    badge = d >= 0 ? `J-${d}` : `J+${Math.abs(d)}`;
  }
  return {
    goalId: goal.id,
    title: goal.title,
    badge,
    linkedToTodaySession,
    isPrimaryRace: goal.kind === GoalKind.RACE && goal.priority === 'A',
    daysUntil: d,
  };
}

/**
 * Objectif le plus pertinent pour contextualiser Today :
 * 1. objectif lié à une séance planifiée aujourd'hui ;
 * 2. sinon objectif principal actif (course A, puis métrique).
 */
export function resolveTodayGoalContext(
  goals: ClientGoal[],
  plannedSessions: PlannedSessionGoalRef[],
  trainingDayId: string,
): TodayGoalContext | null {
  const now = new Date();
  const active = (goals ?? []).filter((g) => !g.achieved && !isGoalExpired(g.targetDate, now));
  if (active.length === 0) return null;

  const todayPlanned = plannedSessions.filter(
    (s) =>
      format(new Date(s.date), 'yyyy-MM-dd') === trainingDayId && !s.completed && !s.activityId,
  );

  for (const session of todayPlanned) {
    if (!session.goalId) continue;
    const goal = goalById(active, session.goalId);
    if (goal) return toContext(goal, true);
  }

  const [primary] = selectTodayGoals(active, 1);
  if (!primary) return null;

  const goal = goalById(active, primary.id);
  if (!goal) return null;

  const linkedToTodaySession = todayPlanned.some((s) => s.goalId === goal.id);
  return toContext(goal, linkedToTodaySession);
}
