import type { ClientHikeTrip, ClientHikeTripListItem } from '../types';
import { fetchJson, type Serialized, toDate } from './shared';

function hydrateHikeTripActivity(
  activity: Serialized<ClientHikeTrip['activities'][number]>,
): ClientHikeTrip['activities'][number] {
  return {
    ...activity,
    date: toDate(activity.date),
  };
}

/** Rehydrate hike-trip JSON (API / mutation responses) into client Date shapes. */
export function hydrateHikeTrip(trip: Serialized<ClientHikeTrip>): ClientHikeTrip {
  return {
    ...trip,
    createdAt: toDate(trip.createdAt),
    updatedAt: toDate(trip.updatedAt),
    activities: trip.activities.map((activity) => hydrateHikeTripActivity(activity)),
  };
}

function hydrateHikeTripSummary(
  summary: Serialized<ClientHikeTripListItem['summary']>,
): ClientHikeTripListItem['summary'] {
  return {
    ...summary,
    startAt: toDate(summary.startAt),
    endAt: toDate(summary.endAt),
  };
}

export function hydrateHikeTripListItem(
  item: Serialized<ClientHikeTripListItem>,
): ClientHikeTripListItem {
  return {
    ...hydrateHikeTrip(item),
    summary: hydrateHikeTripSummary(item.summary),
  };
}

export async function fetchHikeTrips(): Promise<ClientHikeTripListItem[]> {
  const data = await fetchJson<Serialized<ClientHikeTripListItem>[]>('/api/hike-trips');
  return data.map((item) => hydrateHikeTripListItem(item));
}

export async function fetchHikeTrip(id: string): Promise<ClientHikeTrip> {
  const data = await fetchJson<Serialized<ClientHikeTrip>>(`/api/hike-trips/${id}`);
  return hydrateHikeTrip(data);
}
