import type { GeocodedPlace } from '@/lib/geocoding/types';
import { fetchJson } from './shared';

export async function fetchTravelContext<T = unknown>(): Promise<T> {
  return fetchJson<T>('/api/travel-context');
}

export type GeocodingHomePayload = {
  home?: { label: string; latitude: number; longitude: number } | null;
  [key: string]: unknown;
};

export async function fetchGeocodingHome(dateIso?: string): Promise<GeocodingHomePayload | null> {
  try {
    const url =
      dateIso !== undefined
        ? `/api/geocoding/home?date=${encodeURIComponent(dateIso)}`
        : '/api/geocoding/home';
    return await fetchJson<GeocodingHomePayload>(url);
  } catch {
    return null;
  }
}

export type { GeocodedPlace };

export async function fetchGeocodingSearch(query: string): Promise<GeocodedPlace[]> {
  const data = await fetchJson<{ places?: GeocodedPlace[] }>(
    `/api/geocoding/search?q=${encodeURIComponent(query)}`,
  );
  return data.places ?? [];
}
