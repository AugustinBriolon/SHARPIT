import type { ReactNode } from 'react';
import { Trophy } from 'lucide-react';
import { recordCategoryHref } from '@/lib/training/records';
import { ActivityMetaChip } from './activity-meta-chip';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

/** Stable empty default — avoids a new [] identity every render when records is omitted. */
const EMPTY_RECORDS: ActivityPerformanceRecordChip[] = [];

function pushRecordChips(chips: ReactNode[], records: ActivityPerformanceRecordChip[]) {
  for (const record of records) {
    chips.push(
      <ActivityMetaChip
        key={`record-${record.category}`}
        href={recordCategoryHref(record.category)}
        icon={Trophy}
        iconClassName="text-signal-caution"
        label="Record"
        tone="amber"
        value={record.label}
      />,
    );
  }
}

function collectActivityContextChips(records: ActivityPerformanceRecordChip[]): ReactNode[] {
  const chips: ReactNode[] = [];
  pushRecordChips(chips, records);
  return chips;
}

export function ActivityContextChips({
  activity: _activity,
  records = EMPTY_RECORDS,
}: {
  activity: ActivityDetail;
  records?: ActivityPerformanceRecordChip[];
}) {
  const chips = collectActivityContextChips(records);

  if (chips.length === 0) {
    return null;
  }
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-1">{chips}</div>;
}
