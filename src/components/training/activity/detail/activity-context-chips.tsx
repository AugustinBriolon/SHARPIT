import type { ReactNode } from 'react';
import { Trophy } from 'lucide-react';
import { ActivityFeelingChip } from '@/components/training/activity/detail/activity-feeling-chip';
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

function pushFeelingChip(chips: ReactNode[], activity: ActivityDetail) {
  if (!activity.feeling?.trim()) {
    return;
  }
  chips.push(
    <ActivityFeelingChip
      key="feeling"
      activityId={activity.id}
      feeling={activity.feeling}
      rpe={activity.rpe}
    />,
  );
}

function pushWeatherChip(chips: ReactNode[], activity: ActivityDetail) {
  if (isIndoorActivitySession(activity)) {
    return;
  }
  const weather = parseActivityWeather(activity.weather);
  if (!weather) {
    return;
  }
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

function pushPlannedSessionChip(chips: ReactNode[], activity: ActivityDetail) {
  if (!activity.plannedSession) {
    return;
  }
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

function collectActivityContextChips(
  activity: ActivityDetail,
  records: ActivityPerformanceRecordChip[],
): ReactNode[] {
  const chips: ReactNode[] = [];
  pushFeelingChip(chips, activity);
  pushWeatherChip(chips, activity);
  pushPlannedSessionChip(chips, activity);
  pushRecordChips(chips, records);
  return chips;
}

export function ActivityContextChips({
  activity,
  records = EMPTY_RECORDS,
}: {
  activity: ActivityDetail;
  records?: ActivityPerformanceRecordChip[];
}) {
  const chips = collectActivityContextChips(activity, records);

  if (chips.length === 0) {
    return null;
  }
  return <>{chips}</>;
}
