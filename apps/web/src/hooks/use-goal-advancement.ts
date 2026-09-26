'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';
import { useClientNow } from '@/hooks/use-client-now';
import {
  getCoachingAdvancementLedgerSnapshot,
  parseCoachingAdvancementLedgerSnapshot,
  subscribeCoachingAdvancementLedger,
  type CoachingAdvancementEntry,
} from '@sharpit/server/lib/plan/coaching-advancement-ledger';
import { selectPlanGoal } from '@sharpit/server/lib/plan/trajectory/plan-goal';
import { buildMacroPhaseRail } from '@sharpit/server/lib/plan/trajectory/plan-macro-rail';
import { buildPlanWeek } from '@sharpit/server/lib/plan/week/plan-week';
import {
  buildGoalAdvancement,
  type GoalAdvancementView,
} from '@sharpit/server/lib/today/rich/goal-advancement';
import type {
  ClientActivity,
  ClientGoal,
  ClientPlannedSession,
} from '@sharpit/server/lib/query/types';
import type { PlanPhaseSource } from '@sharpit/server/lib/plan/trajectory/plan-phase';

/** The periodisation blocks toward the goal — built once, read twice. */
function macroPhases(
  plan: PlanPhaseSource | null | undefined,
  now: Date,
): { label: string; current: boolean }[] {
  const rail = buildMacroPhaseRail(plan ?? null, now);
  return rail?.runs.map((run) => ({ label: run.label, current: run.current })) ?? [];
}

function assembleAdvancementView(input: {
  now: Date;
  goals: readonly ClientGoal[];
  activities: readonly ClientActivity[];
  plannedSessions: readonly ClientPlannedSession[];
  plan: PlanPhaseSource | null | undefined;
  ledger: readonly CoachingAdvancementEntry[];
}): GoalAdvancementView | null {
  const week = buildPlanWeek({
    activities: input.activities,
    plannedSessions: input.plannedSessions,
    now: input.now,
  });
  const phases = macroPhases(input.plan, input.now);
  return buildGoalAdvancement({
    goal: selectPlanGoal(input.goals, input.now),
    phases,
    weekDoneCount: week.done.length,
    weekRemainingCount: week.remaining.length,
    weekDays: week.days.map((day) => ({
      dayKey: day.dayKey,
      date: day.date,
      state: day.state,
      isToday: day.isToday,
    })),
    ledger: input.ledger,
    now: input.now,
    phaseLabel: phases.find((phase) => phase.current)?.label ?? null,
  });
}

function isListPending(isPending: boolean, data: unknown): boolean {
  return isPending && data === undefined;
}

/**
 * Assembles Suivi d’avancées from goals + week thread + coaching ledger.
 * Client-side only — mirrors Plan hub data sources; avoids touching today.ts (habits sibling).
 */
export function useGoalAdvancement(): {
  view: GoalAdvancementView | null;
  pending: boolean;
} {
  const now = useClientNow();
  const goalsQuery = useGoals();
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const planQuery = useTrainingPlan();

  const ledgerSnapshot = useSyncExternalStore(
    subscribeCoachingAdvancementLedger,
    getCoachingAdvancementLedgerSnapshot,
    () => '',
  );
  const ledger = useMemo(
    () => parseCoachingAdvancementLedgerSnapshot(ledgerSnapshot),
    [ledgerSnapshot],
  );

  const view = useMemo(() => {
    if (!now) {
      return null;
    }
    return assembleAdvancementView({
      now,
      goals: goalsQuery.data ?? [],
      activities: activitiesQuery.data ?? [],
      plannedSessions: plannedQuery.data ?? [],
      plan: planQuery.data,
      ledger,
    });
  }, [now, goalsQuery.data, activitiesQuery.data, plannedQuery.data, planQuery.data, ledger]);

  const pending =
    Boolean(now) &&
    (isListPending(goalsQuery.isPending, goalsQuery.data) ||
      isListPending(plannedQuery.isPending, plannedQuery.data));

  return { view, pending };
}
