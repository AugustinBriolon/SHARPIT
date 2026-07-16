import type { AthleteTravelContext } from '@prisma/client';
import type { CoachMemoryEntry } from '@/lib/coach-memory/types';
import { isCoachMemorySource } from '@/lib/coach-memory/types';
import { toUtcDateOnly } from '@/lib/travel-context/calendar-date';
import { normalizeTravelDisciplines } from '@/lib/travel-context/disciplines';
import { isTravelTrainingConstraint } from '@/lib/travel-context/training-constraint';

export function travelContextToMemoryEntry(
  travel: AthleteTravelContext,
  onDate = new Date(),
): CoachMemoryEntry {
  const day = toUtcDateOnly(onDate);
  const isActive = travel.startDate <= day && travel.endDate >= day;
  const source = isCoachMemorySource(travel.source) ? travel.source : 'USER';
  const trainingConstraint = isTravelTrainingConstraint(travel.trainingConstraint)
    ? travel.trainingConstraint
    : 'FULL';

  return {
    id: travel.id,
    type: 'TRAVEL',
    source,
    label: travel.label,
    locationLabel: travel.locationLabel,
    locationLat: travel.locationLat,
    locationLng: travel.locationLng,
    startDate: travel.startDate.toISOString().slice(0, 10),
    endDate: travel.endDate.toISOString().slice(0, 10),
    note: travel.note,
    trainingConstraint,
    allowedDisciplines: normalizeTravelDisciplines(travel.allowedDisciplines),
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
