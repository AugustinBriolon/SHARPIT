import type { ReactNode } from 'react';
import { CalendarCheck, CloudSun, Gauge, Smile, Trophy } from 'lucide-react';
import { activityTypeLabels } from '@/lib/format';
import { recordCategoryHref } from '@/lib/records';
import { parseSessionAnalysis, plannedSessionHref } from '@/lib/session-analysis-display';
import { rpeTone } from './activity-detail-helpers';
import { ActivityMetaChip } from './activity-meta-chip';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

export function ActivityContextChips({
  activity,
  records = [],
}: {
  activity: ActivityDetail;
  records?: ActivityPerformanceRecordChip[];
}) {
  const chips: ReactNode[] = [];

  if (activity.rpe != null) {
    chips.push(
      <ActivityMetaChip
        key="rpe"
        icon={Gauge}
        label="RPE"
        tone={rpeTone(activity.rpe)}
        value={`${activity.rpe}/10`}
      />,
    );
  }
  if (activity.feeling) {
    chips.push(
      <ActivityMetaChip key="feeling" icon={Smile} label="Ressenti" value={activity.feeling} />,
    );
  }
  if (activity.weather) {
    chips.push(
      <ActivityMetaChip key="weather" icon={CloudSun} label="Météo" value={activity.weather} />,
    );
  }

  if (activity.plannedSession) {
    const planned = activity.plannedSession;
    const analysis = parseSessionAnalysis(planned.analysis);
    chips.push(
      <ActivityMetaChip
        key="planned"
        href={plannedSessionHref(planned.id)}
        icon={CalendarCheck}
        label="Planifiée"
        value={
          analysis
            ? `${analysis.complianceScore}/100`
            : (planned.title ?? activityTypeLabels[planned.type])
        }
      />,
    );
  }

  for (const record of records) {
    chips.push(
      <ActivityMetaChip
        key={`record-${record.category}`}
        href={recordCategoryHref(record.category)}
        icon={Trophy}
        iconClassName="text-amber-600"
        label="Record"
        tone="amber"
        value={record.label}
      />,
    );
  }

  if (chips.length === 0) return null;
  return <>{chips}</>;
}
