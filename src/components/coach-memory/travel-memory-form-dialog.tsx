'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  LocationPlacePicker,
  type LocationPlaceValue,
} from '@/components/ui/location-place-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CoachMemoryEntry, CoachMemoryType, TravelDiscipline } from '@/lib/coach-memory/types';
import {
  TRAVEL_DISCIPLINE_LABELS,
  TRAVEL_DISCIPLINES,
  travelTrainingConstraintLabel,
} from '@/lib/coach-memory/types';
import { deriveTravelTrainingConstraint } from '@/lib/travel-context/disciplines';
import type { TravelMemoryPayload } from '@/hooks/use-coach-memory';
import { guardedActionLabel, useOfflineGuard } from '@/hooks/use-offline-guard';
import { cn } from '@/lib/utils';

const ENTRY_TYPE_OPTIONS: { type: CoachMemoryType; label: string }[] = [
  { type: 'TRAVEL', label: 'Déplacement' },
  { type: 'CONSTRAINT', label: 'Contrainte' },
];

const RADIO_FOCUS =
  'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden';

type TravelMemoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: CoachMemoryEntry | null;
  saving?: boolean;
  onSubmit: (payload: TravelMemoryPayload) => void | Promise<void>;
};

function entryToPlace(entry: CoachMemoryEntry | null | undefined): LocationPlaceValue {
  if (!entry?.locationLabel || entry.locationLat == null || entry.locationLng == null) {
    return null;
  }
  return {
    label: entry.locationLabel,
    latitude: entry.locationLat,
    longitude: entry.locationLng,
  };
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
    if (!open) return;
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

  function focusType(index: number) {
    const clamped = Math.max(0, Math.min(ENTRY_TYPE_OPTIONS.length - 1, index));
    typeRefs.current[clamped]?.focus();
  }

  function selectTypeAt(index: number) {
    const option = ENTRY_TYPE_OPTIONS[index];
    if (!option) return;
    setEntryType(option.type);
    focusType(index);
  }

  function onTypeKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        selectTypeAt((index + 1) % ENTRY_TYPE_OPTIONS.length);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        selectTypeAt((index - 1 + ENTRY_TYPE_OPTIONS.length) % ENTRY_TYPE_OPTIONS.length);
        break;
      case 'Home':
        event.preventDefault();
        selectTypeAt(0);
        break;
      case 'End':
        event.preventDefault();
        selectTypeAt(ENTRY_TYPE_OPTIONS.length - 1);
        break;
      case ' ':
      case 'Enter':
        event.preventDefault();
        selectTypeAt(index);
        break;
      default:
        break;
    }
  }

  function toggleDiscipline(discipline: TravelDiscipline) {
    setNoStructuredTraining(false);
    setAllowedDisciplines((current) =>
      current.includes(discipline)
        ? current.filter((d) => d !== discipline)
        : [...current, discipline],
    );
  }

  function submitLabel(): string {
    if (saving) return 'Enregistrement…';
    if (isEdit) return 'Enregistrer';
    return 'Ajouter';
  }

  const isTravel = entryType === 'TRAVEL';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (guardDisabled) return;
    setError(null);

    if (isTravel && !place) {
      setError('Sélectionne un lieu dans la liste de suggestions.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Les dates de début et de fin sont requises.');
      return;
    }
    if (endDate < startDate) {
      setError('La date de fin doit être postérieure à la date de début.');
      return;
    }

    await onSubmit({
      type: entryType,
      label: label.trim() || null,
      locationLabel: isTravel ? (place?.label ?? null) : null,
      locationLat: isTravel ? (place?.latitude ?? null) : null,
      locationLng: isTravel ? (place?.longitude ?? null) : null,
      startDate,
      endDate,
      note: note.trim() || null,
      allowedDisciplines: noStructuredTraining ? [] : allowedDisciplines,
      noStructuredTraining,
      applyToPlannedSessions: isTravel && !isEdit ? applyToPlannedSessions : false,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby={titleId} className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle id={titleId}>
              {isEdit
                ? `Modifier ${isTravel ? 'le déplacement' : 'la contrainte'}`
                : `Ajouter ${isTravel ? 'un déplacement' : 'une contrainte'}`}
            </DialogTitle>
            <DialogDescription>
              {isTravel
                ? 'Le coach adapte météo, lieux outdoor, charge du macro-plan et types de séances.'
                : 'Le coach adapte volume et intensité pendant cette période — sans déplacement, le lieu ne change pas.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!isEdit ? (
              <div
                aria-label="Type d'entrée"
                className="flex gap-1.5 rounded-lg border p-1"
                role="radiogroup"
              >
                {ENTRY_TYPE_OPTIONS.map((option, index) => {
                  const active = entryType === option.type;
                  return (
                    <button
                      key={option.type}
                      ref={(node) => {
                        typeRefs.current[index] = node;
                      }}
                      aria-checked={active}
                      role="radio"
                      tabIndex={active ? 0 : -1}
                      type="button"
                      className={cn(
                        'min-h-11 flex-1 rounded-md px-2 py-2 text-sm font-medium transition-colors lg:min-h-9 lg:py-1.5',
                        RADIO_FOCUS,
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setEntryType(option.type)}
                      onKeyDown={(event) => onTypeKeyDown(event, index)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor={`${titleId}-label`}>Titre (optionnel)</Label>
              <Input
                ref={labelRef}
                id={`${titleId}-label`}
                value={label}
                placeholder={
                  isTravel
                    ? 'Vacances juillet, camp altitude…'
                    : 'Tendinite genou, semaine chargée…'
                }
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            {isTravel ? (
              <div className="space-y-1.5">
                <Label htmlFor={placeFieldId}>Lieu</Label>
                <LocationPlacePicker id={placeFieldId} value={place} onChange={setPlace} />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${titleId}-start`}>Début</Label>
                <Input
                  id={`${titleId}-start`}
                  type="date"
                  value={startDate}
                  required
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${titleId}-end`}>Fin</Label>
                <Input
                  id={`${titleId}-end`}
                  type="date"
                  value={endDate}
                  required
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Sports possibles</legend>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Coche ce que tu peux faire sur place. Rien coché = tout autorisé. Trek type Écrins →
                mobilité seule.
              </p>
              <div className="grid gap-2">
                {TRAVEL_DISCIPLINES.map((discipline) => (
                  <label
                    key={discipline}
                    className="flex min-h-11 items-center gap-2.5 text-sm lg:min-h-9"
                  >
                    <Checkbox
                      checked={!noStructuredTraining && allowedDisciplines.includes(discipline)}
                      disabled={noStructuredTraining}
                      onCheckedChange={() => toggleDiscipline(discipline)}
                    />
                    <span>{TRAVEL_DISCIPLINE_LABELS[discipline]}</span>
                  </label>
                ))}
                <label className="flex min-h-11 items-center gap-2.5 text-sm lg:min-h-9">
                  <Checkbox
                    checked={noStructuredTraining}
                    onCheckedChange={(checked) => {
                      const next = checked === true;
                      setNoStructuredTraining(next);
                      if (next) setAllowedDisciplines([]);
                    }}
                  />
                  <span>Aucun sport structuré</span>
                </label>
              </div>
              <p className="text-muted-foreground text-xs">
                Effet macro : {travelTrainingConstraintLabel(derivedConstraint)}
              </p>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor={`${titleId}-note`}>Note (optionnel)</Label>
              <Textarea
                id={`${titleId}-note`}
                placeholder="Contraintes, matériel disponible, objectifs du séjour…"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {isTravel && !isEdit ? (
              <label className="flex items-start gap-2.5 text-sm">
                <Checkbox
                  checked={applyToPlannedSessions}
                  className="mt-0.5"
                  onCheckedChange={(checked) => setApplyToPlannedSessions(checked === true)}
                />
                <span>
                  Appliquer aux séances outdoor planifiées sur cette période (météo + lieu).
                </span>
              </label>
            ) : null}

            {error ? (
              <p aria-live="assertive" className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              disabled={saving}
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button disabled={guardDisabled || saving} type="submit">
              {guardedActionLabel(offline, offlineLabel, submitLabel(), {
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
