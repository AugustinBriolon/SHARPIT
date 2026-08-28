import type { PlannedSessionSummary } from '@/components/training/activity/detail/types';
import { ActivityType } from '@prisma/client';

export type ActivityListItem = {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  duration: number | null;
  load: number | null;
  weather: string | null;
  runMetrics: { distanceM: number | null } | null;
  bikeMetrics: { tss: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
  hikeMetrics: { distanceM: number | null } | null;
  strengthSets: { exercise: string }[];
  plannedSession: PlannedSessionSummary | null;
  hikeTripId?: string | null;
};

export function isSelectableHike(activity: Pick<ActivityListItem, 'type' | 'hikeTripId'>): boolean {
  return activity.type === ActivityType.HIKE && activity.hikeTripId === null;
}
