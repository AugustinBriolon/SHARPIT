import { ActivityType } from '@prisma/client';
import { isSet } from '@/lib/util/value';
import { startOfDay, subDays } from 'date-fns';

// ─── Preset values ────────────────────────────────────────────────────────────

export const DURATION_PRESETS = [30, 60, 90, 120] as const;
export const PERIOD_PRESETS = [7, 30, 90, 365] as const;

export const DISTANCE_PRESETS_KM = [1, 5, 15, 25, 50] as const;

// ─── Filter types ─────────────────────────────────────────────────────────────

export type TrainingHistoryFilters = {
  types: ActivityType[];
  periodMinDays: number | null;
  periodMaxDays: number | null;
  distanceMinKm: number | null;
  distanceMaxKm: number | null;
  durationMinMin: number | null;
  durationMaxMin: number | null;
};

export type ActivityForHistoryFilters = {
  type: ActivityType;
  date: Date | string;
  duration: number | null;
  load: number | null;
  runMetrics: { distanceM: number | null } | null;
  swimMetrics: { distanceM: number | null } | null;
};

export const DEFAULT_TRAINING_HISTORY_FILTERS: TrainingHistoryFilters = {
  types: [],
  periodMinDays: null,
  periodMaxDays: null,
  distanceMinKm: null,
  distanceMaxKm: null,
  durationMinMin: null,
  durationMaxMin: null,
};

// ─── Preset ↔ range helpers ───────────────────────────────────────────────────

/**
 * Maps selected preset values → { min, max } filter range.
 * Single selection: min = value, max = null (open upper bound ≥ value).
 * Multi selection: min = smallest, max = largest (closed range).
 */
export function presetSelectionsToRange(selected: number[]): {
  min: number | null;
  max: number | null;
} {
  if (selected.length === 0) {
    return { min: null, max: null };
  }
  const sorted = [...selected].sort((a, b) => a - b);
  return { min: sorted[0], max: sorted.length > 1 ? sorted[sorted.length - 1] : null };
}

/**
 * Derives which preset snap-points are "selected" from a min/max pair.
 * Only endpoint values are selected; intermediate values are in-scope.
 */
export function rangeToPresetSelections(
  min: number | null,
  max: number | null,
  presets: readonly number[],
): number[] {
  if ((min === undefined || min === null) && (max === undefined || max === null)) {
    return [];
  }
  if (max === undefined || max === null) {
    return presets.includes(min as number) ? [min as number] : [];
  }
  return presets.filter((p) => p === min || p === max);
}

/** Returns preset values that fall between the selected endpoints (in-scope but not selected). */
export function presetsInScope(selected: number[], presets: readonly number[]): number[] {
  if (selected.length < 2) {
    return [];
  }
  const lo = Math.min(...selected);
  const hi = Math.max(...selected);
  return presets.filter((p) => p > lo && p < hi);
}

// ─── Distance helpers ─────────────────────────────────────────────────────────

const ACTIVITY_DISTANCE_READERS: Partial<
  Record<ActivityType, (activity: ActivityForHistoryFilters) => number | null>
> = {
  [ActivityType.RUN]: (activity) => {
    const d = activity.runMetrics?.distanceM;
    return isSet(d) && d > 0 ? d / 1000 : null;
  },
  [ActivityType.SWIM]: (activity) => {
    const d = activity.swimMetrics?.distanceM;
    return isSet(d) && d > 0 ? d / 1000 : null;
  },
};

export function getActivityDistanceKm(activity: ActivityForHistoryFilters): number | null {
  return ACTIVITY_DISTANCE_READERS[activity.type]?.(activity) ?? null;
}

// ─── Parse / serialize ────────────────────────────────────────────────────────

function parseNumberParam(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function cleanMinMax(min: number | null, max: number | null): [number | null, number | null] {
  if (isSet(min) && isSet(max) && min > max) {
    return [max, min];
  }
  return [min, max];
}

export function parseTrainingHistoryFilters(searchParams: URLSearchParams): TrainingHistoryFilters {
  const typesParam = searchParams.get('types');
  const types = typesParam
    ? typesParam
        .split(',')
        .filter((t): t is ActivityType => Object.values(ActivityType).includes(t as ActivityType))
    : [];

  const [distanceMinKm, distanceMaxKm] = cleanMinMax(
    parseNumberParam(searchParams.get('distanceMinKm')),
    parseNumberParam(searchParams.get('distanceMaxKm')),
  );
  const [durationMinMin, durationMaxMin] = cleanMinMax(
    parseNumberParam(searchParams.get('durationMinMin')),
    parseNumberParam(searchParams.get('durationMaxMin')),
  );
  const [periodMinDays, periodMaxDays] = cleanMinMax(
    parseNumberParam(searchParams.get('periodMinDays')),
    parseNumberParam(searchParams.get('periodMaxDays')),
  );

  return {
    types,
    periodMinDays,
    periodMaxDays,
    distanceMinKm,
    distanceMaxKm,
    durationMinMin,
    durationMaxMin,
  };
}

export function serializeTrainingHistoryFilters(filters: TrainingHistoryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.types.length > 0) {
    params.set('types', filters.types.join(','));
  }
  if (isSet(filters.periodMaxDays)) {
    params.set('periodMaxDays', String(filters.periodMaxDays));
  }
  if (isSet(filters.periodMinDays)) {
    params.set('periodMinDays', String(filters.periodMinDays));
  }
  if (isSet(filters.distanceMinKm)) {
    params.set('distanceMinKm', String(filters.distanceMinKm));
  }
  if (isSet(filters.distanceMaxKm)) {
    params.set('distanceMaxKm', String(filters.distanceMaxKm));
  }
  if (isSet(filters.durationMinMin)) {
    params.set('durationMinMin', String(filters.durationMinMin));
  }
  if (isSet(filters.durationMaxMin)) {
    params.set('durationMaxMin', String(filters.durationMaxMin));
  }
  return params;
}

