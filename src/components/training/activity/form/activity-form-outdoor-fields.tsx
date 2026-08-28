'use client';

import { LocationPlacePicker } from '@/components/ui/location-place-picker';
import { ActivityFormWeatherHint } from '@/components/training/activity/form/activity-form-weather-hint';
import type { useActivityForm } from '@/components/training/activity/form/use-activity-form';
import { Label } from '@/components/ui/label';

export function ActivityFormOutdoorFields({
  isOutdoor,
  location,
  setLocation,
  locationTouchedRef,
  weatherLoading,
  weatherSummary,
}: Pick<
  ReturnType<typeof useActivityForm>,
  | 'isOutdoor'
  | 'location'
  | 'setLocation'
  | 'locationTouchedRef'
  | 'weatherLoading'
  | 'weatherSummary'
>) {
  if (!isOutdoor) {
    return null;
  }

  return (
    <>
      <div className="grid gap-4 space-y-2 md:col-span-2 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="activity-location">Lieu de la séance</Label>
          <LocationPlacePicker
            id="activity-location"
            placeholder="Rechercher une ville ou un lieu…"
            value={location}
            onChange={(next) => {
              locationTouchedRef.current = true;
              setLocation(next);
            }}
          />
        </div>
      </div>
      <div className="text-muted-foreground flex min-h-5 items-center gap-2 text-xs md:col-span-2">
        <ActivityFormWeatherHint
          hasLocation={Boolean(location)}
          weatherLoading={weatherLoading}
          weatherSummary={weatherSummary}
        />
      </div>
    </>
  );
}
