/**
 * Build projection input from current athlete state + planned sessions.
 */

import type { SerializedDecisionState } from '@/core/decision/adapters';
import type { EnvironmentalDecisionSnapshot } from '@/core/inference/environment/types';
import type { ProjectionHorizonDays, ProjectedAthleteInput } from '@/core/projection/types';
import type { ScenarioSessionSlice } from '@/core/scenario/types';
import { computePmcSeries, type ActivityForAnalytics } from '@/lib/analytics';
import { adaptationEngine } from '@/lib/engines/adaptation-engine';
import { fatigueEngine } from '@/lib/engines/fatigue-engine';
import { physicalHealthEngine } from '@/lib/engines/physical-health-engine';
import { recoveryEngine } from '@/lib/engines/recovery-engine';
import { aggregatePlanningMaps, slicePlannedSessions } from '@/lib/projection/planning-maps';
import { getActivitiesList, getPlannedSessions } from '@/lib/queries';
import { loadTodayState } from '@/lib/today/today-state-server';
import { addTrainingDays, trainingDayIdForNow } from '@/lib/training/training-day';
import { addDays, startOfDay } from 'date-fns';

export { localDateLabel, trainingDayIdToDate } from '@/lib/training/training-day';

const ATHLETE_ID = 'default';

async function loadTwinState<TOutput, TState>(
  loader: {
    getLatest: (athleteId: string, trainingDayId: string) => Promise<{ output: TOutput } | null>;
    run: (athleteId: string, trainingDayId: string) => Promise<{ output: TOutput }>;
  },
  athleteId: string,
  trainingDayId: string,
  pick: (output: TOutput) => TState,
): Promise<TState | null> {
  try {
    const cached = await loader.getLatest(athleteId, trainingDayId);
    if (cached) return pick(cached.output);
    const result = await loader.run(athleteId, trainingDayId);
    return pick(result.output);
  } catch (error) {
    console.error('[projection/loadTwinState]', error);
    return null;
  }
}

export function buildFutureDayIds(anchorTrainingDayId: string, horizonDays: number): string[] {
  return Array.from({ length: horizonDays }, (_, index) =>
    addTrainingDays(anchorTrainingDayId, index + 1),
  );
}

export type ProjectionBaseContext = Omit<
  ProjectedAthleteInput,
  'plannedTssByDay' | 'environmentalImpactByDay' | 'plannedSessionCountByDay'
>;

export function buildProjectedInputFromBase(
  base: ProjectionBaseContext,
  sessions: readonly ScenarioSessionSlice[],
  futureDayIds: readonly string[],
): ProjectedAthleteInput {
  const maps = aggregatePlanningMaps(futureDayIds, sessions);
  return {
    ...base,
    plannedTssByDay: maps.plannedTssByDay,
    environmentalImpactByDay: maps.environmentalImpactByDay,
    plannedSessionCountByDay: maps.plannedSessionCountByDay,
  };
}

export async function buildProjectionBaseContext(params?: {
  horizonDays?: ProjectionHorizonDays;
  anchorTrainingDayId?: string;
}): Promise<{
  base: ProjectionBaseContext;
  futureDayIds: string[];
  sessionSlices: ScenarioSessionSlice[];
  anchorDecision: SerializedDecisionState | null;
} | null> {
  const horizonDays = params?.horizonDays ?? 7;
  const anchorTrainingDayId = params?.anchorTrainingDayId ?? trainingDayIdForNow();
  const futureDayIds = buildFutureDayIds(anchorTrainingDayId, horizonDays);
  const horizonEnd = new Date(`${futureDayIds[futureDayIds.length - 1]}T23:59:59.999Z`);

  const [todayState, activities, plannedSessions, recovery, fatigue, adaptation, physicalHealth] =
    await Promise.all([
      loadTodayState({ athleteId: ATHLETE_ID, trainingDayId: anchorTrainingDayId }),
      getActivitiesList({ sinceDays: 180 }),
      getPlannedSessions({
        from: startOfDay(new Date(`${anchorTrainingDayId}T12:00:00`)),
        to: horizonEnd,
      }),
      loadTwinState(recoveryEngine, ATHLETE_ID, anchorTrainingDayId, (o) => o.recoveryState),
      loadTwinState(fatigueEngine, ATHLETE_ID, anchorTrainingDayId, (o) => o.fatigueState),
      loadTwinState(adaptationEngine, ATHLETE_ID, anchorTrainingDayId, (o) => o.adaptationState),
      loadTwinState(
        physicalHealthEngine,
        ATHLETE_ID,
        anchorTrainingDayId,
        (o) => o.physicalHealthState,
      ),
    ]);

  const pmcSeries = computePmcSeries(activities as ActivityForAnalytics[], 180);
  const anchorPmc = pmcSeries.at(-1);
  if (!anchorPmc) return null;

  const sessionSlices = slicePlannedSessions(plannedSessions, futureDayIds);
  const baseConfidence = Math.min(
    recovery?.confidence ?? 1,
    fatigue?.confidence ?? 1,
    adaptation?.confidence ?? 1,
    todayState.decision?.confidence ?? 1,
  );

  return {
    base: {
      athleteId: ATHLETE_ID,
      anchorTrainingDayId,
      horizonDays,
      recovery,
      fatigue,
      adaptation,
      physicalHealth,
      environment: (todayState.environment as EnvironmentalDecisionSnapshot | null) ?? null,
      initialCtl: anchorPmc.ctl,
      initialAtl: anchorPmc.atl,
      baseFreshnessConfidence: baseConfidence,
    },
    futureDayIds,
    sessionSlices,
    anchorDecision: todayState.decision,
  };
}

export async function buildProjectedAthleteInput(params?: {
  horizonDays?: ProjectionHorizonDays;
  anchorTrainingDayId?: string;
  sessionOverrides?: readonly ScenarioSessionSlice[];
}): Promise<ProjectedAthleteInput | null> {
  const context = await buildProjectionBaseContext(params);
  if (!context) return null;

  const sessions = params?.sessionOverrides ?? context.sessionSlices;
  return buildProjectedInputFromBase(context.base, sessions, context.futureDayIds);
}

export function addCalendarDays(date: Date, days: number): Date {
  return addDays(date, days);
}
