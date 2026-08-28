'use client';

import {
  activityWeatherIcon,
  activityWeatherIconClassName,
  formatActivityWeatherChip,
  parseActivityWeather,
} from '@/lib/activity/weather/activity-weather';
import { isIndoorActivitySession } from '@/lib/activity/location/indoor-activity';
import { ActivityMetaChip } from '@/components/training/activity/detail/activity-meta-chip';
import type { ActivityType } from '@prisma/client';

export function ActivityWeatherChip({
  activity,
}: {
  activity: {
    type: ActivityType;
    title: string | null;
    weather: string | null;
    notes?: string | null;
  };
}) {
  if (isIndoorActivitySession(activity)) {
    return null;
  }
  const weather = parseActivityWeather(activity.weather);
  if (!weather) {
    return null;
  }
  const WeatherIcon = activityWeatherIcon(weather.condition);
  return (
    <ActivityMetaChip
      icon={WeatherIcon}
      iconClassName={activityWeatherIconClassName(weather.condition)}
      label="Météo"
      value={formatActivityWeatherChip(weather)}
    />
  );
}
