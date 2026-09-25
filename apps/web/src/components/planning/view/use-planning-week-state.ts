'use client';

import {
  buildPlanningDays,
  findNextRace,
  resolvePlanWeekForStart,
} from '@/components/planning/view/use-planning-view-helpers';
import { buildPlanningWeeks, resolvePlanningWeek } from '@/lib/planned-session/planning';
import type {
  ClientActivity,
  ClientGoal,
  ClientPlannedSession,
  ClientTrainingPlan,
} from '@/lib/query/types';
import { endOfWeek, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';

const WEEK_OPTS = { weekStartsOn: 1 as const };

type PlanningWeekStateInput = {
  activities: ClientActivity[];
  goals: ClientGoal[];
  plan: ClientTrainingPlan | null | undefined;
  planned: ClientPlannedSession[];
  weekFromUrl: Date | null;
};

export function usePlanningWeekState({
  weekFromUrl,
  activities,
  planned,
  goals,
  plan,
}: PlanningWeekStateInput) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(weekFromUrl ?? new Date(), WEEK_OPTS),
  );

  const nextRace = useMemo(() => findNextRace(goals), [goals]);
  const builtWeeks = useMemo(
    () => buildPlanningWeeks(activities, planned, nextRace?.target ?? null),
    [activities, planned, nextRace?.target],
  );
  const week = useMemo(
    () =>
      resolvePlanningWeek({
        weekStart,
        activities,
        planned,
        raceDate: nextRace?.target ?? null,
        builtWeeks,
      }),
    [weekStart, activities, planned, nextRace?.target, builtWeeks],
  );

  const planWeek = useMemo(() => resolvePlanWeekForStart(plan, week.start), [plan, week.start]);
  const days = useMemo(() => buildPlanningDays(week), [week]);

  return {
    completed: week.planned.filter((p) => p.completed).length,
    days,
    isCurrentWeek: week.index === 0,
    nextRace,
    planWeek,
    setWeekStart,
    total: week.planned.length,
    week,
    weekEnd: endOfWeek(week.start, WEEK_OPTS),
    weekStart,
  };
}
