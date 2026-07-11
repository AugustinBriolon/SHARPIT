/**
 * Aggregate planned sessions into projection maps.
 */

import type { PlannedSessionContext } from '@/core/planned-session/types';
import type { TrainingEnvironmentalImpact } from '@/core/inference/environment/types';
import type { ScenarioSessionSlice } from '@/core/scenario/types';
import { estimatePlannedLoad } from '@/lib/planning';
import { computeTrainingDayId } from '@/lib/training-day';
import type { PlannedSessionExposureSetting } from '@/core/planned-session/types';
import type { ActivityType, SessionIntensity } from '@prisma/client';

const IMPACT_RANK: Record<TrainingEnvironmentalImpact, number> = {
  NONE: 0,
  MODERATE: 1,
  SIGNIFICANT: 2,
};

export function maxEnvironmentalImpact(
  current: TrainingEnvironmentalImpact,
  next: TrainingEnvironmentalImpact,
): TrainingEnvironmentalImpact {
  return IMPACT_RANK[next] > IMPACT_RANK[current] ? next : current;
}

export function parseSessionEnvironmentalImpact(
  environmentContext: unknown,
): TrainingEnvironmentalImpact {
  if (!environmentContext || typeof environmentContext !== 'object') return 'NONE';
  const ctx = environmentContext as PlannedSessionContext;
  return ctx.environment?.trainingImpact ?? 'NONE';
}

type RawPlannedSession = {
  id: string;
  date: Date;
  type: ActivityType;
  load: number | null;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  title: string | null;
  completed: boolean;
  activityId: string | null;
  exposureSetting: string | null;
  environmentContext: unknown;
};

export function slicePlannedSessions(
  sessions: readonly RawPlannedSession[],
  futureDayIds: readonly string[],
): ScenarioSessionSlice[] {
  const allowed = new Set(futureDayIds);
  const slices: ScenarioSessionSlice[] = [];

  for (const session of sessions) {
    if (session.completed || session.activityId) continue;
    const trainingDayId = computeTrainingDayId(new Date(session.date));
    if (!allowed.has(trainingDayId)) continue;

    slices.push({
      sessionId: session.id,
      trainingDayId,
      tss: estimatePlannedLoad(session),
      environmentalImpact: parseSessionEnvironmentalImpact(session.environmentContext),
      exposureSetting: (session.exposureSetting as PlannedSessionExposureSetting) ?? 'UNKNOWN',
      intensity: session.intensity,
      title: session.title,
      type: session.type,
    });
  }

  return slices;
}

export function aggregatePlanningMaps(
  futureDayIds: readonly string[],
  sessions: readonly ScenarioSessionSlice[],
): {
  plannedTssByDay: Map<string, number>;
  environmentalImpactByDay: Map<string, TrainingEnvironmentalImpact>;
  plannedSessionCountByDay: Map<string, number>;
} {
  const plannedTssByDay = new Map<string, number>();
  const environmentalImpactByDay = new Map<string, TrainingEnvironmentalImpact>();
  const plannedSessionCountByDay = new Map<string, number>();

  for (const dayId of futureDayIds) {
    plannedTssByDay.set(dayId, 0);
    environmentalImpactByDay.set(dayId, 'NONE');
    plannedSessionCountByDay.set(dayId, 0);
  }

  for (const session of sessions) {
    if (!plannedTssByDay.has(session.trainingDayId)) continue;
    plannedTssByDay.set(
      session.trainingDayId,
      (plannedTssByDay.get(session.trainingDayId) ?? 0) + session.tss,
    );
    plannedSessionCountByDay.set(
      session.trainingDayId,
      (plannedSessionCountByDay.get(session.trainingDayId) ?? 0) + 1,
    );
    environmentalImpactByDay.set(
      session.trainingDayId,
      maxEnvironmentalImpact(
        environmentalImpactByDay.get(session.trainingDayId) ?? 'NONE',
        session.environmentalImpact,
      ),
    );
  }

  return { plannedTssByDay, environmentalImpactByDay, plannedSessionCountByDay };
}

export function environmentalImpactRank(impact: TrainingEnvironmentalImpact): number {
  return IMPACT_RANK[impact];
}

export function maxImpactAcrossDays(
  environmentalImpactByDay: ReadonlyMap<string, TrainingEnvironmentalImpact>,
): TrainingEnvironmentalImpact {
  let max: TrainingEnvironmentalImpact = 'NONE';
  for (const impact of environmentalImpactByDay.values()) {
    max = maxEnvironmentalImpact(max, impact);
  }
  return max;
}
