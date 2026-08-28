/**
 * Build projection input from current athlete state + planned sessions.
 */

import type { SerializedDecisionState } from '@/core/decision/adapters';
import type { EnvironmentalDecisionSnapshot } from '@/core/inference/environment/types';
import type { ProjectionHorizonDays, ProjectedAthleteInput } from '@/core/projection/types';
import type { ScenarioSessionSlice } from '@/core/scenario/types';
import { loadAthletePmcAnchor } from '@/lib/training/pmc-server';
import { adaptationEngine } from '@/lib/engines/adaptation-engine';
import { fatigueEngine } from '@/lib/engines/fatigue-engine';
import { physicalHealthEngine } from '@/lib/engines/physical-health-engine';
import { recoveryEngine } from '@/lib/engines/recovery-engine';
import { aggregatePlanningMaps, slicePlannedSessions } from '@/lib/projection/planning-maps';
import { getPlannedSessions } from '@/lib/queries';
import { loadTodayState } from '@/lib/today/today-state-server';
import { addTrainingDays, trainingDayIdForNow } from '@/lib/training/training-day';
import { addDays, startOfDay } from 'date-fns';

export { localDateLabel, trainingDayIdToDate } from '@/lib/training/training-day';

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
    if (cached) {
      return pick(cached.output);
    }
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

async function loadProjectionTwinStates(athleteId: string, anchorTrainingDayId: string) {
  const [recovery, fatigue, adaptation, physicalHealth] = await Promise.all([
    loadTwinState(recoveryEngine, athleteId, anchorTrainingDayId, (o) => o.recoveryState),
    loadTwinState(fatigueEngine, athleteId, anchorTrainingDayId, (o) => o.fatigueState),
    loadTwinState(adaptationEngine, athleteId, anchorTrainingDayId, (o) => o.adaptationState),
    loadTwinState(
      physicalHealthEngine,
      athleteId,
      anchorTrainingDayId,
      (o) => o.physicalHealthState,
    ),
  ]);
  return { recovery, fatigue, adaptation, physicalHealth };
}

function projectionBaseConfidence(
  recovery: ProjectionBaseContext['recovery'],
  fatigue: ProjectionBaseContext['fatigue'],
  adaptation: ProjectionBaseContext['adaptation'],
  decisionConfidence: number | undefined,
): number {
  return Math.min(
    recovery?.confidence ?? 1,
    fatigue?.confidence ?? 1,
    adaptation?.confidence ?? 1,
    decisionConfidence ?? 1,
  );
}

export async function buildProjectionBaseContext(
  athleteId: string,
  params?: {
    horizonDays?: ProjectionHorizonDays;
    anchorTrainingDayId?: string;
  },
): Promise<{
  base: ProjectionBaseContext;
  futureDayIds: string[];
  sessionSlices: ScenarioSessionSlice[];
  anchorDecision: SerializedDecisionState | null;
} | null> {
  const horizonDays = params?.horizonDays ?? 7;
  const anchorTrainingDayId = params?.anchorTrainingDayId ?? trainingDayIdForNow();
  const futureDayIds = buildFutureDayIds(anchorTrainingDayId, horizonDays);
  const horizonEnd = new Date(`${futureDayIds[futureDayIds.length - 1]}T23:59:59.999Z`);

  const [todayState, plannedSessions, twinStates, anchorPmc] = await Promise.all([
    loadTodayState({ athleteId, trainingDayId: anchorTrainingDayId }),
    getPlannedSessions(athleteId, {
      from: startOfDay(new Date(`${anchorTrainingDayId}T12:00:00`)),
      to: horizonEnd,
    }),
    loadProjectionTwinStates(athleteId, anchorTrainingDayId),
    loadAthletePmcAnchor(athleteId, {
      refDate: new Date(`${anchorTrainingDayId}T12:00:00.000Z`),
    }),
  ]);

  // Full precision on purpose: this value seeds projectPmcForward, so rounding it
  // here would compound across the whole projection horizon.
  if (!anchorPmc) {
    return null;
  }

  const { recovery, fatigue, adaptation, physicalHealth } = twinStates;
  const sessionSlices = slicePlannedSessions(plannedSessions, futureDayIds);
  const baseConfidence = projectionBaseConfidence(
    recovery,
    fatigue,
    adaptation,
    todayState.decision?.confidence,
  );

  return {
    base: {
      athleteId,
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

export async function buildProjectedAthleteInput(
  athleteId: string,
  params?: {
    horizonDays?: ProjectionHorizonDays;
    anchorTrainingDayId?: string;
    sessionOverrides?: readonly ScenarioSessionSlice[];
  },
): Promise<ProjectedAthleteInput | null> {
  const context = await buildProjectionBaseContext(athleteId, params);
  if (!context) {
    return null;
  }

  const sessions = params?.sessionOverrides ?? context.sessionSlices;
  return buildProjectedInputFromBase(context.base, sessions, context.futureDayIds);
}

export function addCalendarDays(date: Date, days: number): Date {
  return addDays(date, days);
}
