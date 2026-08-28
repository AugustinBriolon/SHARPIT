import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import type { LocationSource } from '@/components/planning/session/edit/planned-session-dialog-helpers';

export function buildLocationInput(input: {
  showOutdoorContext: boolean;
  exposure: 'INDOOR' | 'OUTDOOR' | 'UNKNOWN';
  locationSource: LocationSource;
  home?: { label?: string; latitude: number; longitude: number };
  travel?: { locationLabel: string; locationLat: number; locationLng: number } | null;
  customPlace: LocationPlaceValue;
}) {
  return input;
}
