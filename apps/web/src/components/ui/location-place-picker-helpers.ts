import type { GeocodedPlace } from '@/lib/geocoding/types';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';

export function handleLocationDraftChange({
  nextValue,
  current,
  onChange,
  setDraft,
}: {
  nextValue: string;
  current: LocationPlaceValue;
  onChange: (next: LocationPlaceValue) => void;
  setDraft: (value: string) => void;
}) {
  setDraft(nextValue);
  if (current && nextValue !== current.label) {
    onChange(null);
  }
}

export function toLocationPlaceValue(place: GeocodedPlace): NonNullable<LocationPlaceValue> {
  return {
    label: place.label,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}
