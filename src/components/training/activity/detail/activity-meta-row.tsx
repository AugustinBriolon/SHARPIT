'use client';

import { ActivityContextChips } from './activity-context-chips';
import { ActivityFeelingPrompt } from './activity-feeling-prompt';
import { useDemoActivityPlannedSession } from '@/hooks/use-demo-session-link-overlay';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

const EMPTY_RECORDS: ActivityPerformanceRecordChip[] = [];

function activityHasMetaContext(
  activity: ActivityDetail,
  plannedSession: ActivityDetail['plannedSession'],
  records: ActivityPerformanceRecordChip[],
): boolean {
  return (
    Boolean(activity.feeling) ||
    Boolean(activity.weather) ||
    Boolean(plannedSession) ||
    records.length > 0
  );
}

function ActivityMetaRowContent({
  activity,
  records,
  needsFeeling,
}: {
  activity: ActivityDetail;
  records: ActivityPerformanceRecordChip[];
  needsFeeling: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActivityContextChips activity={activity} records={records} />
      {needsFeeling ? <ActivityFeelingPrompt activityId={activity.id} /> : null}
    </div>
  );
}

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
  const needsFeeling = activity.rpe === null && !activity.feeling?.trim();
  const hasContext = activityHasMetaContext(activity, plannedSession, records);

  if (!hasContext && !needsFeeling) {
    return null;
  }

  if (!hasContext) {
    return <ActivityFeelingPrompt activityId={activity.id} />;
  }

  return (
    <ActivityMetaRowContent
      activity={activityWithLink}
      needsFeeling={needsFeeling}
      records={records}
    />
  );
}
