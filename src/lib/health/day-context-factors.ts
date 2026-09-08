/**
 * Day-context factors for the athlete journal / morning check-in.
 * Day signals only — longer modes (En pause / Blessé / Malade) live in activity-status.
 *
 * Night-window factors (`prior_night`) describe the night that ends on this training day:
 * evening of J-1 through wake on J. Daytime factors describe the calendar training day itself.
 */

export const DAY_CONTEXT_FACTOR_IDS = [
  'coffee',
  'mood_low',
  'hydration_low',
  'late_meal',
  'device_in_bed',
  'sick',
] as const;

export type DayContextFactorId = (typeof DAY_CONTEXT_FACTOR_IDS)[number];

/** `prior_night` = nuit qui se termine le matin du jour d’entraînement (J-1 → J). */
export type DayContextFactorWindow = 'calendar_day' | 'prior_night';

export type DayContextFactor = {
  id: DayContextFactorId;
  label: string;
  /** Short hint shown under the chip group. */
  hint: string;
  window: DayContextFactorWindow;
};

export const DAY_CONTEXT_FACTORS: readonly DayContextFactor[] = [
  {
    id: 'coffee',
    label: 'Café',
    hint: 'Stimulant sur la journée',
    window: 'calendar_day',
  },
  {
    id: 'mood_low',
    label: 'Humeur basse',
    hint: 'Moral en retrait sur la journée',
    window: 'calendar_day',
  },
  {
    id: 'hydration_low',
    label: 'Hydratation',
    hint: 'Pas assez bu sur la journée',
    window: 'calendar_day',
  },
  {
    id: 'late_meal',
    label: 'Repas tardif',
    hint: 'Nuit dernière (J-1 → J) — dîner / collation avant le sommeil',
    window: 'prior_night',
  },
  {
    id: 'device_in_bed',
    label: 'Écran au lit',
    hint: 'Nuit dernière (J-1 → J) — appareil avant le sommeil',
    window: 'prior_night',
  },
  {
    id: 'sick',
    label: 'Malade',
    hint: 'Symptômes sur la journée',
    window: 'calendar_day',
  },
] as const;

const FACTOR_SET = new Set<string>(DAY_CONTEXT_FACTOR_IDS);

export function isDayContextFactorId(value: string): value is DayContextFactorId {
  return FACTOR_SET.has(value);
}

export function dayContextFactorById(id: DayContextFactorId): DayContextFactor | undefined {
  return DAY_CONTEXT_FACTORS.find((factor) => factor.id === id);
}

export function isPriorNightFactor(id: DayContextFactorId): boolean {
  return dayContextFactorById(id)?.window === 'prior_night';
}

export function toggleDayContextFactor(
  selected: readonly DayContextFactorId[],
  id: DayContextFactorId,
): DayContextFactorId[] {
  if (selected.includes(id)) {
    return selected.filter((entry) => entry !== id);
  }
  return [...selected, id];
}

function formatFactorForAlgo(factor: DayContextFactor): string {
  if (factor.window === 'prior_night') {
    return `${factor.label} (nuit J-1→J)`;
  }
  return factor.label;
}

/** Encode selected factors into a notes suffix the coach / algo can read. */
export function formatDayContextFactorsNote(
  selected: readonly DayContextFactorId[],
): string | null {
  if (selected.length === 0) {
    return null;
  }
  const labels = DAY_CONTEXT_FACTORS.filter((factor) => selected.includes(factor.id)).map(
    formatFactorForAlgo,
  );
  return `Contexte : ${labels.join(' · ')}`;
}

export function mergeWellnessNotesWithFactors(
  notes: string | null | undefined,
  selected: readonly DayContextFactorId[],
): string | null {
  const factorLine = formatDayContextFactorsNote(selected);
  const trimmed = notes?.trim() || '';
  if (!factorLine && !trimmed) {
    return null;
  }
  if (!factorLine) {
    return trimmed;
  }
  if (!trimmed) {
    return factorLine;
  }
  return `${trimmed}\n${factorLine}`;
}
