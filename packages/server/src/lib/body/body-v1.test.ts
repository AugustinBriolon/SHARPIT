import { describe, expect, it } from 'vitest';
import {
  projectV1BodyOverview,
  projectV1BodySeries,
  type BodyInputs,
  type CompositionRow,
  type DailyRow,
} from '@sharpit/server/lib/body/body-v1';

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function scale(iso: string, values: Partial<CompositionRow>): CompositionRow {
  return {
    measuredAt: new Date(`${iso}T07:00:00.000Z`),
    source: 'WITHINGS',
    weightKg: null,
    bodyFatPct: null,
    fatFreeWeightKg: null,
    musclePct: null,
    waterPct: null,
    boneKg: null,
    bmi: null,
    visceralFat: null,
    bmr: null,
    bodyAge: null,
    vascularAgeYears: null,
    ...values,
  };
}

function daily(iso: string, values: Partial<DailyRow>): DailyRow {
  return {
    date: day(iso),
    hrv: null,
    restingHr: null,
    hrvBaselineLow: null,
    hrvBaselineHigh: null,
    weightKg: null,
    ...values,
  };
}

function inputs(overrides: Partial<BodyInputs>): BodyInputs {
  return {
    composition: [],
    daily: [],
    dailySource: 'garmin',
    profile: null,
    snapshots: [],
    ...overrides,
  };
}

const metric = (overview: ReturnType<typeof projectV1BodyOverview>, key: string) =>
  overview.metrics.find((m) => m.key === key);

describe('projectV1BodyOverview', () => {
  it('omits every metric without data', () => {
    expect(projectV1BodyOverview(inputs({}))).toEqual({
      apiVersion: 1,
      metrics: [],
      biologicalAge: null,
    });
  });

  it('reads the latest scale value and the one a week earlier', () => {
    const overview = projectV1BodyOverview(
      inputs({
        composition: [
          scale('2026-09-23', { weightKg: 71.24, fatFreeWeightKg: 60, bodyAge: 31 }),
          scale('2026-09-20', { weightKg: 71.8 }),
          scale('2026-09-15', { weightKg: 72.5 }),
        ],
      }),
    );
    expect(metric(overview, 'weight')).toEqual({
      key: 'weight',
      value: 71.2,
      unit: 'kg',
      previous: 72.5,
      deltaWindowDays: 7,
      measuredAt: '2026-09-23T07:00:00.000Z',
      source: 'withings',
    });
    expect(metric(overview, 'leanMassKg')?.value).toBe(60);
    expect(metric(overview, 'bodyAgeScale')?.unit).toBe('years');
    expect(metric(overview, 'bodyFatPct')).toBeUndefined();
  });

  it('falls back to the daily weight when no scale reported one', () => {
    const overview = projectV1BodyOverview(
      inputs({ dailySource: 'apple_health', daily: [daily('2026-09-23', { weightKg: 70 })] }),
    );
    expect(metric(overview, 'weight')).toMatchObject({ value: 70, source: 'apple_health' });
  });

  it('gives HRV as a 7-day mean with the Garmin band and the previous week', () => {
    const rows = [
      ...['2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22'].map(
        (d) => daily(d, { hrv: 60 }),
      ),
      daily('2026-09-23', { hrv: 67, hrvBaselineLow: 55, hrvBaselineHigh: 70 }),
      daily('2026-09-12', { hrv: 50 }),
    ];
    const hrv = metric(projectV1BodyOverview(inputs({ daily: rows })), 'hrv');
    expect(hrv).toEqual({
      key: 'hrv',
      value: 61,
      unit: 'ms',
      baseline: { low: 55, high: 70 },
      previous: 50,
      deltaWindowDays: 7,
      measuredAt: '2026-09-23T00:00:00.000Z',
      source: 'garmin',
    });
  });

  it('compares the 7-day resting HR to its 30-day mean', () => {
    const rows = [
      daily('2026-09-23', { restingHr: 48 }),
      daily('2026-09-20', { restingHr: 50 }),
      daily('2026-09-01', { restingHr: 58 }),
    ];
    const hr = metric(projectV1BodyOverview(inputs({ daily: rows })), 'restingHr');
    expect(hr).toMatchObject({ value: 49, previous: 52, deltaWindowDays: 30 });
  });

  it('reads thresholds from the profile, with the change over 30 days from snapshots', () => {
    const overview = projectV1BodyOverview(
      inputs({
        profile: {
          vo2maxRunning: 54,
          vo2maxCycling: null,
          ftpW: 250,
          maxHr: 188,
          lthr: null,
          runThresholdPaceSecPerKm: 250,
          swimCssSecPer100m: null,
          thresholdsSyncedAt: new Date('2026-09-20T00:00:00.000Z'),
          updatedAt: new Date('2026-09-22T00:00:00.000Z'),
        },
        snapshots: [
          {
            createdAt: new Date('2026-09-20T00:00:00.000Z'),
            source: 'garmin',
            ftpW: 250,
            lthr: null,
            runThresholdPaceSecPerKm: null,
            swimCssSecPer100m: null,
          },
          {
            createdAt: new Date('2026-08-01T00:00:00.000Z'),
            source: 'estimated',
            ftpW: 238,
            lthr: null,
            runThresholdPaceSecPerKm: null,
            swimCssSecPer100m: null,
          },
        ],
      }),
    );
    expect(metric(overview, 'ftp')).toMatchObject({
      value: 250,
      unit: 'W',
      previous: 238,
      deltaWindowDays: 30,
      source: 'garmin',
    });
    expect(metric(overview, 'vo2maxRun')).toMatchObject({ value: 54, source: 'garmin' });
    expect(metric(overview, 'runThresholdPace')).toMatchObject({ value: 250, unit: 's/km' });
    expect(metric(overview, 'vo2maxBike')).toBeUndefined();
    expect(metric(overview, 'lthr')).toBeUndefined();
  });
});

