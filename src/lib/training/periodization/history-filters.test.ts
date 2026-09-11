import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import {
  applyTrainingHistoryFilters,
  countActiveTrainingHistoryFilters,
  formatTrainingHistoryFilterStatus,
  countDimensionSelections,
  DEFAULT_TRAINING_HISTORY_FILTERS,
  getActivityDistanceKm,
  parseTrainingHistoryFilters,
  presetSelectionsToRange,
  presetsInScope,
  rangeToPresetSelections,
  serializeTrainingHistoryFilters,
  togglePresetSelection,
} from './history-filters';

// ─── presetSelectionsToRange ──────────────────────────────────────────────────

describe('presetSelectionsToRange', () => {
  it('returns null/null for empty selection', () => {
    expect(presetSelectionsToRange([])).toEqual({ min: null, max: null });
  });

  it('single selection → min only (open upper bound ≥ value)', () => {
    expect(presetSelectionsToRange([60])).toEqual({ min: 60, max: null });
  });

  it('multi selection → closed range between extremes', () => {
    expect(presetSelectionsToRange([30, 90])).toEqual({ min: 30, max: 90 });
    expect(presetSelectionsToRange([30, 60, 90])).toEqual({ min: 30, max: 90 });
  });

  it('normalizes unsorted input', () => {
    expect(presetSelectionsToRange([90, 30])).toEqual({ min: 30, max: 90 });
  });
});

// ─── rangeToPresetSelections ──────────────────────────────────────────────────

describe('rangeToPresetSelections', () => {
  const presets = [30, 60, 90, 120];

  it('returns empty for null/null', () => {
    expect(rangeToPresetSelections(null, null, presets)).toEqual([]);
  });

  it('single selection from min-only range', () => {
    expect(rangeToPresetSelections(60, null, presets)).toEqual([60]);
  });

  it('returns endpoints for closed range', () => {
    expect(rangeToPresetSelections(30, 90, presets)).toEqual([30, 90]);
  });

  it('returns empty if value not in presets', () => {
    expect(rangeToPresetSelections(45, null, presets)).toEqual([]);
  });
});

// ─── presetsInScope ───────────────────────────────────────────────────────────

describe('presetsInScope', () => {
  const presets = [30, 60, 90, 120];

  it('returns empty for single selection', () => {
    expect(presetsInScope([60], presets)).toEqual([]);
  });

  it('returns intermediate values for range', () => {
    expect(presetsInScope([30, 120], presets)).toEqual([60, 90]);
  });

  it('returns empty for adjacent presets', () => {
    expect(presetsInScope([30, 60], presets)).toEqual([]);
  });
});

// ─── togglePresetSelection ────────────────────────────────────────────────────

describe('togglePresetSelection', () => {
  const presets = [30, 60, 90, 120];

  it('clicking idle value → single selection', () => {
    expect(togglePresetSelection([], 60, presets)).toEqual({ min: 60, max: null });
  });

  it('clicking selected endpoint → deselects', () => {
    expect(togglePresetSelection([60], 60, presets)).toEqual({ min: null, max: null });
  });

  it('clicking different idle → expands range', () => {
    expect(togglePresetSelection([60], 90, presets)).toEqual({ min: 60, max: 90 });
  });

  it('clicking in-scope → jumps to single selection', () => {
    // [30, 90] selected → 60 is in-scope
    expect(togglePresetSelection([30, 90], 60, presets)).toEqual({ min: 60, max: null });
  });

  it('clicking endpoint of range → narrows to other endpoint', () => {
    // deselect 30 from [30, 90] → [90]
    expect(togglePresetSelection([30, 90], 30, presets)).toEqual({ min: 90, max: null });
  });
});

// ─── parseTrainingHistoryFilters ─────────────────────────────────────────────

