/**
 * Declared training rhythm — which days the athlete can train, and how many
 * sessions that implies for the week.
 *
 * Onboarding captures days only; `targetSessionsPerWeek` is derived as the
 * number of selected days (N days ⇒ N possible sessions). Distinct from the
 * days *observed* in past activities: this is intent, and the gap between the
 * two is itself coaching signal.
 */

/** `Date#getDay` convention: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Indexed by `Date#getDay()` — do not reorder. */
export const WEEKDAY_LABELS_FR: readonly string[] = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

/** Reading and picking order — a training week starts on Monday, not Sunday. */
export const WEEKDAYS_MONDAY_FIRST: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0];

/** Short pill labels for the picker, indexed by `Date#getDay()`. */
export const WEEKDAY_SHORT_LABELS_FR: readonly string[] = [
  'Dim',
  'Lun',
  'Mar',
  'Mer',
  'Jeu',
  'Ven',
  'Sam',
];

export const MIN_SESSIONS_PER_WEEK = 1;
export const MAX_SESSIONS_PER_WEEK = 14;

/** Persisted on AthleteProfile.trainingAvailability. */
export type TrainingAvailability = {
  version: 1;
  /**
   * Sessions possible per week. Null when no days are declared.
   * Derived from `availableWeekdays.length` in onboarding (not a separate input).
   */
  targetSessionsPerWeek: number | null;
  /** Days free to train, `Date#getDay` values, stored Monday-first. */
  availableWeekdays: Weekday[];
};

/** N selected days ⇒ N possible sessions; empty days ⇒ undeclared. */
export function sessionsFromWeekdays(days: readonly Weekday[]): number | null {
  return days.length > 0 ? days.length : null;
}

export const EMPTY_TRAINING_AVAILABILITY: TrainingAvailability = {
  version: 1,
  targetSessionsPerWeek: null,
  availableWeekdays: [],
};

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6;
}

/** Monday-first, deduplicated — storage order matches reading order. */
export function orderWeekdays(days: readonly Weekday[]): Weekday[] {
  const present = new Set(days);
  return WEEKDAYS_MONDAY_FIRST.filter((day) => present.has(day));
}

export function weekdayLabel(day: Weekday): string {
  return WEEKDAY_LABELS_FR[day] ?? '';
}

/** « Mardi, Jeudi, Samedi » — empty when nothing is declared. */
export function weekdayLabels(days: readonly Weekday[]): string[] {
  return orderWeekdays(days).map(weekdayLabel);
}
