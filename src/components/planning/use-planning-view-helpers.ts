import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { format, isSameDay } from 'date-fns';
import { resolvePlanningWeek } from '@/lib/planned-session/planning';

export function findNextRace(goals: ClientGoal[]) {
  return goals
    .flatMap((g) =>
      g.kind === 'RACE' && !g.achieved && g.targetDate !== null
        ? { goal: g, target: new Date(g.targetDate) }
        : [],
    )
    .filter(({ target }) => target >= new Date())
    .sort((a, b) => a.target.getTime() - b.target.getTime())[0];
}

export function buildPlanningDays(week: ReturnType<typeof resolvePlanningWeek>) {
  return [...Array(7)].map((_, i) => {
    const date = new Date(week.start);
    date.setDate(date.getDate() + i);
    const dayPlanned = week.planned.filter((p) => isSameDay(new Date(p.date), date));
    const linkedIds = new Set(
      dayPlanned.map((p) => p.activityId).filter((id): id is string => id !== null),
    );
    const dayActivities = week.activities.filter(
      (a) => isSameDay(new Date(a.date), date) && !linkedIds.has(a.id),
    );
    return { date, planned: dayPlanned, activities: dayActivities };
  });
}

export function resolvePlanWeekForStart(
  plan: { weeks: Array<{ weekStart: string | Date }> } | null | undefined,
  weekStart: Date,
) {
  if (!plan?.weeks) {
    return undefined;
  }
  const key = format(weekStart, 'yyyy-MM-dd');
  return plan.weeks.find((w) => format(new Date(w.weekStart), 'yyyy-MM-dd') === key);
}
