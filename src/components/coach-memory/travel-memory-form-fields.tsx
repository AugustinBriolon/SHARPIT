'use client';

import {
  LocationPlacePicker,
  type LocationPlaceValue,
} from '@/components/ui/location-place-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CoachMemoryType, TravelDiscipline } from '@/lib/coach-memory/types';
import {
  TRAVEL_DISCIPLINE_LABELS,
  TRAVEL_DISCIPLINES,
  travelTrainingConstraintLabel,
} from '@/lib/coach-memory/types';
import type { TravelTrainingConstraint } from '@/lib/coach-memory/types';
import { handleRadioGroupKeyDown } from '@/components/goals/dialogs/goal-radio-keyboard';
import { cn } from '@/lib/utils';

const ENTRY_TYPE_OPTIONS: { type: CoachMemoryType; label: string }[] = [
  { type: 'TRAVEL', label: 'Déplacement' },
  { type: 'CONSTRAINT', label: 'Contrainte' },
];

const ENTRY_TYPE_COUNT = ENTRY_TYPE_OPTIONS.length;

const RADIO_FOCUS =
  'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden';

export function TravelMemoryTypePicker({
  entryType,
  isEdit,
  typeRefs,
  onSelectType,
}: {
  entryType: CoachMemoryType;
  isEdit: boolean;
  typeRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  onSelectType: (type: CoachMemoryType, index: number) => void;
}) {
  if (isEdit) {
    return null;
  }

  function onTypeKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    handleRadioGroupKeyDown(event, index, ENTRY_TYPE_COUNT, (i) => {
      const option = ENTRY_TYPE_OPTIONS[i];
      if (option) {
        onSelectType(option.type, i);
      }
    });
  }

  return (
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
            onClick={() => onSelectType(option.type, index)}
            onKeyDown={(event) => onTypeKeyDown(event, index)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function TravelMemoryDisciplineFieldset({
  allowedDisciplines,
  derivedConstraint,
  noStructuredTraining,
  onToggleDiscipline,
  onNoStructuredChange,
}: {
  allowedDisciplines: TravelDiscipline[];
  derivedConstraint: TravelTrainingConstraint;
  noStructuredTraining: boolean;
  onToggleDiscipline: (discipline: TravelDiscipline) => void;
  onNoStructuredChange: (checked: boolean) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Sports possibles</legend>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Coche ce que tu peux faire sur place. Rien coché = tout autorisé. Trek type Écrins →
        mobilité seule.
      </p>
      <div className="grid gap-2">
        {TRAVEL_DISCIPLINES.map((discipline) => (
          <label key={discipline} className="flex min-h-11 items-center gap-2.5 text-sm lg:min-h-9">
            <Checkbox
              checked={!noStructuredTraining && allowedDisciplines.includes(discipline)}
              disabled={noStructuredTraining}
              onCheckedChange={() => onToggleDiscipline(discipline)}
            />
            <span>{TRAVEL_DISCIPLINE_LABELS[discipline]}</span>
          </label>
        ))}
        <label className="flex min-h-11 items-center gap-2.5 text-sm lg:min-h-9">
          <Checkbox
            checked={noStructuredTraining}
            onCheckedChange={(checked) => onNoStructuredChange(checked === true)}
          />
          <span>Aucun sport structuré</span>
        </label>
      </div>
      <p className="text-muted-foreground text-xs">
        Effet macro : {travelTrainingConstraintLabel(derivedConstraint)}
      </p>
    </fieldset>
  );
}

export function TravelMemoryFormFields({
  titleId,
  placeFieldId,
  labelRef,
  isTravel,
  isEdit,
  label,
  place,
  startDate,
  endDate,
  note,
  allowedDisciplines,
  derivedConstraint,
  noStructuredTraining,
  applyToPlannedSessions,
  entryType,
  typeRefs,
  error,
  onLabelChange,
  onPlaceChange,
  onStartDateChange,
  onEndDateChange,
  onNoteChange,
  onToggleDiscipline,
  onNoStructuredChange,
  onApplyToPlannedChange,
  onSelectType,
}: {
  titleId: string;
  placeFieldId: string;
  labelRef: React.RefObject<HTMLInputElement | null>;
  isTravel: boolean;
  isEdit: boolean;
  label: string;
  place: LocationPlaceValue;
  startDate: string;
  endDate: string;
  note: string;
  allowedDisciplines: TravelDiscipline[];
  derivedConstraint: TravelTrainingConstraint;
  noStructuredTraining: boolean;
  applyToPlannedSessions: boolean;
  entryType: CoachMemoryType;
  typeRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  error: string | null;
  onLabelChange: (value: string) => void;
  onPlaceChange: (value: LocationPlaceValue) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onToggleDiscipline: (discipline: TravelDiscipline) => void;
  onNoStructuredChange: (checked: boolean) => void;
  onApplyToPlannedChange: (checked: boolean) => void;
  onSelectType: (type: CoachMemoryType, index: number) => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <TravelMemoryTypePicker
        entryType={entryType}
        isEdit={isEdit}
        typeRefs={typeRefs}
        onSelectType={onSelectType}
      />

      <div className="space-y-1.5">
        <Label htmlFor={`${titleId}-label`}>Titre (optionnel)</Label>
        <Input
          ref={labelRef}
          id={`${titleId}-label`}
          value={label}
          placeholder={
            isTravel ? 'Vacances juillet, camp altitude…' : 'Tendinite genou, semaine chargée…'
          }
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>

      {isTravel ? (
        <div className="space-y-1.5">
          <Label htmlFor={placeFieldId}>Lieu</Label>
          <LocationPlacePicker id={placeFieldId} value={place} onChange={onPlaceChange} />
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
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${titleId}-end`}>Fin</Label>
          <Input
            id={`${titleId}-end`}
            type="date"
            value={endDate}
            required
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      </div>

      <TravelMemoryDisciplineFieldset
        allowedDisciplines={allowedDisciplines}
        derivedConstraint={derivedConstraint}
        noStructuredTraining={noStructuredTraining}
        onNoStructuredChange={onNoStructuredChange}
        onToggleDiscipline={onToggleDiscipline}
      />

      <div className="space-y-1.5">
        <Label htmlFor={`${titleId}-note`}>Note (optionnel)</Label>
        <Textarea
          id={`${titleId}-note`}
          placeholder="Contraintes, matériel disponible, objectifs du séjour…"
          rows={3}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      </div>

      {isTravel && !isEdit ? (
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox
            checked={applyToPlannedSessions}
            className="mt-0.5"
            onCheckedChange={(checked) => onApplyToPlannedChange(checked === true)}
          />
          <span>Appliquer aux séances outdoor planifiées sur cette période (météo + lieu).</span>
        </label>
      ) : null}

      {error ? (
        <p aria-live="assertive" className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
