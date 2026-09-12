import { fetchJson } from './shared';

export type TravelContextResponse = {
  active: boolean;
  label?: string | null;
  placeLabel?: string | null;
  [key: string]: unknown;
};

export async function fetchTravelContext(): Promise<TravelContextResponse> {
  return fetchJson<TravelContextResponse>('/api/travel-context');
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

export type GeocodedPlace = {
  label: string;
  latitude: number;
  longitude: number;
  [key: string]: unknown;
};

export async function fetchGeocodingSearch(query: string): Promise<GeocodedPlace[]> {
  const data = await fetchJson<{ places?: GeocodedPlace[] }>(
    `/api/geocoding/search?q=${encodeURIComponent(query)}`,
  );
  return data.places ?? [];
}
