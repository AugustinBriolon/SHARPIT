import { describe, expect, it } from 'vitest';
import {
  buildHikeStepSparkline,
  buildHikeTripElevationProfile,
  formatRelativeGain,
} from './hike-trip-elevation';
import type { HikeTripMemberInput } from './hike-trip-summary';

function step(
  date: string,
  elevationM: number | null,
  elevationLossM: number | null,
): HikeTripMemberInput {
  return {
    date: new Date(date),
    duration: 3600,
    load: null,
    observedLocationLabel: null,
    hikeMetrics: { distanceM: 8000, elevationM, elevationLossM },
  };
}

describe('buildHikeTripElevationProfile', () => {
  it('draws one tooth per step, rising by D+ then dropping by D−', () => {
    const profile = buildHikeTripElevationProfile([
      step('2026-08-06T09:00:00', 600, 200),
      step('2026-08-07T09:00:00', 400, 500),
    ]);

    expect(profile?.points.map((p) => p.gain)).toEqual([0, 600, 400, 800, 300]);
    expect(profile?.peakGain).toBe(800);
  });

  it('orders steps by date regardless of input order', () => {
    const profile = buildHikeTripElevationProfile([
      step('2026-08-07T09:00:00', 400, 0),
      step('2026-08-06T09:00:00', 600, 0),
    ]);

    expect(profile?.points.map((p) => p.gain)).toEqual([0, 600, 600, 1000, 1000]);
  });

  it('never invents a descent when D− is missing', () => {
    const profile = buildHikeTripElevationProfile([step('2026-08-06T09:00:00', 500, null)]);

    expect(profile?.points.map((p) => p.gain)).toEqual([0, 500, 500]);
    expect(profile?.peakGain).toBe(500);
  });

  it('marks the culminating point, not the last one', () => {
    const profile = buildHikeTripElevationProfile([
      step('2026-08-06T09:00:00', 900, 800),
      step('2026-08-07T09:00:00', 100, 100),
    ]);

    expect(profile?.peakGain).toBe(900);
    expect(profile?.peakX).toBe(1);
  });

  it('exposes junctions between steps only, not after the last one', () => {
    const profile = buildHikeTripElevationProfile([
      step('2026-08-06T09:00:00', 300, 100),
      step('2026-08-07T09:00:00', 300, 100),
      step('2026-08-08T09:00:00', 300, 100),
    ]);

    expect(profile?.stepBoundaries).toEqual([2, 4]);
  });

  it('returns null when no step carries elevation gain', () => {
    expect(buildHikeTripElevationProfile([step('2026-08-06T09:00:00', null, 400)])).toBeNull();
    expect(buildHikeTripElevationProfile([step('2026-08-06T09:00:00', 0, 0)])).toBeNull();
    expect(buildHikeTripElevationProfile([])).toBeNull();
  });
});

describe('buildHikeStepSparkline', () => {
  it('returns start, peak and end for a step with gain', () => {
    expect(
      buildHikeStepSparkline({
        hikeMetrics: { distanceM: null, elevationM: 400, elevationLossM: 150 },
      }),
    ).toEqual([
      { x: 0, gain: 0 },
      { x: 1, gain: 400 },
      { x: 2, gain: 250 },
    ]);
  });

  it('returns null when the step has no gain', () => {
    expect(
      buildHikeStepSparkline({
        hikeMetrics: { distanceM: 5000, elevationM: null, elevationLossM: 100 },
      }),
    ).toBeNull();
    expect(buildHikeStepSparkline({ hikeMetrics: null })).toBeNull();
  });
});

describe('formatRelativeGain', () => {
  it('always signs the reading so it cannot be read as an altitude', () => {
    expect(formatRelativeGain(0)).toBe('+0 m');
    expect(formatRelativeGain(1240.4)).toBe('+1240 m');
    expect(formatRelativeGain(-80)).toBe('−80 m');
  });
});
