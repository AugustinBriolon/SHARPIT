'use client';

import type { LucideIcon } from 'lucide-react';

import {
  activityWeatherIcon,
  activityWeatherIconClassName,
  type ActivityWeatherCondition,
} from '@/lib/activity/weather/activity-weather';
import { toLocalCalendarDate } from '@/lib/date/day-key';
import { cn } from '@/lib/utils';

type TodayHeaderWeather = {
  city: string;
  tempC: number;
  condition: string;
  locationKnown: boolean;
};

function formatDay(dayKey: string): string {
  if (!dayKey) return '';
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) return '';
  return toLocalCalendarDate(new Date(Date.UTC(year, month - 1, day))).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Takes the icon as a prop rather than resolving it in JSX: a component looked up
 * during render is remounted every pass, which the lint rule rightly refuses.
 */
function WeatherMark({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon className={className} aria-hidden />;
}

/**
 * Date and today's weather, above the verdict.
 *
 * The weather says where it is measured only when that location is a guess. The
 * athlete's own city on every reading would be noise; hard-coded coordinates
 * presented as their morning would be a lie.
 */
export function TodayHeader({
  dayKey,
  weather,
}: {
  dayKey: string;
  weather: TodayHeaderWeather | null;
}) {
  const label = formatDay(dayKey);
  if (!label && !weather) return null;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-muted-foreground text-sm first-letter:uppercase">{label}</p>

      {weather ? (
        <p className="text-muted-foreground inline-flex items-baseline gap-1.5 text-sm">
          <WeatherMark
            icon={activityWeatherIcon(weather.condition as ActivityWeatherCondition)}
            className={cn(
              'size-3.5 self-center',
              activityWeatherIconClassName(weather.condition as ActivityWeatherCondition),
            )}
          />
          <span className="text-data text-foreground/85 text-xs tabular-nums">
            {Math.round(weather.tempC)}°
          </span>
          {/* No place name on a guessed location: naming a city we are not sure of
              reads as knowledge. The temperature still carries, marked as approximate. */}
          {weather.locationKnown ? (
            <span>{weather.city}</span>
          ) : (
            <span className="text-muted-foreground/60">position approximative</span>
          )}
        </p>
      ) : null}
    </div>
  );
}
