'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';
import { useClientNow } from '@/hooks/use-client-now';
import {
  getCoachingAdvancementLedgerSnapshot,
  parseCoachingAdvancementLedgerSnapshot,
  subscribeCoachingAdvancementLedger,
  type CoachingAdvancementEntry,
} from '@/lib/plan/coaching-advancement-ledger';
import { selectPlanGoal } from '@/lib/plan/trajectory/plan-goal';
import { buildMacroPhaseRail } from '@/lib/plan/trajectory/plan-macro-rail';
import { buildPlanWeek } from '@/lib/plan/week/plan-week';
import { buildGoalAdvancement, type GoalAdvancementView } from '@/lib/today/rich/goal-advancement';
import type { ClientActivity, ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import type { PlanPhaseSource } from '@/lib/plan/trajectory/plan-phase';

function currentPhaseLabel(plan: PlanPhaseSource | null | undefined, now: Date): string | null {
  const rail = buildMacroPhaseRail(plan ?? null, now);
  return rail?.runs.find((run) => run.current)?.label ?? null;
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
  return buildGoalAdvancement({
    goal: selectPlanGoal(input.goals, input.now),
    weekDoneCount: week.done.length,
    weekRemainingCount: week.remaining.length,
    ledger: input.ledger,
    now: input.now,
    phaseLabel: currentPhaseLabel(input.plan, input.now),
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
