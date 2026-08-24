import { BodyCompositionSource, type BodyCompositionMeasurement } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  dedupeBodyCompositionByDay,
  filterCompositionSeriesByDays,
  formatCompositionDelta,
  formatWeightKgDisplay,
} from './body-composition';

function row(source: BodyCompositionSource, day: string, hour: number): BodyCompositionMeasurement {
  return {
    id: `${source}-${day}-${hour}`,
    athleteId: 'default',
    source,
    externalId: `${source}-${day}`,
    measuredAt: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`),
    weightKg: source === BodyCompositionSource.WITHINGS ? 75 : 74,
    bmi: null,
    bodyFatPct: null,
    waterPct: null,
    musclePct: null,
    boneKg: null,
    bmr: null,
    visceralFat: null,
    proteinPct: null,
    bodyAge: null,
    subcutaneousFatPct: null,
    skeletalMusclePct: null,
    fatFreeWeightKg: null,
    heartRate: null,
    vascularAgeYears: null,
    pulseWaveVelocity: null,
    vo2Max: null,
    nerveHealthScore: null,
    nerveHealthLeft: null,
    nerveHealthRight: null,
    nerveResponseScore: null,
    skinConductance: null,
    metabolicAge: null,
    hydrationKg: null,
    fatMassKg: null,
    extracellularWaterKg: null,
    intracellularWaterKg: null,
    withingsExtras: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('dedupeBodyCompositionByDay', () => {
  it('prefers Withings over Renpho on the same day', () => {
    const result = dedupeBodyCompositionByDay([
      row(BodyCompositionSource.RENPHO, '2026-07-01', 8),
      row(BodyCompositionSource.WITHINGS, '2026-07-01', 9),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe(BodyCompositionSource.WITHINGS);
    expect(result[0]?.weightKg).toBe(75);
  });

  it('keeps Renpho when Withings is absent', () => {
    const result = dedupeBodyCompositionByDay([row(BodyCompositionSource.RENPHO, '2026-06-01', 8)]);
    expect(result[0]?.source).toBe(BodyCompositionSource.RENPHO);
  });

  it('merges split Withings measure groups on the same day', () => {
    const composition = row(BodyCompositionSource.WITHINGS, '2026-07-03', 9);
    const cardio = {
      ...row(BodyCompositionSource.WITHINGS, '2026-07-03', 9),
      id: 'withings-cardio',
      externalId: 'grp-cardio',
      weightKg: null,
      bodyFatPct: null,
      vascularAgeYears: 42,
      nerveHealthScore: 88,
      measuredAt: new Date('2026-07-03T09:01:00'),
    };
    const result = dedupeBodyCompositionByDay([composition, cardio]);
    expect(result).toHaveLength(1);
    expect(result[0]?.weightKg).toBe(75);
    expect(result[0]?.vascularAgeYears).toBe(42);
    expect(result[0]?.nerveHealthScore).toBe(88);
  });
});

describe('filterCompositionSeriesByDays', () => {
  const points = [
    { date: '2026-06-01', weightKg: 76 },
    { date: '2026-07-01', weightKg: 75 },
    { date: '2026-07-20', weightKg: 74.5 },
  ];

  it('returns all points when days is null', () => {
    expect(filterCompositionSeriesByDays(points, null)).toEqual(points);
  });

  it('keeps only points within the window', () => {
    const now = new Date('2026-07-23T12:00:00');
    expect(filterCompositionSeriesByDays(points, 14, now)).toEqual([
      { date: '2026-07-20', weightKg: 74.5 },
    ]);
    expect(filterCompositionSeriesByDays(points, 30, now)).toEqual([
      { date: '2026-07-01', weightKg: 75 },
      { date: '2026-07-20', weightKg: 74.5 },
    ]);
  });

  it('can yield an empty series without implying no imported data', () => {
    const now = new Date('2026-07-23T12:00:00');
    expect(filterCompositionSeriesByDays([{ date: '2026-01-01', weightKg: 80 }], 14, now)).toEqual(
      [],
    );
  });
});

describe('formatWeightKgDisplay', () => {
  it('rounds float noise to one decimal', () => {
    expect(formatWeightKgDisplay(81.08200000000001)).toBe('81.1');
    expect(formatWeightKgDisplay(75)).toBe('75.0');
    expect(formatWeightKgDisplay(74.55)).toBe('74.6');
  });
});

describe('formatCompositionDelta', () => {
  it('rounds float noise before formatting', () => {
    expect(formatCompositionDelta(0.10000000000000142, ' kg')).toBe('+0.1 kg vs 7j préc.');
    expect(formatCompositionDelta(-0.30000000000000004, ' pts')).toBe('-0.3 pts vs 7j préc.');
  });

  it('returns undefined for null', () => {
    expect(formatCompositionDelta(null)).toBeUndefined();
  });
});
