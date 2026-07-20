import { ActivityType } from '@prisma/client';

import { formatDistance } from '@/lib/format';

type ActivityMetricSource = {
  type: ActivityType;
  load: number | null;
  runMetrics: { distanceM: number | null } | null;
  bikeMetrics: { tss: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
  strengthSets: { exercise: string }[];
};

/** Unique exercise count for list density — never dump exercise names in lists. */
export function formatStrengthListMetric(sets: { exercise: string }[]): string | undefined {
  if (!sets.length) return undefined;
  const unique = new Set(sets.map((s) => s.exercise.trim()).filter(Boolean));
  const count = unique.size > 0 ? unique.size : sets.length;
  return count === 1 ? '1 exercice' : `${count} exercices`;
}

/**
 * One short list metric per activity type.
 * Strength: exercise count only (detail lives on the activity page).
 */
export function getActivityListMetric(activity: ActivityMetricSource): string | undefined {
  switch (activity.type) {
    case ActivityType.RUN: {
      const distanceM = activity.runMetrics?.distanceM;
      return distanceM != null && distanceM > 0 ? formatDistance(distanceM) : undefined;
    }
    case ActivityType.BIKE:
      return activity.bikeMetrics?.tss ? `${Math.round(activity.bikeMetrics.tss)} TSS` : undefined;
    case ActivityType.SWIM: {
      const distanceM = activity.swimMetrics?.distanceM;
      return distanceM != null && distanceM > 0 ? formatDistance(distanceM) : undefined;
    }
    case ActivityType.STRENGTH:
      return formatStrengthListMetric(activity.strengthSets);
    case ActivityType.TRIATHLON:
      return activity.load != null ? `${Math.round(activity.load)} TSS` : 'Multisport';
    case ActivityType.OTHER:
      return activity.load != null ? `${Math.round(activity.load)} TSS` : undefined;
    default:
      return undefined;
  }
}

/** Whether list load would duplicate the primary metric (bike/triathlon TSS). */
export function shouldShowActivityListLoad(activity: ActivityMetricSource): boolean {
  if (activity.load == null) return false;
  if (activity.type === ActivityType.BIKE || activity.type === ActivityType.TRIATHLON) {
    return false;
  }
  return true;
}
