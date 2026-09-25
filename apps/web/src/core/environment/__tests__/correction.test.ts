/**
 * ActivityEnvironmentalCorrection — Phase 3 attribution tests.
 */

import { describe, expect, it } from 'vitest';
import {
  buildActivityEnvironmentalCorrection,
  buildEnvironmentalImpact,
  buildEnvironmentalStress,
} from '@/core/environment';

describe('ActivityEnvironmentalCorrection attribution', () => {
  it('attributes thermal factor for dry hot outdoor activity', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 34, relativeHumidityPct: 40, windSpeedMps: 2 },
    });
    const impact = buildEnvironmentalImpact({ stress });
    const correction = buildActivityEnvironmentalCorrection({
      activityId: 'act-hot',
      stress,
      impact,
    });

    expect(correction.rawMetricsPreserved).toBe(true);
    expect(correction.factors.some((f) => f.stressorId === 'THERMAL')).toBe(true);
    expect(correction.totalAttributedEffect.available).toBe(true);
    expect(correction.narrative.length).toBeGreaterThan(0);
  });

  it('returns empty factors for neutral mild conditions', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 20, relativeHumidityPct: 55, windSpeedMps: 3 },
    });
    const impact = buildEnvironmentalImpact({ stress });
    const correction = buildActivityEnvironmentalCorrection({
      activityId: 'act-mild',
      stress,
      impact,
    });

    expect(correction.factors).toHaveLength(0);
    expect(correction.narrative).toHaveLength(0);
  });

  it('suppresses correction for indoor activities', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'INDOOR',
      weather: { airTemperatureC: 38, relativeHumidityPct: 80, windSpeedMps: 15 },
    });
    const impact = buildEnvironmentalImpact({ stress });
    const correction = buildActivityEnvironmentalCorrection({
      activityId: 'act-indoor',
      stress,
      impact,
    });

    expect(correction.factors).toHaveLength(0);
    expect(correction.totalAttributedEffect.available).toBe(false);
  });
});
