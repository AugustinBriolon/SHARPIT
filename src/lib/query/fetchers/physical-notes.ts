import type { ClientPhysicalNote } from '../types';
import { fetchJson, type Serialized, toDate, toDateOrNull } from './shared';

export async function fetchPhysicalNotes(): Promise<ClientPhysicalNote[]> {
  const data = await fetchJson<Serialized<ClientPhysicalNote>[]>('/api/physical-notes');
  return data.map((n) => ({
    ...n,
    startDate: toDate(n.startDate),
    resolvedAt: toDateOrNull(n.resolvedAt),
    createdAt: toDate(n.createdAt),
    updatedAt: toDate(n.updatedAt),
    checkins: (n.checkins ?? []).map((c) => ({
      ...c,
      date: toDate(c.date),
      createdAt: toDate(c.createdAt),
    })),
  }));
}
