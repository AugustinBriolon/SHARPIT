import { isSameDay } from 'date-fns';
import type { ClientActivity, ClientHealthEntry } from '@/lib/query/types';

export function dayActivities(
  activities: ClientActivity[] | undefined,
  date: Date,
): ClientActivity[] {
  return (activities ?? []).filter((a) => isSameDay(new Date(a.date), date));
}

export function dayHealth(
  entries: ClientHealthEntry[] | undefined,
  date: Date,
): ClientHealthEntry | null {
  return (entries ?? []).find((h) => isSameDay(new Date(h.date), date)) ?? null;
}
