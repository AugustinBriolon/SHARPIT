import { ActivityType } from '@prisma/client';
import { isSet } from '@/lib/util/value';

import { formatDistance } from '@/lib/format';

type ActivityMetricSource = {
  type: ActivityType;
  load: number | null;
  runMetrics: { distanceM: number | null } | null;
  bikeMetrics: { tss: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
  hikeMetrics: { distanceM: number | null } | null;
  strengthSets: { exercise: string }[];
};

/** Unique exercise count for list density — never dump exercise names in lists. */
export function formatStrengthListMetric(sets: { exercise: string }[]): string | undefined {
  if (!sets.length) {
    return undefined;
  }
  const unique = new Set(sets.map((s) => s.exercise.trim()).filter(Boolean));
  const count = unique.size > 0 ? unique.size : sets.length;
  return count === 1 ? '1 exercice' : `${count} exercices`;
}

function formatDistanceMetric(distanceM: number | null | undefined): string | undefined {
  return isSet(distanceM) && distanceM !== undefined && distanceM > 0
    ? formatDistance(distanceM)
    : undefined;
}

const LIST_METRIC_HANDLERS: Record<
  ActivityType,
  (activity: ActivityMetricSource) => string | undefined
> = {
  [ActivityType.RUN]: (activity) => formatDistanceMetric(activity.runMetrics?.distanceM),
  [ActivityType.BIKE]: (activity) =>
    activity.bikeMetrics?.tss ? `${Math.round(activity.bikeMetrics.tss)} TSS` : undefined,
  [ActivityType.SWIM]: (activity) => formatDistanceMetric(activity.swimMetrics?.distanceM),
  [ActivityType.STRENGTH]: (activity) => formatStrengthListMetric(activity.strengthSets),
  [ActivityType.HIKE]: (activity) => formatDistanceMetric(activity.hikeMetrics?.distanceM),
  [ActivityType.TRIATHLON]: (activity) =>
    isSet(activity.load) ? `${Math.round(activity.load)} TSS` : 'Multisport',
  [ActivityType.OTHER]: (activity) =>
    isSet(activity.load) ? `${Math.round(activity.load)} TSS` : undefined,
};

/**
 * One short list metric per activity type.
 * Strength: exercise count only (detail lives on the activity page).
 */
export function getActivityListMetric(activity: ActivityMetricSource): string | undefined {
  return LIST_METRIC_HANDLERS[activity.type]?.(activity);
}

/** Whether list load would duplicate the primary metric (bike/triathlon TSS). */
export function shouldShowActivityListLoad(activity: ActivityMetricSource): boolean {
  if (activity.load === undefined || activity.load === null) {
    return false;
  }
  if (activity.type === ActivityType.BIKE || activity.type === ActivityType.TRIATHLON) {
    return false;
  }
  return true;
}
