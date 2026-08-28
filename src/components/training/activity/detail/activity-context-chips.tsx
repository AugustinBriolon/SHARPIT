import type { ReactNode } from 'react';
import { Smile, Trophy } from 'lucide-react';
import {
  activityWeatherIcon,
  activityWeatherIconClassName,
  formatActivityWeatherChip,
  parseActivityWeather,
} from '@/lib/activity/weather/activity-weather';
import { isIndoorActivitySession } from '@/lib/activity/location/indoor-activity';
import { recordCategoryHref } from '@/lib/training/records';
import { ActivityPlannedSessionChip } from './activity-planned-session-chip';
import { ActivityMetaChip } from './activity-meta-chip';
import type { ActivityDetail, ActivityPerformanceRecordChip } from './types';

/** Stable empty default — avoids a new [] identity every render when records is omitted. */
const EMPTY_RECORDS: ActivityPerformanceRecordChip[] = [];

export function ActivityContextChips({
  activity,
  records = EMPTY_RECORDS,
}: {
  activity: ActivityDetail;
  records?: ActivityPerformanceRecordChip[];
}) {
  const chips: ReactNode[] = [];

  // RPE lives in the header meta line — keep chips for context only.
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
    const plannedAnalysisReady = Boolean(
      activity.plannedSession.analysis && activity.plannedSession.analyzedAt,
    );
    chips.push(
      <ActivityPlannedSessionChip
        key="planned"
        activityId={activity.id}
        isAnalyzing={!plannedAnalysisReady}
        planned={activity.plannedSession}
      />,
    );
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

  if (chips.length === 0) {
    return null;
  }
  return <>{chips}</>;
}
