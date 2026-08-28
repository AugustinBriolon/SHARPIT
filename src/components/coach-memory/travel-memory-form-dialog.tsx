'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CoachMemoryEntry, CoachMemoryType, TravelDiscipline } from '@/lib/coach-memory/types';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import type { TravelMemoryPayload } from '@/hooks/use-coach-memory';
import {
  buildTravelMemoryPayload,
  validateTravelMemoryForm,
} from '@/components/coach-memory/travel-memory-form-helpers';
import { TravelMemoryFormFields } from '@/components/coach-memory/travel-memory-form-fields';
import { deriveTravelTrainingConstraint } from '@/lib/travel-context/disciplines';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';

type TravelMemoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: CoachMemoryEntry | null;
  saving?: boolean;
  onSubmit: (payload: TravelMemoryPayload) => void | Promise<void>;
};

function entryToPlace(entry: CoachMemoryEntry | null | undefined): LocationPlaceValue {
  if (!entry?.locationLabel || entry.locationLat === null || entry.locationLng === null) {
    return null;
  }
  return {
    label: entry.locationLabel,
    latitude: entry.locationLat,
    longitude: entry.locationLng,
  };
}

function travelSubmitLabel(saving: boolean, isEdit: boolean): string {
  if (saving) {
    return 'Enregistrement…';
  }
  if (isEdit) {
    return 'Enregistrer';
  }
  return 'Ajouter';
}

function travelDialogTitle(isEdit: boolean, isTravel: boolean): string {
  if (isEdit) {
    return isTravel ? 'Modifier le déplacement' : 'Modifier la contrainte';
  }
  return isTravel ? 'Ajouter un déplacement' : 'Ajouter une contrainte';
}

function travelDialogDescription(isTravel: boolean): string {
  if (isTravel) {
    return 'Le coach adapte météo, lieux outdoor, charge du macro-plan et types de séances.';
  }
  return 'Le coach adapte volume et intensité pendant cette période — sans déplacement, le lieu ne change pas.';
}

export function TravelMemoryFormDialog({
  open,
  onOpenChange,
  entry,
  saving = false,
  onSubmit,
}: TravelMemoryFormDialogProps) {
  const isEdit = Boolean(entry);
  const titleId = useId();
  const placeFieldId = `${titleId}-place`;
  const labelRef = useRef<HTMLInputElement>(null);
  const typeRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [entryType, setEntryType] = useState<CoachMemoryType>(() => entry?.type ?? 'TRAVEL');
  const [label, setLabel] = useState(() => entry?.label ?? '');
  const [place, setPlace] = useState<LocationPlaceValue>(() => entryToPlace(entry));
  const [startDate, setStartDate] = useState(() => entry?.startDate ?? '');
  const [endDate, setEndDate] = useState(() => entry?.endDate ?? '');
  const [note, setNote] = useState(() => entry?.note ?? '');
  const [allowedDisciplines, setAllowedDisciplines] = useState<TravelDiscipline[]>(
    () => entry?.allowedDisciplines ?? [],
  );
  const [noStructuredTraining, setNoStructuredTraining] = useState(
    () => entry?.trainingConstraint === 'NONE',
  );
  const [applyToPlannedSessions, setApplyToPlannedSessions] = useState(() => !isEdit);
  const [error, setError] = useState<string | null>(null);
  const { offline, guardDisabled, offlineLabel } = useOfflineGuard();

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => labelRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const derivedConstraint = useMemo(
    () =>
      deriveTravelTrainingConstraint(allowedDisciplines, {
        noStructuredTraining,
      }),
    [allowedDisciplines, noStructuredTraining],
  );

  const isTravel = entryType === 'TRAVEL';

  function selectTypeAt(type: CoachMemoryType, index: number) {
    setEntryType(type);
    const clamped = Math.max(0, Math.min(1, index));
    typeRefs.current[clamped]?.focus();
  }

  function toggleDiscipline(discipline: TravelDiscipline) {
    setNoStructuredTraining(false);
    setAllowedDisciplines((current) =>
      current.includes(discipline)
        ? current.filter((d) => d !== discipline)
        : [...current, discipline],
    );
  }

  function handleNoStructuredChange(checked: boolean) {
    setNoStructuredTraining(checked);
    if (checked) {
      setAllowedDisciplines([]);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (guardDisabled) {
      return;
    }
    setError(null);

    const validationError = validateTravelMemoryForm({ isTravel, place, startDate, endDate });
    if (validationError) {
      setError(validationError);
      return;
    }

    void onSubmit(
      buildTravelMemoryPayload({
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
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={titleId} className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle id={titleId}>{travelDialogTitle(isEdit, isTravel)}</DialogTitle>
            <DialogDescription>{travelDialogDescription(isTravel)}</DialogDescription>
          </DialogHeader>

          <TravelMemoryFormFields
            allowedDisciplines={allowedDisciplines}
            applyToPlannedSessions={applyToPlannedSessions}
            derivedConstraint={derivedConstraint}
            endDate={endDate}
            entryType={entryType}
            error={error}
            isEdit={isEdit}
            isTravel={isTravel}
            label={label}
            labelRef={labelRef}
            noStructuredTraining={noStructuredTraining}
            note={note}
            place={place}
            placeFieldId={placeFieldId}
            startDate={startDate}
            titleId={titleId}
            typeRefs={typeRefs}
            onApplyToPlannedChange={setApplyToPlannedSessions}
            onEndDateChange={setEndDate}
            onLabelChange={setLabel}
            onNoStructuredChange={handleNoStructuredChange}
            onNoteChange={setNote}
            onPlaceChange={setPlace}
            onSelectType={selectTypeAt}
            onStartDateChange={setStartDate}
            onToggleDiscipline={toggleDiscipline}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button disabled={guardDisabled || saving} type="submit">
              {guardedActionLabel(offline, offlineLabel, travelSubmitLabel(saving, isEdit), {
                active: saving,
                label: 'Enregistrement…',
              })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
