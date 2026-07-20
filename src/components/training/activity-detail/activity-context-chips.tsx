import type { ReactNode } from 'react';
import { Gauge, Smile, Trophy } from 'lucide-react';
import {
  activityWeatherIcon,
  activityWeatherIconClassName,
  formatActivityWeatherChip,
  parseActivityWeather,
} from '@/lib/activity/activity-weather';
import { isIndoorActivitySession } from '@/lib/activity/indoor-activity';
import { recordCategoryHref } from '@/lib/records';
import { ActivityPlannedSessionChip } from './activity-planned-session-chip';
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
  const weather = !isIndoorActivitySession(activity)
    ? parseActivityWeather(activity.weather)
    : null;
  if (weather) {
    const WeatherIcon = activityWeatherIcon(weather.condition);
    chips.push(
      <ActivityMetaChip
        key="weather"
        icon={WeatherIcon}
        iconClassName={activityWeatherIconClassName(weather.condition)}
        label="Météo"
        value={formatActivityWeatherChip(weather)}
      />,
    );
  }

  if (activity.plannedSession) {
    chips.push(<ActivityPlannedSessionChip key="planned" planned={activity.plannedSession} />);
  }

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

  if (chips.length === 0) return null;
  return <>{chips}</>;
}
