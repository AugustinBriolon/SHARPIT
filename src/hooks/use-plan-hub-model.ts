'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAthleteSnapshot } from '@/hooks/use-athlete-snapshot';
import {
  useActivities,
  useAthleteProfile,
  useGoals,
  usePlannedSessions,
  useThresholdHistory,
  useThresholdPreview,
  useTrainingPlan,
} from '@/hooks/use-data';
import { resolveCalibrationConfidence } from '@/lib/plan/plan-calibration-confidence';
import { buildPlanLoadTrend, type PlanLoadTrend } from '@/lib/plan/plan-load-trend';
import { buildMacroPhaseRail } from '@/lib/plan/plan-macro-rail';
import { selectPlanGoal } from '@/lib/plan/plan-goal';
import { buildPlanWeek, type PlanWeek } from '@/lib/plan/plan-week';
import { isHardSessionIntensity, shouldGateHardIntensities } from '@/lib/plan/intensity-gate';
import { getProfileCompleteness } from '@/lib/profile/profile-completeness';
import { buildThread } from '@/lib/training/thread/build-thread';
import { mapVerdictToDisplay, type OverallVerdict } from '@/lib/today/today-mapping';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';

const SEASON_DAYS = 9 * 7;

function useClientNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  return now;
}

function resolveVerdict(snapshot: AthleteSnapshot | null): OverallVerdict | null {
  const verdict = snapshot?.todaysDecision ?? snapshot?.decision?.overallVerdict;
  return (verdict as OverallVerdict | undefined) ?? null;
}

function snapshotIso(value: Date | string | undefined): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value ?? null;
}

function countGatedSessions(week: PlanWeek | null, verdict: OverallVerdict | null): number {
  if (!week || !shouldGateHardIntensities(verdict)) {
    return 0;
  }
  return week.remaining.filter((entry) => isHardSessionIntensity(entry.planned?.intensity)).length;
}

function resolveWeek(
  now: Date | null,
  activities: readonly ClientActivity[],
  plannedSessions: readonly ClientPlannedSession[],
): PlanWeek | null {
  if (!now) {
    return null;
  }
  return buildPlanWeek({ activities, plannedSessions, now });
}

function resolveLoadTrend(
  now: Date | null,
  pending: boolean,
  activities: readonly ClientActivity[],
  plannedSessions: readonly ClientPlannedSession[],
): PlanLoadTrend | null {
  if (!now || pending) {
    return null;
  }
  return buildPlanLoadTrend(
    buildThread({ activities, plannedSessions, pivot: now, daysBack: SEASON_DAYS }),
  );
}

function usePlanHubQueries() {
  const goalsQuery = useGoals();
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const planQuery = useTrainingPlan();
  const profileQuery = useAthleteProfile();
  const previewQuery = useThresholdPreview();
  const historyQuery = useThresholdHistory();
  const { snapshot } = useAthleteSnapshot();

  return {
    goalsQuery,
    activitiesQuery,
    plannedQuery,
    planQuery,
    profileQuery,
    previewQuery,
    historyQuery,
    snapshot,
  };
}

function usePlanHubDerived(now: Date | null, queries: ReturnType<typeof usePlanHubQueries>) {
  const { goalsQuery, activitiesQuery, plannedQuery, planQuery, snapshot } = queries;
  const verdict = resolveVerdict(snapshot);
  const goal = useMemo(() => selectPlanGoal(goalsQuery.data ?? []), [goalsQuery.data]);
  const macroRail = useMemo(
    () => (now ? buildMacroPhaseRail(planQuery.data ?? null, now) : null),
    [planQuery.data, now],
  );
  const week = useMemo(
    () => resolveWeek(now, activitiesQuery.data ?? [], plannedQuery.data ?? []),
    [activitiesQuery.data, plannedQuery.data, now],
  );
  const loadTrend = useMemo(
    () =>
      resolveLoadTrend(
        now,
        activitiesQuery.isPending || plannedQuery.isPending,
        activitiesQuery.data ?? [],
        plannedQuery.data ?? [],
      ),
    [
      activitiesQuery.data,
      activitiesQuery.isPending,
      plannedQuery.data,
      plannedQuery.isPending,
      now,
    ],
  );
  return { verdict, goal, macroRail, week, loadTrend };
}

function hubCalibration(now: Date | null, queries: ReturnType<typeof usePlanHubQueries>) {
  if (!now) {
    return null;
  }
  return resolveCalibrationConfidence({
    hasThreshold: getProfileCompleteness(queries.profileQuery.data, null).hasThresholds,
    syncedAt: snapshotIso(queries.historyQuery.data?.[0]?.createdAt),
    hasPendingEstimate: queries.previewQuery.data?.hasChanges ?? false,
    now,
  });
}

function hubVerdictLabel(verdict: OverallVerdict | null): string | null {
  if (!verdict) {
    return null;
  }
  return mapVerdictToDisplay(verdict).label;
}

function assemblePlanHubModel(
  now: Date | null,
  queries: ReturnType<typeof usePlanHubQueries>,
  derived: ReturnType<typeof usePlanHubDerived>,
) {
  const listsPending = queries.activitiesQuery.isPending || queries.plannedQuery.isPending;
  return {
    now,
    snapshot: queries.snapshot,
    verdict: derived.verdict,
    verdictLabel: hubVerdictLabel(derived.verdict),
    goal: derived.goal,
    goalsPending: queries.goalsQuery.isPending,
    macroRail: derived.macroRail,
    week: derived.week,
    weekReady: derived.week !== null && !listsPending,
    loadTrend: derived.loadTrend,
    calibration: hubCalibration(now, queries),
    gatedCount: countGatedSessions(derived.week, derived.verdict),
  };
}

export function usePlanHubModel() {
  const now = useClientNow();
  const queries = usePlanHubQueries();
  return assemblePlanHubModel(now, queries, usePlanHubDerived(now, queries));
}
