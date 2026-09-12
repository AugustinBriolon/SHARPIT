import { isSet } from '@/lib/util/value';
import type { ClientBodyCompositionEntry, ClientHealthEntry } from '../types';
import { fetchJson, type Serialized, toDate } from './shared';

export async function fetchHealthEntries(
  days: number,
  refDate?: string,
): Promise<ClientHealthEntry[]> {
  const suffix = refDate ? `&date=${encodeURIComponent(refDate)}` : '';
  const data = await fetchJson<Serialized<ClientHealthEntry>[]>(
    `/api/health?days=${days}${suffix}`,
  );
  return data.map((h) => ({
    ...h,
    date: toDate(h.date),
    createdAt: toDate(h.createdAt),
    updatedAt: toDate(h.updatedAt),
  }));
}

export async function fetchBodyCompositionEntries(
  days?: number,
): Promise<ClientBodyCompositionEntry[]> {
  const url = isSet(days) ? `/api/body-composition?days=${days}` : '/api/body-composition';
  const data = await fetchJson<Serialized<ClientBodyCompositionEntry>[]>(url);
  return data.map((entry) => ({
    ...entry,
    measuredAt: toDate(entry.measuredAt),
    createdAt: toDate(entry.createdAt),
    updatedAt: toDate(entry.updatedAt),
  }));
}
