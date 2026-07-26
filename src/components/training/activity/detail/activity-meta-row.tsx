import { ActivityContextChips } from './activity-context-chips';
import { ActivityFeelingPrompt } from './activity-feeling-prompt';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

export function ActivityMetaRow({
  activity,
  records = [],
}: {
  activity: ActivityDetail;
  records?: ActivityPerformanceRecordChip[];
}) {
  const needsFeeling = activity.rpe == null && !activity.feeling?.trim();
  // RPE is shown in the header — chips cover feeling / weather / planned / records.
  const hasContext =
    Boolean(activity.feeling) ||
    Boolean(activity.weather) ||
    Boolean(activity.plannedSession) ||
    records.length > 0;

  if (!hasContext && !needsFeeling) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasContext ? <ActivityContextChips activity={activity} records={records} /> : null}
      {needsFeeling ? <ActivityFeelingPrompt activityId={activity.id} /> : null}
    </div>
  );
}
