'use client';

import type { LucideIcon } from 'lucide-react';
import {
  activityWeatherIcon,
  activityWeatherIconClassName,
  type ActivityWeatherCondition,
} from '@/lib/activity/weather/activity-weather';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeviceLocation,
  type DeviceLocationState,
} from '@/components/today/dashboard/use-device-location';
import { cn } from '@/lib/utils';

type TodayHeaderWeather = {
  city: string;
  tempC: number;
  condition: string;
  locationKnown: boolean;
};

/**
 * Takes the icon as a prop rather than resolving it in JSX: a component looked up
 * during render is remounted every pass, which the lint rule rightly refuses.
 */
function WeatherMark({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon className={className} aria-hidden />;
}

const PROMPT_COPY: Record<DeviceLocationState, string> = {
  idle: 'Utiliser ma position',
  asking: 'Localisation…',
  denied: 'Position refusée par le navigateur',
  unavailable: 'Localisation désactivée sur l’appareil',
  timeout: 'Localisation trop lente',
  unsupported: 'Localisation non supportée',
  saveFailed: 'Enregistrement impossible',
};

const ACTIONABLE_STATES = new Set<DeviceLocationState>(['idle', 'asking']);

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

function KnownLocation({ city }: { city: string }) {
  const { state, ask } = useDeviceLocation({ autoRefresh: true });
  const refreshing = state === 'asking';

  return (
    <button
      aria-label={`Localisation ${city}. Mettre à jour la position`}
      className="hover:text-foreground underline-offset-2 hover:underline disabled:no-underline"
      disabled={refreshing}
      title="Mettre à jour la position"
      type="button"
      onClick={() => ask({ maximumAge: 0 })}
    >
      {refreshing ? 'Localisation…' : city}
    </button>
  );
}

export function TodayHeaderWeatherLine({
  loading,
  weather,
}: {
  loading: boolean;
  weather: TodayHeaderWeather | null;
}) {
  if (loading && !weather) {
    return <Skeleton className="h-4 w-28 rounded" />;
  }

  if (!weather) {
    return null;
  }

  return (
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
      {weather.locationKnown ? <KnownLocation city={weather.city} /> : <LocationPrompt />}
    </p>
  );
}
