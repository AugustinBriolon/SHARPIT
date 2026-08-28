'use client';

import { cn } from '@/lib/utils';
import type { GeocodedPlace } from '@/lib/geocoding/types';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';

export function LocationPlaceResults({
  loading,
  onSelect,
  results,
  value,
}: {
  loading: boolean;
  onSelect: (place: GeocodedPlace) => void;
  results: GeocodedPlace[];
  value: LocationPlaceValue;
}) {
  if (!loading && results.length === 0) {
    return null;
  }

  return (
    <ul className="border-border bg-background ring-foreground/10 absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border shadow-none ring-1">
      {loading ? (
        <li className="text-muted-foreground px-3 py-2 text-xs">Recherche…</li>
      ) : (
        results.map((place) => (
          <li key={place.placeId}>
            <button
              type="button"
              className={cn(
                'hover:bg-muted/60 focus-visible:ring-primary/35 min-h-11 w-full px-3 py-2.5 text-left text-xs focus-visible:ring-2 focus-visible:outline-hidden lg:min-h-9 lg:py-2',
                value?.label === place.label && 'bg-muted/40',
              )}
              onClick={() => onSelect(place)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {place.label}
            </button>
          </li>
        ))
      )}
    </ul>
  );
}
