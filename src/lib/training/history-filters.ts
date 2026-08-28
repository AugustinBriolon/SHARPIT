import { ActivityType } from '@prisma/client';
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
  if (min === null && max === null) {
    return [];
  }
  if (max === null) {
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

export function getActivityDistanceKm(activity: ActivityForHistoryFilters): number | null {
  if (activity.type === ActivityType.RUN) {
    const d = activity.runMetrics?.distanceM;
    return d !== null && d > 0 ? d / 1000 : null;
  }
  if (activity.type === ActivityType.SWIM) {
    const d = activity.swimMetrics?.distanceM;
    return d !== null && d > 0 ? d / 1000 : null;
  }
  return null;
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
  if (min !== null && max !== null && min > max) {
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
  if (filters.periodMaxDays !== null) {
    params.set('periodMaxDays', String(filters.periodMaxDays));
  }
  if (filters.periodMinDays !== null) {
    params.set('periodMinDays', String(filters.periodMinDays));
  }
  if (filters.distanceMinKm !== null) {
    params.set('distanceMinKm', String(filters.distanceMinKm));
  }
  if (filters.distanceMaxKm !== null) {
    params.set('distanceMaxKm', String(filters.distanceMaxKm));
  }
  if (filters.durationMinMin !== null) {
    params.set('durationMinMin', String(filters.durationMinMin));
  }
  if (filters.durationMaxMin !== null) {
    params.set('durationMaxMin', String(filters.durationMaxMin));
  }
  return params;
}

// ─── Apply ────────────────────────────────────────────────────────────────────

export function applyTrainingHistoryFilters<T extends ActivityForHistoryFilters>(
  activities: T[],
  filters: TrainingHistoryFilters,
  now: Date = new Date(),
): T[] {
  const since =
    filters.periodMaxDays !== null ? startOfDay(subDays(now, filters.periodMaxDays)) : null;
  const until =
    filters.periodMinDays !== null ? startOfDay(subDays(now, filters.periodMinDays)) : null;

  return activities.filter((activity) => {
    // Type — OR logic: activity must match at least one selected type
    if (filters.types.length > 0 && !filters.types.includes(activity.type)) {
      return false;
    }

    // Period
    const date = new Date(activity.date);
    if (since && date < since) {
      return false;
    }
    if (until && date > until) {
      return false;
    }

    // activity.duration is stored in SECONDS — convert to minutes for filter comparison
    const durationMin = activity.duration !== null ? activity.duration / 60 : null;

    // Distance — only filters activities that track distance; others pass through
    const distanceKm = getActivityDistanceKm(activity);
    if (distanceKm !== null) {
      if (filters.distanceMinKm !== null && distanceKm < filters.distanceMinKm) {
        return false;
      }
      if (filters.distanceMaxKm !== null && distanceKm > filters.distanceMaxKm) {
        return false;
      }
    }

    // Duration (durationMin already in minutes, converted above)
    if (
      filters.durationMinMin !== null &&
      (durationMin === null || durationMin < filters.durationMinMin)
    ) {
      return false;
    }
    if (
      filters.durationMaxMin !== null &&
      (durationMin === null || durationMin > filters.durationMaxMin)
    ) {
      return false;
    }

    return true;
  });
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
  if (filters.periodMaxDays !== null) {
    n += 1;
  }
  if (filters.distanceMinKm !== null || filters.distanceMaxKm !== null) {
    n += 1;
  }
  if (filters.durationMinMin !== null || filters.durationMaxMin !== null) {
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

/** Count active filters within a single dimension (for sub-menu badges). */
export function countDimensionSelections(
  filters: TrainingHistoryFilters,
  dimension: 'types' | 'period' | 'distance' | 'duration',
): number {
  switch (dimension) {
    case 'types':
      return filters.types.length;
    case 'period':
      return filters.periodMaxDays !== null ? 1 : 0;
    case 'distance':
      return filters.distanceMinKm !== null || filters.distanceMaxKm !== null ? 1 : 0;
    case 'duration':
      return filters.durationMinMin !== null || filters.durationMaxMin !== null ? 1 : 0;
  }
}
