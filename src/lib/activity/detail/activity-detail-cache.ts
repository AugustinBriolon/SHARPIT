import type { ClientActivity } from '@/lib/query/types';
import type { ActivityDetailHeaderActivity } from '@/components/training/activity/detail/activity-detail-header-content';
import type { ActivityDetail } from '@/components/training/activity/detail/types';

/** Map list-cache row → header props (hikeTrip relation absent in list select). */
export function clientActivityToHeaderActivity(
  activity: ClientActivity,
): ActivityDetailHeaderActivity {
  return {
    id: activity.id,
    type: activity.type,
    title: activity.title,
    date: activity.date,
    source: activity.source,
    garminId: activity.garminId,
    stravaId: activity.stravaId,
    duration: activity.duration,
    load: activity.load,
    rpe: activity.rpe,
    feeling: activity.feeling,
    weather: activity.weather,
    hikeTrip: null,
    plannedSession: activity.plannedSession,
  };
}

/**
 * Enough fields for meta chips + hero strip while the detail RSC resolves.
 * Metrics are list-trimmed; full detail replaces this on hydration.
 */
export function clientActivityToDetailShell(activity: ClientActivity): ActivityDetail {
  return activity as unknown as ActivityDetail;
}
