import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import type { CoachMemoryType, TravelDiscipline } from '@/lib/coach-memory/types';
import type { TravelMemoryPayload } from '@/hooks/use-coach-memory';

function travelLocationFields(isTravel: boolean, place: LocationPlaceValue) {
  if (!isTravel) {
    return { locationLabel: null, locationLat: null, locationLng: null };
  }
  return {
    locationLabel: place?.label ?? null,
    locationLat: place?.latitude ?? null,
    locationLng: place?.longitude ?? null,
  };
}

function resolveApplyToPlannedSessions(isTravel: boolean, isEdit: boolean, apply: boolean) {
  return isTravel && !isEdit ? apply : false;
}

export function validateTravelMemoryForm({
  isTravel,
  place,
  startDate,
  endDate,
}: {
  isTravel: boolean;
  place: LocationPlaceValue;
  startDate: string;
  endDate: string;
}): string | null {
  if (isTravel && !place) {
    return 'Sélectionne un lieu dans la liste de suggestions.';
  }
  if (!startDate || !endDate) {
    return 'Les dates de début et de fin sont requises.';
  }
  if (endDate < startDate) {
    return 'La date de fin doit être postérieure à la date de début.';
  }
  return null;
}

export function buildTravelMemoryPayload({
  entryType,
  isTravel,
  isEdit,
  label,
  place,
  startDate,
  endDate,
  note,
  allowedDisciplines,
  noStructuredTraining,
  applyToPlannedSessions,
}: {
  entryType: CoachMemoryType;
  isTravel: boolean;
  isEdit: boolean;
  label: string;
  place: LocationPlaceValue;
  startDate: string;
  endDate: string;
  note: string;
  allowedDisciplines: TravelDiscipline[];
  noStructuredTraining: boolean;
  applyToPlannedSessions: boolean;
}): TravelMemoryPayload {
  return {
    type: entryType,
    label: label.trim() || null,
    ...travelLocationFields(isTravel, place),
    startDate,
    endDate,
    note: note.trim() || null,
    allowedDisciplines: noStructuredTraining ? [] : allowedDisciplines,
    noStructuredTraining,
    applyToPlannedSessions: resolveApplyToPlannedSessions(isTravel, isEdit, applyToPlannedSessions),
  };
}
