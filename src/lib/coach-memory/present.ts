import { formatISO, startOfDay } from 'date-fns';
import type { AthleteTravelContext } from '@prisma/client';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';
import { isCoachMemorySource } from '@/lib/coach-memory/types';

export function travelContextToMemoryEntry(
  travel: AthleteTravelContext,
  onDate = new Date(),
): CoachMemoryEntry {
  const day = startOfDay(onDate);
  const isActive = travel.startDate <= day && travel.endDate >= day;
  const source = isCoachMemorySource(travel.source) ? travel.source : 'USER';

  return {
    id: travel.id,
    type: 'TRAVEL',
    source,
    label: travel.label,
    locationLabel: travel.locationLabel,
    locationLat: travel.locationLat,
    locationLng: travel.locationLng,
    startDate: formatISO(travel.startDate, { representation: 'date' }),
    endDate: formatISO(travel.endDate, { representation: 'date' }),
    note: travel.note,
    isActive,
    createdAt: travel.createdAt.toISOString(),
    updatedAt: travel.updatedAt.toISOString(),
  };
}

export function memoryEntriesFromTravelContexts(
  travels: AthleteTravelContext[],
  onDate = new Date(),
): CoachMemoryEntry[] {
  return travels.map((travel) => travelContextToMemoryEntry(travel, onDate));
}
