import type { GeocodedPlace } from './types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'SHARPIT/1.0 (training-app; contact@sharpit.local)';

type NominatimSearchResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

type NominatimReverseResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
};

function shortLabel(displayName: string): string {
  const parts = displayName.split(',').map((p) => p.trim());
  if (parts.length <= 2) return displayName;
  return parts.slice(0, 3).join(', ');
}

function toPlace(row: {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}): GeocodedPlace | null {
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    label: shortLabel(row.display_name),
    latitude,
    longitude,
    placeId: String(row.place_id),
  };
}

async function nominatimFetch(path: string): Promise<Response> {
  const res = await fetch(`${NOMINATIM_BASE}${path}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Géocodage indisponible (${res.status})`);
  }
  return res;
}

export async function searchPlaces(query: string, limit = 6): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '0',
    limit: String(limit),
  });

  const res = await nominatimFetch(`/search?${params.toString()}`);
  const rows = (await res.json()) as NominatimSearchResult[];
  return rows.map(toPlace).filter((p): p is GeocodedPlace => p != null);
}

export async function geocodePlaceLabel(label: string): Promise<GeocodedPlace | null> {
  const [first] = await searchPlaces(label, 1);
  return first ?? null;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodedPlace | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    addressdetails: '0',
  });

  const res = await nominatimFetch(`/reverse?${params.toString()}`);
  const row = (await res.json()) as NominatimReverseResult;
  return toPlace(row);
}