// ─── Apply ────────────────────────────────────────────────────────────────────

function activityMatchesPeriod(
  activity: ActivityForHistoryFilters,
  since: Date | null,
  until: Date | null,
): boolean {
  const date = new Date(activity.date);
  if (since && date < since) {
    return false;
  }
  if (until && date > until) {
    return false;
  }
  return true;
}

function activityMatchesDistance(
  activity: ActivityForHistoryFilters,
  filters: TrainingHistoryFilters,
): boolean {
  const distanceKm = getActivityDistanceKm(activity);
  if (distanceKm === undefined || distanceKm === null) {
    return true;
  }
  if (isSet(filters.distanceMinKm) && distanceKm < filters.distanceMinKm) {
    return false;
  }
  if (isSet(filters.distanceMaxKm) && distanceKm > filters.distanceMaxKm) {
    return false;
  }
  return true;
}

function durationOutOfRange(durationMin: number | null, filters: TrainingHistoryFilters): boolean {
  if (
    isSet(filters.durationMinMin) &&
    (!isSet(durationMin) || durationMin < filters.durationMinMin)
  ) {
    return true;
  }
  if (
    isSet(filters.durationMaxMin) &&
    (!isSet(durationMin) || durationMin > filters.durationMaxMin)
  ) {
    return true;
  }
  return false;
}

function activityMatchesDuration(
  activity: ActivityForHistoryFilters,
  filters: TrainingHistoryFilters,
): boolean {
  const durationMin = isSet(activity.duration) ? activity.duration / 60 : null;
  return !durationOutOfRange(durationMin, filters);
}

function activityMatchesTrainingHistoryFilters(
  activity: ActivityForHistoryFilters,
  filters: TrainingHistoryFilters,
  since: Date | null,
  until: Date | null,
): boolean {
  if (filters.types.length > 0 && !filters.types.includes(activity.type)) {
    return false;
  }
  if (!activityMatchesPeriod(activity, since, until)) {
    return false;
  }
  if (!activityMatchesDistance(activity, filters)) {
    return false;
  }
  return activityMatchesDuration(activity, filters);
}

export function applyTrainingHistoryFilters<T extends ActivityForHistoryFilters>(
  activities: T[],
  filters: TrainingHistoryFilters,
  now: Date = new Date(),
): T[] {
  const since = isSet(filters.periodMaxDays)
    ? startOfDay(subDays(now, filters.periodMaxDays))
    : null;
  const until = isSet(filters.periodMinDays)
    ? startOfDay(subDays(now, filters.periodMinDays))
    : null;

  return activities.filter((activity) =>
    activityMatchesTrainingHistoryFilters(activity, filters, since, until),
  );
}

// ─── Preset toggle helper ─────────────────────────────────────────────────────

/**
 * Toggles a preset value in a selection.
 * - Idle value → add to selection (expand range).
 * - Selected endpoint → remove it (narrow range).
 * - In-scope (intermediate) value → jump to single selection at that value.
 */
export function togglePresetSelection(
  current: number[],
  value: number,
  presets: readonly number[],
): { min: number | null; max: number | null } {
  const inScope = presetsInScope(current, presets);
  if (inScope.includes(value)) {
    return presetSelectionsToRange([value]);
  }
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  return presetSelectionsToRange(next);
}

// ─── Count active ─────────────────────────────────────────────────────────────

export function countActiveTrainingHistoryFilters(filters: TrainingHistoryFilters): number {
  let n = 0;
  n += filters.types.length;
  if (isSet(filters.periodMaxDays)) {
    n += 1;
  }
  if (isSet(filters.distanceMinKm) || isSet(filters.distanceMaxKm)) {
    n += 1;
  }
  if (isSet(filters.durationMinMin) || isSet(filters.durationMaxMin)) {
    n += 1;
  }
  return n;
}

/** Screen-reader status line after filters change the visible activity set. */
export function formatTrainingHistoryFilterStatus(count: number): string {
  if (count === 0) {
    return 'Aucune activité ne correspond aux filtres.';
  }
  if (count === 1) {
    return '1 activité';
  }
  return `${count} activités`;
}

const DIMENSION_SELECTION_COUNTERS: Record<
  'types' | 'period' | 'distance' | 'duration',
  (filters: TrainingHistoryFilters) => number
> = {
  types: (filters) => filters.types.length,
  period: (filters) => (isSet(filters.periodMaxDays) ? 1 : 0),
  distance: (filters) => (isSet(filters.distanceMinKm) || isSet(filters.distanceMaxKm) ? 1 : 0),
  duration: (filters) => (isSet(filters.durationMinMin) || isSet(filters.durationMaxMin) ? 1 : 0),
};

/** Count active filters within a single dimension (for sub-menu badges). */
export function countDimensionSelections(
  filters: TrainingHistoryFilters,
  dimension: 'types' | 'period' | 'distance' | 'duration',
): number {
  return DIMENSION_SELECTION_COUNTERS[dimension](filters);
}
