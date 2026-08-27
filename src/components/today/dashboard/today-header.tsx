'use client';

import type { LucideIcon } from 'lucide-react';

import {
  activityWeatherIcon,
  activityWeatherIconClassName,
  type ActivityWeatherCondition,
} from '@/lib/activity/weather/activity-weather';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toLocalCalendarDate } from '@/lib/date/day-key';
import {
  readLastHomeLocationRefreshMs,
  shouldRefreshHomeLocation,
  writeLastHomeLocationRefreshMs,
} from '@/lib/geocoding/home-location-refresh';
import { invalidateAfterAthleteProfileSave } from '@/lib/query/invalidate-after-athlete-profile-save';
import { cn } from '@/lib/utils';

/**
 * Ask the device where we are.
 *
 * First visit: explicit tap ("Utiliser ma position") — the browser will only
 * answer if asked. Once permission is granted, Today soft-refreshes on a
 * throttle so the city does not freeze on the first save forever; the athlete
 * can also tap the city to force a re-read.
 */
function useDeviceLocation(options?: { autoRefresh?: boolean }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<DeviceLocationState>('idle');
  const autoTriedRef = useRef(false);

  const persist = useCallback(
    async (latitude: number, longitude: number) => {
      const res = await fetch('/api/athlete-profile/home-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      writeLastHomeLocationRefreshMs(Date.now());
      await invalidateAfterAthleteProfileSave(queryClient);
    },
    [queryClient],
  );

  const ask = useCallback(
    (opts?: { silent?: boolean; maximumAge?: number }) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (!opts?.silent) setState('unsupported');
        return;
      }
      if (!opts?.silent) setState('asking');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await persist(position.coords.latitude, position.coords.longitude);
            setState('idle');
          } catch (error) {
            console.error('[home-location] save failed', error);
            if (!opts?.silent) setState('saveFailed');
          }
        },
        (error) => {
          console.warn('[home-location] geolocation refused', {
            code: error.code,
            message: error.message,
          });
          if (opts?.silent) return;
          if (error.code === error.PERMISSION_DENIED) setState('denied');
          else if (error.code === error.TIMEOUT) setState('timeout');
          else setState('unavailable');
        },
        { timeout: 15_000, maximumAge: opts?.maximumAge ?? 60_000 },
      );
    },
    [persist],
  );

  useEffect(() => {
    if (!options?.autoRefresh || autoTriedRef.current) return;
    autoTriedRef.current = true;

    const now = Date.now();
    if (!shouldRefreshHomeLocation(readLastHomeLocationRefreshMs(), now)) return;

    let cancelled = false;

    void (async () => {
      // Only soft-refresh when the OS already granted access — never re-prompt.
      const permission = await queryGeolocationPermission();
      if (cancelled || permission !== 'granted') return;
      ask({ silent: true, maximumAge: 120_000 });
    })();

    return () => {
      cancelled = true;
    };
  }, [ask, options?.autoRefresh]);

  return { state, ask };
}

async function queryGeolocationPermission(): Promise<PermissionState | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    // Safari historically rejects this query; treat as unknown and skip auto.
    return 'unknown';
  }
}

type DeviceLocationState =
  'idle' | 'asking' | 'denied' | 'unavailable' | 'timeout' | 'unsupported' | 'saveFailed';

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
 * Each failure names its own cause. One catch-all "indisponible" sent the athlete
 * hunting for a browser prompt the operating system had already declined to show.
 */
const PROMPT_COPY: Record<DeviceLocationState, string> = {
  idle: 'Utiliser ma position',
  asking: 'Localisation…',
  denied: 'Position refusée par le navigateur',
  unavailable: 'Localisation désactivée sur l’appareil',
  timeout: 'Localisation trop lente',
  unsupported: 'Localisation non supportée',
  saveFailed: 'Enregistrement impossible',
};

/** States that still leave something to click. */
const ACTIONABLE_STATES = new Set<DeviceLocationState>(['idle', 'asking']);

/** Offers the fix rather than announcing the gap. */
function LocationPrompt() {
  const { state, ask } = useDeviceLocation();

  if (!ACTIONABLE_STATES.has(state)) {
    return <span className="text-muted-foreground/60">{PROMPT_COPY[state]}</span>;
  }

  return (
    <button
      className="text-muted-foreground/70 hover:text-foreground underline underline-offset-2 disabled:no-underline"
      disabled={state === 'asking'}
      type="button"
      onClick={() => ask({ maximumAge: 0 })}
    >
      {PROMPT_COPY[state]}
    </button>
  );
}

/**
 * Known city — tap refreshes the device reading. Soft auto-refresh runs in the
 * background when permission is already granted and the throttle window elapsed.
 */
function KnownLocation({ city }: { city: string }) {
  const { state, ask } = useDeviceLocation({ autoRefresh: true });
  const refreshing = state === 'asking';

  return (
    <button
      type="button"
      className="hover:text-foreground underline-offset-2 hover:underline disabled:no-underline"
      disabled={refreshing}
      title="Mettre à jour la position"
      aria-label={`Localisation ${city}. Mettre à jour la position`}
      onClick={() => ask({ maximumAge: 0 })}
    >
      {refreshing ? 'Localisation…' : city}
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
  loading = false,
}: {
  dayKey: string;
  weather: TodayHeaderWeather | null;
  /** Weather is still being fetched. The date never is. */
  loading?: boolean;
}) {
  const label = formatDay(dayKey);
  if (!label && !weather && !loading) return null;

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <p className="text-muted-foreground text-sm first-letter:uppercase">{label}</p>

      {loading && !weather ? <Skeleton className="h-4 w-28 rounded" /> : null}

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
          {weather.locationKnown ? <KnownLocation city={weather.city} /> : <LocationPrompt />}
        </p>
      ) : null}
    </div>
  );
}
