'use client';

import { ActivityContextChips } from './activity-context-chips';
import { ActivityFeelingPrompt } from './activity-feeling-prompt';
import { useDemoActivityPlannedSession } from '@/hooks/use-demo-session-link-overlay';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

/** Stable empty default — avoids a new [] identity every render when records is omitted. */
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
  const needsFeeling = activity.rpe == null && !activity.feeling?.trim();
  // RPE is shown in the header — chips cover feeling / weather / planned / records.
  const hasContext =
    Boolean(activity.feeling) ||
    Boolean(activity.weather) ||
    Boolean(plannedSession) ||
    records.length > 0;

  if (!hasContext && !needsFeeling) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasContext ? <ActivityContextChips activity={activityWithLink} records={records} /> : null}
      {needsFeeling ? <ActivityFeelingPrompt activityId={activity.id} /> : null}
    </div>
  );
}
