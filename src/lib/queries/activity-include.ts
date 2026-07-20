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
  strengthSets: { orderBy: { order: 'asc' as const } },
  plannedSession: { select: plannedSessionSummarySelect },
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
  strengthSets: { select: { exercise: true }, orderBy: { order: 'asc' as const } },
  plannedSession: { select: plannedSessionSummarySelect },
} satisfies Prisma.ActivitySelect;