describe('parseTrainingHistoryFilters', () => {
  it('parses multi-type from comma-separated string', () => {
    const f = parseTrainingHistoryFilters(new URLSearchParams('types=RUN,SWIM'));
    expect(f.types).toEqual([ActivityType.RUN, ActivityType.SWIM]);
  });

  it('ignores unknown types', () => {
    const f = parseTrainingHistoryFilters(new URLSearchParams('types=RUN,UNKNOWN'));
    expect(f.types).toEqual([ActivityType.RUN]);
  });

  it('parses period range', () => {
    const f = parseTrainingHistoryFilters(new URLSearchParams('periodMaxDays=90&periodMinDays=7'));
    expect(f.periodMaxDays).toBe(90);
    expect(f.periodMinDays).toBe(7);
  });

  it('normalizes swapped min/max', () => {
    const f = parseTrainingHistoryFilters(
      new URLSearchParams('durationMinMin=120&durationMaxMin=30'),
    );
    expect(f.durationMinMin).toBe(30);
    expect(f.durationMaxMin).toBe(120);
  });

  it('returns defaults for empty params', () => {
    const f = parseTrainingHistoryFilters(new URLSearchParams(''));
    expect(f).toEqual(DEFAULT_TRAINING_HISTORY_FILTERS);
  });
});

// ─── serializeTrainingHistoryFilters ─────────────────────────────────────────

describe('serializeTrainingHistoryFilters', () => {
  it('omits default values', () => {
    expect(serializeTrainingHistoryFilters(DEFAULT_TRAINING_HISTORY_FILTERS).toString()).toBe('');
  });

  it('serializes multi-type as comma-joined string', () => {
    const q = serializeTrainingHistoryFilters({
      ...DEFAULT_TRAINING_HISTORY_FILTERS,
      types: [ActivityType.RUN, ActivityType.BIKE],
    }).toString();
    expect(q).toContain('types=RUN%2CBIKE');
  });

  it('round-trips through parse', () => {
    const original = {
      ...DEFAULT_TRAINING_HISTORY_FILTERS,
      types: [ActivityType.RUN],
      periodMaxDays: 30,
      durationMinMin: 60,
    };
    const parsed = parseTrainingHistoryFilters(
      new URLSearchParams(serializeTrainingHistoryFilters(original).toString()),
    );
    expect(parsed.types).toEqual(original.types);
    expect(parsed.periodMaxDays).toBe(original.periodMaxDays);
    expect(parsed.durationMinMin).toBe(original.durationMinMin);
  });
});

// ─── getActivityDistanceKm ────────────────────────────────────────────────────

describe('getActivityDistanceKm', () => {
  it('returns km for run', () => {
    expect(
      getActivityDistanceKm({
        type: ActivityType.RUN,
        date: new Date(),
        duration: 60,
        load: 70,
        runMetrics: { distanceM: 10500 },
        swimMetrics: null,
      }),
    ).toBeCloseTo(10.5);
  });

  it('returns null for bike (no distance metric)', () => {
    expect(
      getActivityDistanceKm({
        type: ActivityType.BIKE,
        date: new Date(),
        duration: 90,
        load: 80,
        runMetrics: null,
        swimMetrics: null,
      }),
    ).toBeNull();
  });
});

// ─── applyTrainingHistoryFilters ──────────────────────────────────────────────

