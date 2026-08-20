import type { ActivityType } from '@prisma/client';
import { addHours, subHours } from 'date-fns';
import { prisma } from '@/lib/prisma';

/** Écart max sur l'heure de début (Garmin vs Strava peuvent diverger légèrement). */
const TIME_TOLERANCE_MS = 12 * 60 * 1000;

/** Tolérance absolue sur la durée (secondes). */
const DURATION_TOLERANCE_SEC = 150;

/** Tolérance relative sur la durée. */
const DURATION_TOLERANCE_RATIO = 0.1;

export interface ActivityFingerprint {
  type: ActivityType;
  date: Date;
  duration: number | null;
}

export interface MatchedActivity {
  id: string;
  type: ActivityType;
  date: Date;
  duration: number | null;
  garminId: string | null;
  stravaId: string | null;
  source: string;
  rpe: number | null;
  feeling: string | null;
}

/** Source unifiée quand les deux plateformes pointent vers la même séance. */
export function mergedSource(hasGarmin: boolean, hasStrava: boolean): string {
  if (hasGarmin && hasStrava) return 'both';
  if (hasGarmin) return 'garmin';
  if (hasStrava) return 'strava';
  return 'manual';
}

export function activitiesMatch(a: ActivityFingerprint, b: ActivityFingerprint): boolean {
  if (a.type !== b.type) return false;

  const timeDiff = Math.abs(a.date.getTime() - b.date.getTime());
  if (timeDiff > TIME_TOLERANCE_MS) return false;

  if (a.duration == null || b.duration == null) {
    return timeDiff <= 6 * 60 * 1000;
  }

  const durDiff = Math.abs(a.duration - b.duration);
  const maxDur = Math.max(a.duration, b.duration, 1);
  if (durDiff <= DURATION_TOLERANCE_SEC) return true;
  return durDiff / maxDur <= DURATION_TOLERANCE_RATIO;
}

/**
 * Cherche une activité existante par ID externe ou par empreinte
 * (type + heure de début + durée) pour éviter les doublons Garmin/Strava.
 */
export async function findMatchingActivity(
  candidate: ActivityFingerprint & {
    garminId?: string | null;
    stravaId?: string | null;
    excludeId?: string;
  },
): Promise<MatchedActivity | null> {
  if (candidate.garminId) {
    const byGarmin = await prisma.activity.findUnique({
      where: { garminId: candidate.garminId },
      select: matchSelect,
    });
    if (byGarmin && byGarmin.id !== candidate.excludeId) return byGarmin;
  }

  if (candidate.stravaId) {
    const byStrava = await prisma.activity.findUnique({
      where: { stravaId: candidate.stravaId },
      select: matchSelect,
    });
    if (byStrava && byStrava.id !== candidate.excludeId) return byStrava;
  }

  const nearby = await prisma.activity.findMany({
    where: {
      type: candidate.type,
      date: {
        gte: subHours(candidate.date, 12),
        lte: addHours(candidate.date, 12),
      },
      ...(candidate.excludeId ? { id: { not: candidate.excludeId } } : {}),
    },
    select: matchSelect,
    orderBy: { date: 'desc' },
    take: 20,
  });

  return (
    nearby.find((n) =>
      activitiesMatch(candidate, {
        type: n.type,
        date: n.date,
        duration: n.duration,
      }),
    ) ?? null
  );
}

const matchSelect = {
  id: true,
  type: true,
  date: true,
  duration: true,
  garminId: true,
  stravaId: true,
  source: true,
  rpe: true,
  feeling: true,
} as const;
