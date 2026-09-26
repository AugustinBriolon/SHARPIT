import type { ActivityType } from '@prisma/client';
import type { MovementIntent } from '@/lib/exercises/movement-taxonomy';
import { prisma } from '@sharpit/db/client';
import { findTravelSessionViolation } from '@/lib/travel-context/session-compatibility';
import { listRestrictionsOnDay, listTravelsOverlapping } from '@/lib/travel-context/service';

type PrescriptionWithIntents = { sets: ReadonlyArray<{ intent?: MovementIntent | null }> };

export function strengthIntentsOf(
  prescription: PrescriptionWithIntents | null | undefined,
): Array<MovementIntent | null> | undefined {
  return prescription?.sets.map((set) => set.intent ?? null);
}

/**
 * Refuses, server-side, a session the athlete's declared travel or constraint forbids.
 * The prompt asks the coach to respect these; this is what makes it hold when it doesn't.
 * `date` is a `YYYY-MM-DD` day key.
 */
export async function findSessionTravelViolation(
  athleteId: string,
  session: { date: string; type: ActivityType; strengthIntents?: Array<MovementIntent | null> },
): Promise<string | null> {
  const restrictions = await listRestrictionsOnDay(prisma, athleteId, new Date(session.date));
  return findTravelSessionViolation(restrictions, session);
}

/** First violation among a brick's legs, which all share the brick's day. */
export async function findBrickTravelViolation(
  athleteId: string,
  brick: { date: string; legs: ReadonlyArray<{ type: ActivityType }> },
): Promise<string | null> {
  for (const leg of brick.legs) {
    const violation = await findSessionTravelViolation(athleteId, {
      date: brick.date,
      type: leg.type,
    });
    if (violation) {
      return violation;
    }
  }
  return null;
}

/**
 * Travel already declared over these dates, for `setTravelContext` to return instead of
 * creating a duplicate that would overwrite the athlete's own choice of sports.
 */
export async function findExistingTravelOverlap(athleteId: string, startDate: Date, endDate: Date) {
  const existing = await listTravelsOverlapping(prisma, athleteId, startDate, endDate);
  return existing.map((travel) => ({
    id: travel.id,
    label: travel.label ?? travel.locationLabel,
    locationLabel: travel.locationLabel,
    startDate: travel.startDate.toISOString().slice(0, 10),
    endDate: travel.endDate.toISOString().slice(0, 10),
    trainingConstraint: travel.trainingConstraint,
    allowedDisciplines: travel.allowedDisciplines,
  }));
}
