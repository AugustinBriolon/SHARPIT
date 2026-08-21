'use client';

import type { LucideIcon } from 'lucide-react';

import {
  activityWeatherIcon,
  activityWeatherIconClassName,
  type ActivityWeatherCondition,
} from '@/lib/activity/weather/activity-weather';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toLocalCalendarDate } from '@/lib/date/day-key';
import { cn } from '@/lib/utils';

/**
 * Ask the device where we are, once, on the athlete's request.
 *
 * The server can only derive a location from a GPS-tracked activity, a travel
 * context, or a configured home — none of which exist on a fresh install, where
 * it falls back to hard-coded coordinates. The browser is the only source that
 * knows, and it will only say so if asked.
 */
function useDeviceLocation() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<'idle' | 'asking' | 'denied' | 'failed'>('idle');

  const ask = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState('failed');
      return;
    }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch('/api/athlete-profile/home-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          if (!res.ok) throw new Error('save failed');
          setState('idle');
          await queryClient.invalidateQueries();
        } catch {
          setState('failed');
        }
      },
      (error) => setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed'),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }, [queryClient]);

  return { state, ask };
}

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

const PROMPT_COPY: Record<'idle' | 'asking' | 'denied' | 'failed', string> = {
  idle: 'Utiliser ma position',
  asking: 'Localisation…',
  denied: 'Position refusée',
  failed: 'Position indisponible',
};

/** Offers the fix rather than announcing the gap. */
function LocationPrompt() {
  const { state, ask } = useDeviceLocation();

  if (state === 'denied' || state === 'failed') {
    return <span className="text-muted-foreground/60">{PROMPT_COPY[state]}</span>;
  }

  return (
    <button
      className="text-muted-foreground/70 hover:text-foreground underline underline-offset-2 disabled:no-underline"
      disabled={state === 'asking'}
      type="button"
      onClick={ask}
    >
      {PROMPT_COPY[state]}
    </button>
  );
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
          {/* A city we are not sure of would read as knowledge. Rather than admit
              ignorance and stop there, offer the one thing that resolves it. */}
          {weather.locationKnown ? <span>{weather.city}</span> : <LocationPrompt />}
        </p>
      ) : null}
    </div>
  );
}
