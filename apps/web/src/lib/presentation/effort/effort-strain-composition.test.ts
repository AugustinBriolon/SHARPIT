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
    expect(movement?.available).toBe(true);
  });

  it('exposes the raw daily readings so cards can scale and chart them', () => {
    const view = buildEffortStrainComposition(makeStrain());

    expect(view.signals).toEqual({ steps: 12_000, stress: 48, bodyBattery: 55 });
  });

  it('reports empty signals when daily strain is missing', () => {
    expect(buildEffortStrainComposition(null).signals).toEqual({
      steps: null,
      stress: null,
      bodyBattery: null,
    });
  });

  it('returns unavailable rows when daily strain is missing', () => {
    const view = buildEffortStrainComposition(null);
    expect(view.available).toBe(false);
    expect(view.contributors.every((c) => !c.available)).toBe(true);
  });

  it('does not label an available training contribution as empty', () => {
    const view = buildEffortStrainComposition(
      makeStrain({
        dominantContributor: 'TRAINING',
        contributions: {
          training: {
            available: true,
            contributor: 'TRAINING',
            load: 47,
            score: 12,
            confidence: 0.6,
            source: 'LEGACY_SOURCE_TSS',
          },
          cardiovascular: {
            available: false,
            contributor: 'CARDIOVASCULAR',
            load: null,
            score: null,
            confidence: 0,
            source: 'UNKNOWN',
          },
          movement: {
            available: false,
            contributor: 'MOVEMENT',
            load: null,
            score: null,
            confidence: 0,
            source: 'UNKNOWN',
          },
        },
      }),
    );

    const training = view.contributors.find((c) => c.key === 'training');
    expect(training?.available).toBe(true);
    expect(training?.description).toBe('Activités du jour');
    expect(training?.description).not.toMatch(/Aucune/);
  });
});