describe('applyTrainingHistoryFilters', () => {
  const now = new Date('2026-07-28T12:00:00Z');

  // duration is stored in SECONDS in the DB
  const activities = [
    {
      type: ActivityType.RUN,
      date: new Date('2026-07-25'),
      duration: 75 * 60, // 75 min
      load: 80,
      runMetrics: { distanceM: 14000 },
      swimMetrics: null,
    },
    {
      type: ActivityType.RUN,
      date: new Date('2026-05-01'),
      duration: 40 * 60, // 40 min
      load: 45,
      runMetrics: { distanceM: 7000 },
      swimMetrics: null,
    },
    {
      type: ActivityType.BIKE,
      date: new Date('2026-07-20'),
      duration: 120 * 60, // 120 min
      load: 110,
      runMetrics: null,
      swimMetrics: null,
    },
    {
      type: ActivityType.TRIATHLON,
      date: new Date('2026-07-10'),
      duration: 250 * 60, // 250 min → half format (220-360)
      load: 200,
      runMetrics: null,
      swimMetrics: null,
    },
  ];

  it('filters by multi-type OR logic', () => {
    const result = applyTrainingHistoryFilters(
      activities,
      { ...DEFAULT_TRAINING_HISTORY_FILTERS, types: [ActivityType.RUN, ActivityType.BIKE] },
      now,
    );
    expect(result).toHaveLength(3);
    expect(result.every((a) => a.type !== ActivityType.TRIATHLON)).toBe(true);
  });

  it('filters by period window (last N days)', () => {
    const result = applyTrainingHistoryFilters(
      activities,
      { ...DEFAULT_TRAINING_HISTORY_FILTERS, periodMaxDays: 30 },
      now,
    );
    expect(result).toHaveLength(3); // run jul25, bike jul20, triathlon jul10
  });

  it('filters by period range (min–max days old)', () => {
    const result = applyTrainingHistoryFilters(
      activities,
      { ...DEFAULT_TRAINING_HISTORY_FILTERS, periodMinDays: 20, periodMaxDays: 100 },
      now,
    );
    // jul10 = 18 days old → excluded (< 20)
    // jul20 = 8 days old → excluded (< 20)
    // jul25 = 3 days old → excluded (< 20)
    // may01 = 88 days old → included (20–100)
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(ActivityType.RUN);
    expect(result[0].date).toEqual(new Date('2026-05-01'));
  });

  it('filters by duration range', () => {
    const result = applyTrainingHistoryFilters(
      activities,
      { ...DEFAULT_TRAINING_HISTORY_FILTERS, durationMinMin: 60, durationMaxMin: 100 },
      now,
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(ActivityType.RUN);
    expect(result[0].duration).toBe(75 * 60); // stored in seconds
  });

  it('distance filter only applies to supported types', () => {
    const result = applyTrainingHistoryFilters(
      activities,
      { ...DEFAULT_TRAINING_HISTORY_FILTERS, distanceMinKm: 10 },
      now,
    );
    // Bike (no distance) and triathlon (no distance) are NOT filtered out — they pass
    // Run jul25 (14km) passes, run may01 (7km) fails
    expect(result.find((a) => a.type === ActivityType.BIKE)).toBeDefined();
    expect(result.find((a) => a.type === ActivityType.TRIATHLON)).toBeDefined();
    expect(result.find((a) => a.type === ActivityType.RUN && a.duration === 40)).toBeUndefined();
  });
});

// ─── countActiveTrainingHistoryFilters ───────────────────────────────────────

describe('countActiveTrainingHistoryFilters', () => {
  it('returns 0 for defaults', () => {
    expect(countActiveTrainingHistoryFilters(DEFAULT_TRAINING_HISTORY_FILTERS)).toBe(0);
  });

  it('counts each type individually', () => {
    expect(
      countActiveTrainingHistoryFilters({
        types: [ActivityType.RUN, ActivityType.BIKE],
        periodMaxDays: 30,
        periodMinDays: null,
        distanceMinKm: 5,
        distanceMaxKm: null,
        durationMinMin: null,
        durationMaxMin: null,
      }),
    ).toBe(4); // RUN + BIKE + period + distance
  });
});

// ─── countDimensionSelections ─────────────────────────────────────────────────

describe('countDimensionSelections', () => {
  it('returns types count', () => {
    const f = { ...DEFAULT_TRAINING_HISTORY_FILTERS, types: [ActivityType.RUN, ActivityType.SWIM] };
    expect(countDimensionSelections(f, 'types')).toBe(2);
  });

  it('returns 1 when period is set', () => {
    const f = { ...DEFAULT_TRAINING_HISTORY_FILTERS, periodMaxDays: 30 };
    expect(countDimensionSelections(f, 'period')).toBe(1);
  });
});

describe('formatTrainingHistoryFilterStatus', () => {
  it('announces empty filter results', () => {
    expect(formatTrainingHistoryFilterStatus(0)).toBe('Aucune activité ne correspond aux filtres.');
  });

  it('uses singular for one activity', () => {
    expect(formatTrainingHistoryFilterStatus(1)).toBe('1 activité');
  });

  it('uses plural for multiple activities', () => {
    expect(formatTrainingHistoryFilterStatus(12)).toBe('12 activités');
  });
});
