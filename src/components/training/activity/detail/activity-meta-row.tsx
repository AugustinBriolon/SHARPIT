'use client';

import { ActivityContextChips } from './activity-context-chips';
import { useDemoActivityPlannedSession } from '@/hooks/use-demo-session-link-overlay';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

const EMPTY_RECORDS: ActivityPerformanceRecordChip[] = [];

export function ActivityMetaRow({
  activity,
  records = EMPTY_RECORDS,
}: {
  activity: ActivityDetail;
  records?: ActivityPerformanceRecordChip[];
}) {
  const plannedSession = useDemoActivityPlannedSession(activity.id, activity.plannedSession);
  const activityWithLink =
    plannedSession === activity.plannedSession ? activity : { ...activity, plannedSession };

  return <ActivityContextChips activity={activityWithLink} records={records} />;
}
