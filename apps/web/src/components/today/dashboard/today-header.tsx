'use client';

import { toLocalCalendarDate } from '@/lib/date/day-key';
import { TodayHeaderWeatherLine } from '@/components/today/dashboard/today-header-weather';

type TodayHeaderWeather = {
  city: string;
  tempC: number;
  condition: string;
  locationKnown: boolean;
};

function formatDay(dayKey: string): string {
  if (!dayKey) {
    return '';
  }
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) {
    return '';
  }
  return toLocalCalendarDate(new Date(Date.UTC(year, month - 1, day))).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
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
  loading = false,
}: {
  dayKey: string;
  weather: TodayHeaderWeather | null;
  /** Weather is still being fetched. The date never is. */
  loading?: boolean;
}) {
  const label = formatDay(dayKey);
  if (!label && !weather && !loading) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-muted-foreground text-sm first-letter:uppercase">{label}</p>
      <TodayHeaderWeatherLine loading={loading} weather={weather} />
    </div>
  );
}
