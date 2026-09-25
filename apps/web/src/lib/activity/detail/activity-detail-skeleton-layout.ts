import { ActivityType } from '@prisma/client';
import {
  isIndoorActivitySession,
  type IndoorActivitySignals,
} from '@/lib/activity/location/indoor-activity';

/**
 * Page-detail skeleton layouts:
 * - map — BIKE, outdoor RUN, open-water SWIM, TRIATHLON, HIKE (coach + route)
 * - strength — STRENGTH (KPI + exercise list, no map)
 * - no-map — pool SWIM, indoor RUN (coach / metrics, no route plane)
 */
export type ActivityDetailSkeletonLayout = 'map' | 'strength' | 'no-map';

const OPEN_WATER_SWIM_HINTS =
  /open\s*water|eau\s*libre|\bow\b|marathon\s*swim|swimrun|travers[ée]e/i;

const POOL_SWIM_HINTS = /piscine|pool|lap\s*swim|longueur|25\s*m|50\s*m/i;

/** True when swim title/notes clearly indicate open water (GPS-likely). */
export function isOpenWaterSwimSession(activity: IndoorActivitySignals): boolean {
  if (activity.type !== ActivityType.SWIM) {
    return false;
  }
  const haystack = [activity.title, activity.notes]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
  if (!haystack) {
    return false;
  }
  if (POOL_SWIM_HINTS.test(haystack)) {
    return false;
  }
  return OPEN_WATER_SWIM_HINTS.test(haystack);
}

const MAP_LAYOUT_TYPES = new Set<ActivityType>([
  ActivityType.TRIATHLON,
  ActivityType.BIKE,
  ActivityType.HIKE,
]);

function resolveSwimSkeletonLayout(activity: IndoorActivitySignals): ActivityDetailSkeletonLayout {
  return isOpenWaterSwimSession(activity) ? 'map' : 'no-map';
}

function resolveRunSkeletonLayout(activity: IndoorActivitySignals): ActivityDetailSkeletonLayout {
  return isIndoorActivitySession(activity) ? 'no-map' : 'map';
}

/** Resolve which detail skeleton to show before streams resolve. */
export function resolveActivityDetailSkeletonLayout(
  activity: IndoorActivitySignals,
): ActivityDetailSkeletonLayout {
  if (activity.type === ActivityType.STRENGTH) {
    return 'strength';
  }
  if (MAP_LAYOUT_TYPES.has(activity.type)) {
    return 'map';
  }
  if (activity.type === ActivityType.SWIM) {
    return resolveSwimSkeletonLayout(activity);
  }
  if (activity.type === ActivityType.RUN) {
    return resolveRunSkeletonLayout(activity);
  }
  return 'no-map';
}

/** Whether ActivityInsights should expect a route map while loading streams. */
export function activityDetailExpectsMap(activity: IndoorActivitySignals): boolean {
  return resolveActivityDetailSkeletonLayout(activity) === 'map';
}
