'use client';

import { NUMERIC_INPUT_CLASS } from '@/components/settings/profile/profile-input-format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { athleteAgeYears } from '@/lib/profile/athlete-profile-utils';
import type {
  PersonalFieldKey,
  PersonalProfileFormState,
} from '@/components/settings/profile/personal-profile-helpers';

type FieldProps = {
  state: PersonalProfileFormState;
  fieldErrors: Partial<Record<PersonalFieldKey, string>>;
  onChange: (value: string) => void;
};

function HeightField({
  state,
  fieldErrors,
  heightErrorId,
  onChange,
}: FieldProps & { heightErrorId: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="heightCm">Taille (cm)</Label>
      <Input
        aria-describedby={fieldErrors.heightCm ? heightErrorId : undefined}
        aria-invalid={fieldErrors.heightCm ? true : undefined}
        className={NUMERIC_INPUT_CLASS}
        id="heightCm"
        max={250}
        min={100}
        placeholder="178"
        type="number"
        value={state.heightCm}
        onChange={(e) => onChange(e.target.value)}
      />
      {fieldErrors.heightCm ? (
        <p className="text-destructive text-xs" id={heightErrorId}>
          {fieldErrors.heightCm}
        </p>
      ) : null}
    </div>
  );
}

function BirthDateField({ state, onChange }: FieldProps) {
  const age = athleteAgeYears(state.birthDate || null);
  return (
    <div className="space-y-1.5">
      <Label htmlFor="birthDate">Date de naissance</Label>
      <Input
        className={NUMERIC_INPUT_CLASS}
        id="birthDate"
        type="date"
        value={state.birthDate}
        onChange={(e) => onChange(e.target.value)}
      />
      {age !== null ? (
        <p className="text-muted-foreground text-xs tabular-nums">{age} ans</p>
      ) : null}
    </div>
  );
}

function SleepHoursField({
  state,
  fieldErrors,
  sleepErrorId,
  onChange,
}: FieldProps & { sleepErrorId: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="sleepHours">Objectif sommeil (h)</Label>
      <Input
        aria-describedby={fieldErrors.sleepHours ? sleepErrorId : 'sleepHours-hint'}
        aria-invalid={fieldErrors.sleepHours ? true : undefined}
        className={NUMERIC_INPUT_CLASS}
        id="sleepHours"
        max={12}
        min={4}
        placeholder="8"
        step={0.25}
        type="number"
        value={state.sleepHours}
        onChange={(e) => onChange(e.target.value)}
      />
      {fieldErrors.sleepHours ? (
        <p className="text-destructive text-xs" id={sleepErrorId}>
          {fieldErrors.sleepHours}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs" id="sleepHours-hint">
          Entre 4 et 12 heures.
        </p>
      )}
    </div>
  );
}

function SleepBedtimeField({
  state,
  fieldErrors,
  bedtimeErrorId,
  onChange,
}: FieldProps & { bedtimeErrorId: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="sleepBedtime">Coucher visé (HH:mm)</Label>
      <Input
        aria-describedby={fieldErrors.sleepBedtime ? bedtimeErrorId : undefined}
        aria-invalid={fieldErrors.sleepBedtime ? true : undefined}
        className={NUMERIC_INPUT_CLASS}
        id="sleepBedtime"
        placeholder="22:30"
        value={state.sleepBedtime}
        onChange={(e) => onChange(e.target.value)}
      />
      {fieldErrors.sleepBedtime ? (
        <p className="text-destructive text-xs" id={bedtimeErrorId}>
          {fieldErrors.sleepBedtime}
        </p>
      ) : null}
    </div>
  );
}

type PersonalProfileFieldsProps = {
  state: PersonalProfileFormState;
  fieldErrors: Partial<Record<PersonalFieldKey, string>>;
  heightErrorId: string;
  sleepErrorId: string;
  bedtimeErrorId: string;
  onHeightChange: (value: string) => void;
  onBirthDateChange: (value: string) => void;
  onSleepHoursChange: (value: string) => void;
  onSleepBedtimeChange: (value: string) => void;
};

export function PersonalProfileFields({
  state,
  fieldErrors,
  heightErrorId,
  sleepErrorId,
  bedtimeErrorId,
  onHeightChange,
  onBirthDateChange,
  onSleepHoursChange,
  onSleepBedtimeChange,
}: PersonalProfileFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <HeightField
        fieldErrors={fieldErrors}
        heightErrorId={heightErrorId}
        state={state}
        onChange={onHeightChange}
      />
      <BirthDateField fieldErrors={fieldErrors} state={state} onChange={onBirthDateChange} />
      <SleepHoursField
        fieldErrors={fieldErrors}
        sleepErrorId={sleepErrorId}
        state={state}
        onChange={onSleepHoursChange}
      />
      <SleepBedtimeField
        bedtimeErrorId={bedtimeErrorId}
        fieldErrors={fieldErrors}
        state={state}
        onChange={onSleepBedtimeChange}
      />
    </div>
  );
}
