import type { ActivityType } from '@prisma/client';
import type { MovementIntent } from '@sharpit/server/lib/exercises/movement-taxonomy';
import { travelRangesOverlap } from '@sharpit/server/lib/travel-context/overlap';
import {
  activityTypeToTravelDiscipline,
  travelDisciplineLabels,
  type TravelDiscipline,
} from '@sharpit/server/lib/travel-context/disciplines';
import type { TravelTrainingConstraint } from '@sharpit/server/lib/travel-context/training-constraint';

/** A travel or temporary constraint window, reduced to what session validation reads. */
export type TrainingRestriction = {
  label?: string | null;
  locationLabel?: string | null;
  startDate: Date | string;
  endDate: Date | string;
  trainingConstraint: TravelTrainingConstraint;
  allowedDisciplines: readonly TravelDiscipline[];
};

export type ProposedSession = {
  date: Date | string;
  type: ActivityType;
  /** Movement intents of a strength prescription; absent when the session has none. */
  strengthIntents?: ReadonlyArray<MovementIntent | null | undefined>;
};

/**
 * Disciplines a restriction lets through. A MOBILITY_ONLY constraint declared without
 * an explicit sport list still means mobility, so it is read as `['MOBILITY']`.
 * `null` means the restriction does not narrow sports (FULL / REDUCED with no list).
 */
function permittedDisciplines(
  restriction: TrainingRestriction,
): readonly TravelDiscipline[] | null {
  if (restriction.allowedDisciplines.length > 0) {
    return restriction.allowedDisciplines;
  }
  return restriction.trainingConstraint === 'MOBILITY_ONLY' ? ['MOBILITY'] : null;
}

/**
 * Mobility has no ActivityType: the coach files it as a STRENGTH session. So a STRENGTH
 * session passes as mobility only when its prescription says so, exercise by exercise.
 * Without a prescription there is nothing to contradict the title, so it is not blocked.
 */
function isMobilitySession(session: ProposedSession): boolean {
  const intents = session.strengthIntents;
  if (!intents || intents.length === 0) {
    return true;
  }
  return intents.every((intent) => intent === 'MOBILITY');
}

function isSessionPermitted(
  session: ProposedSession,
  permitted: readonly TravelDiscipline[],
): boolean {
  const discipline = activityTypeToTravelDiscipline(session.type);
  if (discipline === null || permitted.includes(discipline)) {
    return true;
  }
  return discipline === 'STRENGTH' && permitted.includes('MOBILITY') && isMobilitySession(session);
}

function restrictionName(restriction: TrainingRestriction): string {
  return restriction.label?.trim() || restriction.locationLabel?.trim() || 'contexte voyage';
}

function describeViolation(
  restriction: TrainingRestriction,
  permitted: readonly TravelDiscipline[],
) {
  const name = restrictionName(restriction);
  const sports = travelDisciplineLabels(permitted).join(', ');
  return `Contexte « ${name} » (du ${dayOf(restriction.startDate)} au ${dayOf(restriction.endDate)}) : seuls ces sports sont autorisés : ${sports}. Ne propose pas ce sport. Le contexte existe déjà : ne le recrée pas et ne modifie pas ses sports.`;
}

function dayOf(value: Date | string): string {
  return (typeof value === 'string' ? new Date(value) : value).toISOString().slice(0, 10);
}

/**
 * Returns the reason a session cannot be scheduled under the athlete's declared travel
 * or constraint windows, or `null` when it is compatible. Pure: callers load the windows.
 */
export function findTravelSessionViolation(
  restrictions: readonly TrainingRestriction[],
  session: ProposedSession,
): string | null {
  const onDay = { startDate: session.date, endDate: session.date };
  for (const restriction of restrictions) {
    if (!travelRangesOverlap(restriction, onDay)) {
      continue;
    }
    if (restriction.trainingConstraint === 'NONE') {
      return `Contexte « ${restrictionName(restriction)} » : aucun entraînement structuré ce jour-là. Ne propose pas de séance.`;
    }
    const permitted = permittedDisciplines(restriction);
    if (permitted && !isSessionPermitted(session, permitted)) {
      return describeViolation(restriction, permitted);
    }
  }
  return null;
}
