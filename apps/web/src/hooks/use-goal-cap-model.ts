'use client';

import { useMemo } from 'react';
import type { GoalItem } from '@/components/goals/cards/goal-cards';
import { useClientNow } from '@/hooks/use-client-now';
import {
  useActivities,
  useAthleteProfile,
  useGoals,
  usePlannedSessions,
  useRecords,
  useTrainingPlan,
} from '@/hooks/use-data';
import { buildGoalCapHero, partitionGoalsForCap, type GoalCapHeroView } from '@/lib/goals/goal-cap';
import { buildGoalCapStats, type GoalCapStatsView } from '@/lib/goals/goal-cap-stats';
import {
  buildGoalPositionAudit,
  type GoalPositionAuditView,
} from '@/lib/goals/goal-position-audit';
import { buildRaceFinishProjection } from '@/lib/goals/goal-race-projection';
import { buildGoalRealizationLabels } from '@/lib/goals/goal-realization-labels';
import { buildMacroPhaseRail } from '@/lib/plan/trajectory/plan-macro-rail';
import { selectPlanGoal, type PlanGoalView } from '@/lib/plan/trajectory/plan-goal';
import type { ClientActivity, ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import type { AthleteProfilePayload } from '@/client/query/fetchers/athlete-profile';
import type { PlanPhaseSource } from '@/lib/plan/trajectory/plan-phase';
import type { RecordsPayload } from '@/lib/training/records/records';

function toGoalItem(goal: ClientGoal): GoalItem {
  return {
    id: goal.id,
    title: goal.title,
    kind: goal.kind,
    horizon: goal.horizon,
    metricKey: goal.metricKey,
    startValue: goal.startValue,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    unit: goal.unit,
    lowerIsBetter: goal.lowerIsBetter,
    targetDate: goal.targetDate,
    location: goal.location,
    achieved: goal.achieved,
    notes: goal.notes,
    priority: goal.priority,
    raceFormat: goal.raceFormat,
    targetPerformance: goal.targetPerformance,
    validatingActivityId: goal.validatingActivityId,
    lastAchievedAt: goal.lastAchievedAt,
  };
}

function currentPhaseLabel(plan: PlanPhaseSource | null | undefined, now: Date): string | null {
  const rail = buildMacroPhaseRail(plan ?? null, now);
  return rail?.runs.find((run) => run.current)?.label ?? null;
}

export type GoalCapModel =
  | { status: 'pending' }
  | { status: 'error' }
  | {
      status: 'ready';
      hero: GoalCapHeroView | null;
      primaryItem: GoalItem | null;
      inventory: readonly GoalItem[];
      stats: GoalCapStatsView | null;
      position: GoalPositionAuditView | null;
      scrollReady: boolean;
    };

const EMPTY_REALIZATION_LABELS = {
  currentLabel: null,
  targetLabel: null,
  gapLabel: null,
  pairLabel: null,
} as const;

type PositionPartsInput = {
  planGoal: PlanGoalView;
  goal: ClientGoal | undefined;
  records: RecordsPayload | undefined;
  profile: AthleteProfilePayload | undefined;
  activities: readonly ClientActivity[];
  sessions: readonly ClientPlannedSession[];
};

function nullishNumber(value: number | null | undefined): number | null {
  return value ?? null;
}

function nullishString(value: string | null | undefined): string | null {
  return value ?? null;
}

function profileProjectionFields(profile: AthleteProfilePayload | undefined) {
  return {
    swimCssSecPer100m: nullishNumber(profile?.swimCssSecPer100m),
    ftpW: nullishNumber(profile?.ftpW),
    runThresholdPaceSecPerKm: nullishNumber(profile?.runThresholdPaceSecPerKm),
  };
}

function raceProjectionArgs(input: PositionPartsInput & { records: RecordsPayload }) {
  const { goal, planGoal, records, profile, activities, sessions } = input;
  return {
    raceFormat: nullishString(goal?.raceFormat),
    title: planGoal.title,
    targetPerformance: nullishString(goal?.targetPerformance),
    runBests: records.runBests,
    runEfforts: records.runEfforts,
    ...profileProjectionFields(profile),
    powerCurve: records.powerCurve,
    bikeEfforts: records.bikeEfforts,
    prsSwim: records.prs.swim,
    activities,
    sessions,
  };
}

function optionalRaceProjection(input: PositionPartsInput) {
  if (!input.planGoal.isRace || !input.records) {
    return null;
  }
  return buildRaceFinishProjection(raceProjectionArgs({ ...input, records: input.records }));
}

function positionDetail(
  planGoal: PlanGoalView,
  labels: ReturnType<typeof realizationLabelsForGoal>,
): string | null {
  if (planGoal.isRace) {
    return planGoal.detail;
  }
  return labels.pairLabel;
}

function projectedFinishLabel(raceProjection: ReturnType<typeof optionalRaceProjection>) {
  return raceProjection?.projectedFinishLabel ?? null;
}

function projectedGapLabel(raceProjection: ReturnType<typeof optionalRaceProjection>) {
  return raceProjection?.projectedGapLabel ?? null;
}

function projectedStatusDetail(raceProjection: ReturnType<typeof optionalRaceProjection>) {
  return raceProjection?.statusDetail ?? null;
}

function projectedLegs(raceProjection: ReturnType<typeof optionalRaceProjection>) {
  return raceProjection?.legs ?? [];
}

function positionAuditInput(
  input: PositionPartsInput,
  labels: ReturnType<typeof realizationLabelsForGoal>,
  raceProjection: ReturnType<typeof optionalRaceProjection>,
) {
  const { planGoal } = input;
  return {
    goalTitle: planGoal.title,
    isRace: planGoal.isRace,
    detail: positionDetail(planGoal, labels),
    currentLabel: labels.currentLabel,
    targetLabel: labels.targetLabel,
    gapLabel: labels.gapLabel,
    progress: planGoal.progress,
    countdown: planGoal.countdown,
    countdownCaption: planGoal.countdownCaption,
    projectedFinishLabel: projectedFinishLabel(raceProjection),
    projectedGapLabel: projectedGapLabel(raceProjection),
    projectedStatusDetail: projectedStatusDetail(raceProjection),
    projectedLegs: projectedLegs(raceProjection),
  };
}

function realizationLabelsForGoal(goal: ClientGoal | undefined) {
  return goal ? buildGoalRealizationLabels(goal) : EMPTY_REALIZATION_LABELS;
}

function positionFromParts(input: PositionPartsInput): GoalPositionAuditView {
  return buildGoalPositionAudit(
    positionAuditInput(input, realizationLabelsForGoal(input.goal), optionalRaceProjection(input)),
  );
}

function resolvePrimaryItem(items: readonly GoalItem[], primaryId: string | null): GoalItem | null {
  if (!primaryId) {
    return null;
  }
  return items.find((entry) => entry.id === primaryId) ?? null;
}

function statsForGoal(input: {
  planGoal: PlanGoalView;
  goals: readonly ClientGoal[];
  now: Date;
  sessions: readonly ClientPlannedSession[];
  activities: readonly ClientActivity[];
}): GoalCapStatsView | null {
  const goal = input.goals.find((entry) => entry.id === input.planGoal.id);
  if (!goal?.createdAt) {
    return null;
  }
  return buildGoalCapStats({
    goalId: input.planGoal.id,
    goalCreatedAt: new Date(goal.createdAt),
    now: input.now,
    sessions: input.sessions,
    activities: input.activities,
  });
}

function buildReadyModel(input: {
  now: Date;
  clientGoals: readonly ClientGoal[];
  planGoal: PlanGoalView;
  plan: PlanPhaseSource | null | undefined;
  sessions: readonly ClientPlannedSession[];
  activities: readonly ClientActivity[];
  records: RecordsPayload | undefined;
  profile: AthleteProfilePayload | undefined;
  sessionsPending: boolean;
}): Extract<GoalCapModel, { status: 'ready' }> {
  const items = input.clientGoals.map(toGoalItem);
  const { primaryId, inventory } = partitionGoalsForCap(items, input.planGoal.id);
  const phaseLabel = currentPhaseLabel(input.plan, input.now);
  const stats = statsForGoal({
    planGoal: input.planGoal,
    goals: input.clientGoals,
    now: input.now,
    sessions: input.sessions,
    activities: input.activities,
  });
  const goal = input.clientGoals.find((entry) => entry.id === input.planGoal.id);

  return {
    status: 'ready',
    hero: buildGoalCapHero({
      goal: input.planGoal,
      phaseLabel,
    }),
    primaryItem: resolvePrimaryItem(items, primaryId),
    inventory,
    stats,
    position: positionFromParts({
      planGoal: input.planGoal,
      goal,
      records: input.records,
      profile: input.profile,
      activities: input.activities,
      sessions: input.sessions,
    }),
    scrollReady: !input.sessionsPending,
  };
}

function emptyReadyModel(items: readonly GoalItem[]): Extract<GoalCapModel, { status: 'ready' }> {
  return {
    status: 'ready',
    hero: null,
    primaryItem: null,
    inventory: items,
    stats: null,
    position: null,
    scrollReady: true,
  };
}

function resolveGateStatus(input: {
  pending: boolean;
  now: Date | null;
  isError: boolean;
}): 'pending' | 'error' | 'ok' {
  if (input.pending || !input.now) {
    return 'pending';
  }
  if (input.isError) {
    return 'error';
  }
  return 'ok';
}

function finalizeModel(input: {
  gate: 'pending' | 'error' | 'ok';
  now: Date | null;
  planGoal: PlanGoalView | null;
  clientGoals: readonly ClientGoal[];
  plan: PlanPhaseSource | null | undefined;
  sessions: readonly ClientPlannedSession[];
  activities: readonly ClientActivity[];
  records: RecordsPayload | undefined;
  profile: AthleteProfilePayload | undefined;
  sessionsPending: boolean;
}): GoalCapModel {
  if (input.gate === 'pending') {
    return { status: 'pending' };
  }
  if (input.gate === 'error') {
    return { status: 'error' };
  }
  if (!input.planGoal || !input.now) {
    return emptyReadyModel(input.clientGoals.map(toGoalItem));
  }
  return buildReadyModel({
    now: input.now,
    clientGoals: input.clientGoals,
    planGoal: input.planGoal,
    plan: input.plan,
    sessions: input.sessions,
    activities: input.activities,
    records: input.records,
    profile: input.profile,
    sessionsPending: input.sessionsPending,
  });
}

/** Assembles Cap identity + goal-scoped volume + position (cible vs projection). */
export function useGoalCapModel(): GoalCapModel {
  const now = useClientNow();
  const goalsQuery = useGoals();
  const sessionsQuery = usePlannedSessions();
  const activitiesQuery = useActivities();
  const planQuery = useTrainingPlan();
  const recordsQuery = useRecords();
  const profileQuery = useAthleteProfile();
  const clientGoals = goalsQuery.data ?? [];
  const planGoal = useMemo(
    () => (now ? selectPlanGoal(clientGoals, now) : null),
    [clientGoals, now],
  );

  return finalizeModel({
    gate: resolveGateStatus({
      pending: goalsQuery.isPending,
      now,
      isError: goalsQuery.isError,
    }),
    now,
    planGoal,
    clientGoals,
    plan: planQuery.data,
    sessions: sessionsQuery.data ?? [],
    activities: activitiesQuery.data ?? [],
    records: recordsQuery.data,
    profile: profileQuery.data,
    sessionsPending: sessionsQuery.isPending,
  });
}

export function toEditGoal(goal: GoalItem) {
  return {
    id: goal.id,
    title: goal.title,
    kind: goal.kind,
    horizon: goal.horizon,
    metricKey: goal.metricKey,
    startValue: goal.startValue,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    unit: goal.unit,
    lowerIsBetter: goal.lowerIsBetter,
    targetDate: goal.targetDate,
    location: goal.location,
    notes: goal.notes,
    priority: goal.priority,
    raceFormat: goal.raceFormat,
    targetPerformance: goal.targetPerformance,
    validatingActivityId: goal.validatingActivityId,
    lastAchievedAt: goal.lastAchievedAt,
  };
}
