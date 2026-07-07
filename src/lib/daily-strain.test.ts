import { describe, expect, it } from 'vitest';
import type { ActivityType } from '@prisma/client';
import type { SessionFeatureSet } from '@/core/features/types';
import { computeDailyStrain, dailyTssToStrainScore } from './daily-strain';

function makeSessionFeature(overrides: Partial<SessionFeatureSet> = {}): SessionFeatureSet {
  return {
    sessionObsId: 'session-1',
    trainingDayId: '2026-07-07',
    sportType: 'BIKE',
    durationSec: 3600,
    tssScore: 100,
    tssMethod: 'POWER_BASED',
    intensityFactor: 0.9,
    mechanicalLoad: null,
    elevationStressScore: null,
    hrDriftPercent: null,
    efficiencyFactor: null,
    aerobicLoadFactor: null,
    anaerobicLoadFactor: null,
    paceVariabilityIndex: null,
    subjectiveRpe: null,
    sourceProvidedTss: null,
    timeInZones: null,
    confidence: 1,
    algorithmId: 'session-features-v1',
    sourceObsIds: ['session-1'],
    ...overrides,
  };
}

function makeLegacyActivity(
  overrides: Partial<{
    type: ActivityType;
    duration: number | null;
    load: number | null;
    runMetrics: {
      avgHr?: number | null;
      paceSecPerKm?: number | null;
      distanceM?: number | null;
    } | null;
    bikeMetrics: {
      tss?: number | null;
      normalizedPower?: number | null;
      avgPower?: number | null;
    } | null;
  }> = {},
) {
  return {
    type: 'RUN' as ActivityType,
    duration: 3600,
    load: null,
    runMetrics: null,
    bikeMetrics: null,
    ...overrides,
  };
}

describe('computeDailyStrain', () => {
  it('uses canonical session features before legacy activity fallbacks', () => {
    const result = computeDailyStrain({
      sessionFeatures: [makeSessionFeature({ tssScore: 92, tssMethod: 'POWER_BASED' })],
      legacyActivities: [makeLegacyActivity({ duration: 7200, load: 10 })],
    });

    expect(result.available).toBe(true);
    expect(result.dailyTss).toBe(92);
    expect(result.tier).toBe('STRUCTURED_SESSION');
    expect(result.source).toBe('SESSION_FEATURE_POWER');
    expect(result.fallbackUsed).toBe(false);
  });

  it('falls back to movement only when no defendable physiological signal exists', () => {
    const result = computeDailyStrain({
      sessionFeatures: [],
      legacyActivities: [makeLegacyActivity({ type: 'STRENGTH', duration: 1800, load: null })],
    });

    expect(result.available).toBe(true);
    expect(result.tier).toBe('MOVEMENT');
    expect(result.source).toBe('LEGACY_DURATION');
    expect(result.fallbackUsed).toBe(true);
  });

  it('prefers stronger legacy structured load over weak duration-only session features', () => {
    const result = computeDailyStrain({
      sessionFeatures: [
        makeSessionFeature({ tssMethod: 'DURATION_FACTOR', tssScore: 60, confidence: 0.25 }),
      ],
      legacyActivities: [
        makeLegacyActivity({ type: 'TRIATHLON' as ActivityType, load: 180, duration: 18_000 }),
      ],
    });

    expect(result.dailyTss).toBe(180);
    expect(result.tier).toBe('STRUCTURED_SESSION');
    expect(result.source).toBe('LEGACY_SOURCE_TSS');
    expect(result.fallbackUsed).toBe(true);
  });

  it('returns UNKNOWN instead of inventing precision on no-data days', () => {
    const result = computeDailyStrain({
      sessionFeatures: [],
      legacyActivities: [],
    });

    expect(result.available).toBe(false);
    expect(result.dailyTss).toBeNull();
    expect(result.strainScore).toBeNull();
    expect(result.tier).toBe('UNKNOWN');
  });
});

describe('dailyTssToStrainScore invariants', () => {
  it('preserves physiological ordering for sanity-check scenarios', () => {
    const sedentaryDay = dailyTssToStrainScore(0) ?? -1;
    const walkingDay = dailyTssToStrainScore(20) ?? -1;
    const easyRun = dailyTssToStrainScore(55) ?? -1;
    const tempoRun = dailyTssToStrainScore(95) ?? -1;
    const longRide = dailyTssToStrainScore(180) ?? -1;
    const ironman = dailyTssToStrainScore(300) ?? -1;

    expect(ironman).toBeGreaterThan(longRide);
    expect(longRide).toBeGreaterThan(tempoRun);
    expect(tempoRun).toBeGreaterThan(easyRun);
    expect(easyRun).toBeGreaterThan(walkingDay);
    expect(walkingDay).toBeGreaterThanOrEqual(sedentaryDay);
  });
});
