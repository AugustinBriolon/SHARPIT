import { Prisma } from '@prisma/client';

export const plannedSessionSummarySelect = {
  id: true,
  title: true,
  date: true,
  type: true,
  durationMin: true,
  description: true,
  intensity: true,
  analysis: true,
  analyzedAt: true,
} satisfies Prisma.PlannedSessionSelect;

export const activityInclude = {
  runMetrics: true,
  bikeMetrics: true,
  swimMetrics: true,
  hikeMetrics: true,
  strengthSets: { orderBy: { order: 'asc' as const } },
  plannedSession: { select: plannedSessionSummarySelect },
  // Relation only — scalar hikeTripId is returned automatically with include.
  hikeTrip: { select: { id: true, name: true } },
};

/**
 * Light select for client lists/analytics: fields shown or aggregated only.
 * Avoids transferring every sub-metric (payload ÷ ~3).
 */
export const activityListSelect = {
  id: true,
  type: true,
  date: true,
  title: true,
  duration: true,
  load: true,
  rpe: true,
  feeling: true,
  weather: true,
  notes: true,
  source: true,
  stravaId: true,
  garminId: true,
  createdAt: true,
  updatedAt: true,
  runMetrics: { select: { distanceM: true } },
  bikeMetrics: { select: { tss: true, avgPower: true } },
  swimMetrics: { select: { distanceM: true } },
  hikeMetrics: { select: { distanceM: true, elevationM: true } },
  strengthSets: { select: { exercise: true }, orderBy: { order: 'asc' as const } },
  plannedSession: { select: plannedSessionSummarySelect },
  hikeTripId: true,
} satisfies Prisma.ActivitySelect;

/**
 * Coach prompt activities — enough for recent summaries + PMC/load, no plannedSession join.
 */
export const activityCoachSelect = {
  id: true,
  type: true,
  date: true,
  title: true,
  duration: true,
  load: true,
  rpe: true,
  feeling: true,
  runMetrics: { select: { distanceM: true, paceSecPerKm: true, avgHr: true } },
  bikeMetrics: { select: { tss: true, avgPower: true, normalizedPower: true } },
  swimMetrics: { select: { distanceM: true } },
  strengthSets: {
    select: { exercise: true, sets: true, reps: true, weightKg: true },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.ActivitySelect;

/** Coach planned sessions — no linked activity include (ids + analysis only). */
export const plannedSessionCoachSelect = {
  id: true,
  date: true,
  type: true,
  title: true,
  intensity: true,
  durationMin: true,
  load: true,
  startTime: true,
  description: true,
  completed: true,
  analysis: true,
  exposureSetting: true,
  locationLabel: true,
  brickGroupId: true,
  goalId: true,
} satisfies Prisma.PlannedSessionSelect;