describe('projectV1BodySeries', () => {
  it('returns a scale metric oldest first', () => {
    const series = projectV1BodySeries(
      'bodyFatPct',
      '90d',
      inputs({
        composition: [
          scale('2026-09-23', { bodyFatPct: 14.2 }),
          scale('2026-09-01', { bodyFatPct: 15 }),
          scale('2026-08-20', { weightKg: 72 }),
        ],
      }),
    );
    expect(series).toEqual({
      apiVersion: 1,
      metric: 'bodyFatPct',
      unit: '%',
      range: '90d',
      points: [
        { date: '2026-09-01', value: 15 },
        { date: '2026-09-23', value: 14.2 },
      ],
    });
  });

  it('carries the HRV baseline band day by day', () => {
    const series = projectV1BodySeries(
      'hrv',
      '30d',
      inputs({
        daily: [
          daily('2026-09-23', { hrv: 67, hrvBaselineLow: 55, hrvBaselineHigh: 70 }),
          daily('2026-09-22', { hrv: 60 }),
        ],
      }),
    );
    expect(series.points).toEqual([
      { date: '2026-09-22', value: 60 },
      { date: '2026-09-23', value: 67 },
    ]);
    expect(series.baseline).toEqual([{ date: '2026-09-23', low: 55, high: 70 }]);
  });

  it('gives the current value as the only point for metrics without history', () => {
    const series = projectV1BodySeries(
      'maxHr',
      'all',
      inputs({
        profile: {
          vo2maxRunning: null,
          vo2maxCycling: null,
          ftpW: null,
          maxHr: 188,
          lthr: null,
          runThresholdPaceSecPerKm: null,
          swimCssSecPer100m: null,
          thresholdsSyncedAt: null,
          updatedAt: new Date('2026-09-22T10:00:00.000Z'),
        },
      }),
    );
    expect(series.points).toEqual([{ date: '2026-09-22', value: 188 }]);
  });
});
