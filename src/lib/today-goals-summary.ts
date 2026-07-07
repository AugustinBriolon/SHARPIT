import { GoalKind, GoalPriority } from '@prisma/client';
import { computeGoalProgress, daysUntil } from '@/lib/goals';
import {
  formatGoalDisplayValue,
  isGoalExpired,
  parseGoalMetricConfig,
} from '@/lib/goal-metric-config';
import type { ClientGoal } from '@/lib/query/types';

export type TodayGoalLine = {
  id: string;
  title: string;
  badge: string | null;
  detail: string | null;
  progress: number | null;
};

const PRIORITY_RANK: Record<GoalPriority, number> = { A: 0, B: 1, C: 2 };

function goalSortKey(goal: ClientGoal): [number, number, number] {
  const kindRank = goal.kind === GoalKind.RACE ? 0 : 1;
  const priorityRank =
    goal.kind === GoalKind.RACE && goal.priority ? PRIORITY_RANK[goal.priority] : 9;
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);
  const dateRank = days != null && days >= 0 ? days : 9999;
  return [kindRank, priorityRank, dateRank];
}

function formatMetricDetail(goal: ClientGoal): string | null {
  const config = parseGoalMetricConfig(goal.metricKey);
  if (goal.currentValue == null || goal.targetValue == null) return null;

  const current = formatGoalDisplayValue(goal.currentValue, goal.unit, config);
  const target = formatGoalDisplayValue(goal.targetValue, goal.unit, config);
  return `${current} / ${target}`;
}

function formatGoalBadge(goal: ClientGoal): string | null {
  const days = daysUntil(goal.targetDate ? new Date(goal.targetDate) : null);
  if (days == null) return null;
  return days >= 0 ? `J-${days}` : `J+${Math.abs(days)}`;
}

function toTodayGoalLine(goal: ClientGoal): TodayGoalLine {
  const progress = goal.kind === GoalKind.METRIC ? computeGoalProgress(goal) : null;
  const badge = formatGoalBadge(goal);

  if (goal.kind === GoalKind.RACE) {
    return {
      id: goal.id,
      title: goal.title,
      badge,
      detail: goal.targetPerformance ?? null,
      progress: null,
    };
  }

  return {
    id: goal.id,
    title: goal.title,
    badge,
    detail: formatMetricDetail(goal),
    progress,
  };
}

/** Sélectionne jusqu'à 3 objectifs actifs pour l'aperçu Today. */
export function selectTodayGoals(goals: ClientGoal[], max = 3): TodayGoalLine[] {
  const now = new Date();
  const active = goals.filter((g) => !g.achieved && !isGoalExpired(g.targetDate, now));

  return [...active]
    .sort((a, b) => {
      const ka = goalSortKey(a);
      const kb = goalSortKey(b);
      for (let i = 0; i < ka.length; i += 1) {
        if (ka[i] !== kb[i]) return ka[i] - kb[i];
      }
      return a.title.localeCompare(b.title, 'fr');
    })
    .slice(0, max)
    .map(toTodayGoalLine);
}
