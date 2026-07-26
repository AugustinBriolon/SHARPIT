import { describe, expect, it } from 'vitest';
import type { DailyStrainData } from '@/hooks/use-today';
import { buildEffortStrainComposition } from './effort-strain-composition';

function makeStrain(overrides: Partial<DailyStrainData> = {}): DailyStrainData {
  return {
    available: true,
    dailyTss: 40,
    strainScore: 8,
    tier: 'MOVEMENT',
    source: 'DAILY_HEALTH_STEPS',
    dominantContributor: 'MOVEMENT',
    confidence: 0.7,
    structuredSessionDetected: false,
    fallbackUsed: false,
    contributions: {
      training: {
        available: false,
        contributor: 'TRAINING',
        load: null,
        score: null,
        confidence: 0,
        source: 'UNKNOWN',
      },
      cardiovascular: {
        available: true,
        contributor: 'CARDIOVASCULAR',
        load: 12,
        score: 4,
        confidence: 0.7,
        source: 'DAILY_HEALTH_STRESS',
      },
      movement: {
        available: true,
        contributor: 'MOVEMENT',
        load: 24,
        score: 6,
        confidence: 0.7,
        source: 'DAILY_HEALTH_STEPS',
      },
    },
    trace: {
      sessionCount: 0,
      activityCount: 0,
      sessionMethods: [],
      cardiovascularSignals: {
        stress: 48,
        recoveryScore: 60,
        bodyBattery: 55,
        calories: null,
      },
      movementSignals: {
        totalSteps: 12_000,
      },
    },
    ...overrides,
  };
}

describe('buildEffortStrainComposition', () => {
  it('maps Garmin stress, Body Battery and steps into composition rows', () => {
    const view = buildEffortStrainComposition(makeStrain());

    expect(view.available).toBe(true);
    expect(view.dominantKey).toBe('movement');

    const cardio = view.contributors.find((c) => c.key === 'cardiovascular');
    const movement = view.contributors.find((c) => c.key === 'movement');

    expect(cardio?.available).toBe(true);
    expect(cardio?.description).toContain('stress 48');
    expect(cardio?.description).toContain('Body Battery 55');

    expect(movement?.available).toBe(true);
    expect(movement?.description).toContain('12');
    expect(movement?.description).toContain('pas');
  });

  it('returns unavailable rows when daily strain is missing', () => {
    const view = buildEffortStrainComposition(null);
    expect(view.available).toBe(false);
    expect(view.contributors.every((c) => !c.available)).toBe(true);
  });
});
