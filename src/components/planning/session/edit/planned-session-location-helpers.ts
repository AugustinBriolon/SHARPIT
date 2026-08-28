import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import type { LocationSource } from '@/components/planning/session/edit/planned-session-dialog-helpers';

function homeLocationPayload(home: { label?: string; latitude: number; longitude: number }) {
  return {
    locationLabel: home.label ?? 'Colombes, France',
    locationLat: home.latitude,
    locationLng: home.longitude,
  };
}

function travelLocationPayload(travel: {
  locationLabel: string;
  locationLat: number;
  locationLng: number;
}) {
  return {
    locationLabel: travel.locationLabel,
    locationLat: travel.locationLat,
    locationLng: travel.locationLng,
  };
}

function customLocationPayload(customPlace: LocationPlaceValue) {
  return {
    locationLabel: customPlace.label,
    locationLat: customPlace.latitude,
    locationLng: customPlace.longitude,
  };
}

export function resolveLocationPayload(input: {
  showOutdoorContext: boolean;
  exposure: 'INDOOR' | 'OUTDOOR' | 'UNKNOWN';
  locationSource: LocationSource;
  home?: { label?: string; latitude: number; longitude: number };
  travel?: { locationLabel: string; locationLat: number; locationLng: number } | null;
  customPlace: LocationPlaceValue;
}): {
  locationLabel: string | null;
  locationLat: number | null;
  locationLng: number | null;
} {
  if (!input.showOutdoorContext || input.exposure === 'INDOOR') {
    return { locationLabel: null, locationLat: null, locationLng: null };
  }

  if (input.locationSource === 'home' && input.home) {
    return homeLocationPayload(input.home);
  }

  if (input.locationSource === 'travel' && input.travel) {
    return travelLocationPayload(input.travel);
  }

  if (input.customPlace) {
    return customLocationPayload(input.customPlace);
  }

  return { locationLabel: null, locationLat: null, locationLng: null };
}
