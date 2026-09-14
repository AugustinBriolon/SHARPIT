'use client';

import {
  OnboardingContinueButton,
  OnboardingSkipButton,
} from '@/components/onboarding/steps/onboarding-step-actions';
import { OnboardingStepShell } from '@/components/onboarding/steps/onboarding-step-shell';
import {
  orderWeekdays,
  WEEKDAY_SHORT_LABELS_FR,
  WEEKDAYS_MONDAY_FIRST,
  weekdayLabel,
  type TrainingAvailability,
  type Weekday,
} from '@/lib/training-availability/types';
import { cn } from '@/lib/utils';

/**
 * Declared rhythm — what the athlete wants, not what their history shows.
 *
 * Both answers stay optional: an athlete who does not yet know their week must
 * be able to pass, and the coach then falls back to the days it observes.
 */

/** Beyond seven the answer stops being a weekly rhythm; storage still tolerates more. */
const SESSION_CHOICES = [1, 2, 3, 4, 5, 6, 7] as const;

const TILE_CLASS = cn(
  'pressable flex min-h-11 items-center justify-center rounded-xl border px-1',
  'transition-[background-color,border-color] duration-150',
);

function tileToneClass(selected: boolean): string {
  return selected
    ? 'border-highlight bg-highlight text-highlight-foreground'
    : 'border-border/60 bg-background hover:border-primary/30 hover:bg-muted/40';
}

function SessionCountPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-foreground text-sm font-medium">Séances par semaine</legend>
      <p className="text-muted-foreground text-xs">
        Le rythme que tu vises, pas celui que tu tiens déjà. Retape le même chiffre pour l’effacer.
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {SESSION_CHOICES.map((count) => {
          const selected = value === count;
          return (
            <button
              key={count}
              aria-label={`${count} séances par semaine`}
              aria-pressed={selected}
              className={cn(TILE_CLASS, tileToneClass(selected))}
              type="button"
              onClick={() => onChange(selected ? null : count)}
            >
              <span className="text-data text-base font-semibold tabular-nums" aria-hidden>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function WeekdayPicker({
  value,
  onToggle,
}: {
  value: readonly Weekday[];
  onToggle: (day: Weekday) => void;
}) {
  const selected = new Set(value);

  return (
    <fieldset className="space-y-2">
      <legend className="text-foreground text-sm font-medium">Jours disponibles</legend>
      <p className="text-muted-foreground text-xs">
        Les jours où tu peux réellement t’entraîner, contraintes pro et perso comprises.
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS_MONDAY_FIRST.map((day) => {
          const isOn = selected.has(day);
          return (
            <button
              key={day}
              aria-label={weekdayLabel(day)}
              aria-pressed={isOn}
              className={cn(TILE_CLASS, tileToneClass(isOn))}
              type="button"
              onClick={() => onToggle(day)}
            >
              <span className="text-xs font-medium" aria-hidden>
                {WEEKDAY_SHORT_LABELS_FR[day]}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Says nothing when nothing is declared, rather than inventing a default. */
function AvailabilityReading({ availability }: { availability: TrainingAvailability }) {
  const { targetSessionsPerWeek, availableWeekdays } = availability;
  if (targetSessionsPerWeek === null && availableWeekdays.length === 0) {
    return null;
  }

  const parts = [
    targetSessionsPerWeek !== null ? `${targetSessionsPerWeek} séances / semaine` : null,
    availableWeekdays.length > 0 ? availableWeekdays.map(weekdayLabel).join(', ') : null,
  ].filter(Boolean);

  return <p className="text-muted-foreground text-xs text-pretty">{parts.join(' · ')}</p>;
}

function AvailabilityActions({
  busy,
  onContinue,
  onSkip,
}: {
  busy: boolean;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  return (
    <>
      <OnboardingSkipButton disabled={busy} onClick={onSkip} />
      <OnboardingContinueButton disabled={busy} onClick={onContinue} />
    </>
  );
}

export function OnboardingAvailabilityStep({
  availability,
  busy,
  error,
  onChange,
  onContinue,
  onSkip,
}: {
  availability: TrainingAvailability;
  busy: boolean;
  error: string | null;
  onChange: (next: TrainingAvailability) => void;
  onContinue: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}) {
  const toggleDay = (day: Weekday) => {
    const present = availability.availableWeekdays.includes(day);
    onChange({
      ...availability,
      availableWeekdays: present
        ? availability.availableWeekdays.filter((value) => value !== day)
        : orderWeekdays([...availability.availableWeekdays, day]),
    });
  };

  return (
    <OnboardingStepShell
      actions={<AvailabilityActions busy={busy} onContinue={onContinue} onSkip={onSkip} />}
      error={error}
      intro="Optionnel — le coach cale le plan sur ton vrai rythme plutôt que sur une semaine théorique. Modifiable ensuite dans Profil."
      title="Ta semaine type"
      titleId="onboarding-availability-title"
    >
      <div className="space-y-5">
        <SessionCountPicker
          value={availability.targetSessionsPerWeek}
          onChange={(targetSessionsPerWeek) => onChange({ ...availability, targetSessionsPerWeek })}
        />
        <WeekdayPicker value={availability.availableWeekdays} onToggle={toggleDay} />
        <AvailabilityReading availability={availability} />
      </div>
    </OnboardingStepShell>
  );
}
