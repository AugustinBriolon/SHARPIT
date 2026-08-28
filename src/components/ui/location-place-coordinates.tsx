'use client';

import type { LocationPlaceValue } from '@/components/ui/location-place-picker';

export function LocationPlaceCoordinates({ value }: { value: NonNullable<LocationPlaceValue> }) {
  return (
    <p className="text-muted-foreground text-xs">
      Coordonnées : {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
    </p>
  );
}
