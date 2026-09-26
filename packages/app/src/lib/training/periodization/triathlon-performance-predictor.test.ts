import { describe, expect, it } from 'vitest';
import {
  estimateBikeSpeedMsFromPower,
  predictTriathlonFinish,
  resolveTriathlonFormat,
} from '@sharpit/app/lib/training/periodization/triathlon-performance-predictor';
import type { RecordEntry, RunBestCategory } from '@sharpit/app/lib/training/records/record-types';

function entry(value: number): RecordEntry {
  return {
    rank: 1,
    value,
    displayValue: '',
    sublabel: null,
    activityId: null,
    date: '2026-01-01',
    title: null,
  };
}

function runBest(meters: number, seconds: number, label: string): RunBestCategory {
  return { meters, label, entries: [entry(seconds)] };
}

describe('resolveTriathlonFormat', () => {
  it('maps Half / 70.3 / Ironman / Olympic', () => {
    expect(resolveTriathlonFormat('Half Ironman', null)).toBe('half');
    expect(resolveTriathlonFormat('70.3', 'Versailles')).toBe('half');
    expect(resolveTriathlonFormat(null, 'Half IronMan Versailles')).toBe('half');
    expect(resolveTriathlonFormat('Ironman', 'Nice')).toBe('full');
    expect(resolveTriathlonFormat('Olympique', null)).toBe('olympic');
  });

  it('does not guess bare triathlon', () => {
    expect(resolveTriathlonFormat('Triathlon', null)).toBeNull();
  });
});

describe('estimateBikeSpeedMsFromPower', () => {
  it('is faster at higher watts', () => {
    const slow = estimateBikeSpeedMsFromPower(180, 75);
    const fast = estimateBikeSpeedMsFromPower(250, 75);
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('predictTriathlonFinish', () => {
  it('sums swim + bike + run + transitions for a Half', () => {
    const prediction = predictTriathlonFinish({
      format: 'half',
      swimCssSecPer100m: 100,
      bikeSpeedSamples: [{ distanceM: 60_000, durationSec: 7200 }],
      ftpW: null,
      runBests: [runBest(10_000, 2400, '10 km')],
      raceTransitions: [{ t1Sec: 200, t2Sec: 160 }],
      brickRunFactors: [1.05],
    });

    expect(prediction).not.toBeNull();
    expect(prediction!.format).toBe('half');
    expect(prediction!.segments.swim).toBeGreaterThan(0);
    expect(prediction!.segments.bike).toBeGreaterThan(0);
    expect(prediction!.segments.run).toBeGreaterThan(0);
    expect(prediction!.seconds).toBe(
      prediction!.segments.swim +
        prediction!.segments.bike +
        prediction!.segments.run +
        prediction!.segments.t1 +
        prediction!.segments.t2,
    );
    expect(prediction!.sources.transitions).toMatch(/Garmin/i);
    expect(prediction!.sources.run).toMatch(/brick/i);
  });

  it('uses brick gaps when race transitions are missing', () => {
    const prediction = predictTriathlonFinish({
      format: 'olympic',
      swimCssSecPer100m: 95,
      ftpW: 250,
      weightKg: 72,
      runBests: [runBest(10_000, 2400, '10 km')],
      brickTransitions: [
        { kind: 't1', gapSec: 240 },
        { kind: 't2', gapSec: 150 },
      ],
    });

    expect(prediction?.sources.transitions).toMatch(/brick/i);
    expect(prediction?.segments.t1).toBe(240);
    expect(prediction?.segments.t2).toBe(150);
  });

  it('returns null without swim evidence', () => {
    expect(
      predictTriathlonFinish({
        format: 'half',
        swimCssSecPer100m: null,
        ftpW: 250,
        runBests: [runBest(10_000, 2400, '10 km')],
      }),
    ).toBeNull();
  });
});
