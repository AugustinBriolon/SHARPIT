import { ActivityContextChips } from './activity-context-chips';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

export function ActivityMetaRow({
  activity,
  records = [],
}: {
  activity: ActivityDetail;
  records?: ActivityPerformanceRecordChip[];
}) {
  const hasContext =
    activity.rpe != null ||
    activity.feeling ||
    activity.weather ||
    activity.plannedSession ||
    records.length > 0;

  if (!hasContext) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActivityContextChips activity={activity} records={records} />
    </div>
  );
}
