'use client';

import {
  OnboardingContinueButton,
  OnboardingSkipButton,
} from '@/components/onboarding/steps/onboarding-step-actions';
import { OnboardingStepShell } from '@/components/onboarding/steps/onboarding-step-shell';
import {
  orderWeekdays,
  sessionsFromWeekdays,
  WEEKDAY_SHORT_LABELS_FR,
  WEEKDAYS_MONDAY_FIRST,
  weekdayLabel,
  type TrainingAvailability,
  type Weekday,
} from '@/lib/training-availability/types';
import { cn } from '@/lib/utils';

/**
 * Declared rhythm: days the athlete can train.
 *
 * Session count is derived from the number of selected days (N days ⇒ N possible
 * sessions). Both remain optional: skip leaves nothing declared and the coach
 * falls back to observed days.
 */

const TILE_CLASS = cn(
  'pressable flex min-h-11 items-center justify-center rounded-xl border px-1',
  'transition-[background-color,border-color] duration-150',
);

function tileToneClass(selected: boolean): string {
  return selected
    ? 'border-highlight bg-highlight text-highlight-foreground'
    : 'border-border/60 bg-background hover:border-primary/30 hover:bg-muted/40';
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
        Les jours où tu peux réellement t’entraîner, contraintes pro et perso comprises. Un jour
        sélectionné compte comme une séance possible.
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
  if (availableWeekdays.length === 0) {
    return null;
  }

  const sessionLabel =
    targetSessionsPerWeek === 1
      ? '1 séance possible'
      : `${targetSessionsPerWeek ?? availableWeekdays.length} séances possibles`;

  return (
    <p className="text-muted-foreground text-xs text-pretty">
      {sessionLabel} · {availableWeekdays.map(weekdayLabel).join(', ')}
    </p>
  );
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
    const availableWeekdays = present
      ? availability.availableWeekdays.filter((value) => value !== day)
      : orderWeekdays([...availability.availableWeekdays, day]);
    onChange({
      ...availability,
      availableWeekdays,
      targetSessionsPerWeek: sessionsFromWeekdays(availableWeekdays),
    });
  };

  return (
    <OnboardingStepShell
      actions={<AvailabilityActions busy={busy} onContinue={onContinue} onSkip={onSkip} />}
      error={error}
      intro="Optionnel. Le coach cale le plan sur ton vrai rythme plutôt que sur une semaine théorique. Modifiable ensuite dans Profil."
      title="Ta semaine type"
      titleId="onboarding-availability-title"
    >
      <div className="space-y-5">
        <WeekdayPicker value={availability.availableWeekdays} onToggle={toggleDay} />
        <AvailabilityReading availability={availability} />
      </div>
    </OnboardingStepShell>
  );
}
