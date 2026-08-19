import { describe, expect, it } from 'vitest';
import { FeatureEngine } from '@/core/features/engine';
import type { ExtractionContext } from '@/core/features/context';
import type {
  BodyCompositionObservation,
  NutritionObservation,
  SessionObservation,
} from '@/core/observation/types';
import type { FuelFeatureSetRecord } from '@/core/features/types';
import { InMemoryFeatureRepository } from '@/infrastructure/dev/in-memory-feature-repository';
import { InMemoryObservationRepository } from '@/infrastructure/dev/in-memory-observation-repository';

function makeSession(overrides: Partial<SessionObservation> = {}): SessionObservation {
  return {
    id: 'session-obs-1',
    athleteId: 'athlete-1',
    type: 'SESSION',
    source: 'GARMIN',
    timestamp: new Date('2026-07-05T08:00:00Z'),
    receivedAt: new Date('2026-07-05T08:01:00Z'),
    trainingDayId: '2026-07-05',
    quality: 'MEASURED_DIRECT',
    qualityFlags: [],
    normalizedAt: new Date('2026-07-05T08:01:30Z'),
    sportType: 'BIKE',
    durationSec: 3600,
    externalId: 'garmin-1',
    powerData: {
      avgWatts: 230,
      normalizedPower: 255,
      quality: 'MEASURED_DIRECT',
    },
    ...overrides,
  };
}

describe('FeatureEngine integrity repair', () => {
  it('recomputes malformed cached session features before building day features', async () => {
    const featureRepository = new InMemoryFeatureRepository();
    const observationRepository = new InMemoryObservationRepository();
    const engine = new FeatureEngine({
      featureRepository,
      observationRepository,
      contextProvider: {
        getContext: async (): Promise<ExtractionContext> => ({
          athleteId: 'athlete-1',
          trainingDayId: '2026-07-05',
          timezone: 'UTC',
          ftpW: 300,
        }),
      },
    });

    const session = makeSession();
    await observationRepository.save(session);
    await featureRepository.save({
      id: 'broken-session-feature',
      athleteId: 'athlete-1',
      category: 'SESSION',
      trainingDayId: '2026-07-05',
      sessionObsId: session.id,
      version: 0,
      status: 'COMPUTED',
      computedAt: new Date('2026-07-05T08:02:00Z'),
      createdAt: new Date('2026-07-05T08:02:00Z'),
      data: {
        trainingDayId: '2026-07-05',
        sessionObsId: session.id,
        tssMethod: 'DURATION_FACTOR',
        tssScore: null,
      } as never,
    });

    const result = await engine.computeDayFeatures('athlete-1', '2026-07-05');

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.tssScore).toBeGreaterThan(70);
    expect(result.load).not.toBe('PENDING');
    if (result.load === 'PENDING') {
      throw new Error('Load features should have been computed');
    }
    expect(result.load.acuteLoad).toBeGreaterThan(0);

    const repaired = await featureRepository.findSessionFeatures('athlete-1', session.id);
    expect(repaired?.data.tssScore).toBeGreaterThan(70);
    expect(repaired?.data.tssMethod).toBe('POWER_BASED');
  });

  it('recomputes session features when stream can now supply hrDriftPercent', async () => {
    const featureRepository = new InMemoryFeatureRepository();
    const observationRepository = new InMemoryObservationRepository();
    const session = makeSession({
      sportType: 'RUN',
      durationSec: 1900,
      powerData: undefined,
    });

    const engine = new FeatureEngine({
      featureRepository,
      observationRepository,
      contextProvider: {
        getContext: async (): Promise<ExtractionContext> => ({
          athleteId: 'athlete-1',
          trainingDayId: '2026-07-05',
          timezone: 'UTC',
          ftpW: 300,
          maxHr: 190,
          lthr: 167,
        }),
      },
      sessionStreamProvider: {
        getSessionStream: async () => ({
          aerobicLoadFactor: 0.8,
          anaerobicLoadFactor: 0.1,
          timeInZones: [10, 20, 0, 0, 0] as [number, number, number, number, number],
          hrDriftPercent: -0.8,
          paceVariabilityIndex: null,
        }),
      },
    });

    await observationRepository.save(session);
    await featureRepository.save({
      id: 'stale-session-feature',
      athleteId: 'athlete-1',
      category: 'SESSION',
      trainingDayId: '2026-07-05',
      sessionObsId: session.id,
      version: 1,
      status: 'COMPUTED',
      computedAt: new Date('2026-07-05T08:02:00Z'),
      createdAt: new Date('2026-07-05T08:02:00Z'),
      data: {
        trainingDayId: '2026-07-05',
        sessionObsId: session.id,
        sportType: 'RUN',
        durationSec: 1900,
        tssScore: 45,
        tssMethod: 'HR',
        hrDriftPercent: null,
        intensityFactor: 0.7,
        confidence: 0.8,
        algorithmId: 'session-features-v1',
      } as never,
    });

    const result = await engine.getDayFeatures('athlete-1', '2026-07-05');
    expect(result.sessions[0]?.hrDriftPercent).toBe(-0.8);
  });
});

describe('FeatureEngine fuel extraction', () => {
  function makeNutrition(overrides: Partial<NutritionObservation> = {}): NutritionObservation {
    return {
      id: 'nutrition-obs-1',
      athleteId: 'athlete-1',
      type: 'NUTRITION',
      source: 'MYFITNESSPAL',
      timestamp: new Date('2026-08-19T12:00:00Z'),
      receivedAt: new Date('2026-08-19T18:00:00Z'),
      trainingDayId: '2026-08-19',
      quality: 'MANUAL',
      qualityFlags: [],
      normalizedAt: new Date('2026-08-19T18:00:00Z'),
      energyKcal: 2310,
      proteinG: 148.6,
      carbohydratesG: 240.2,
      fatG: 78.4,
      goalEnergyKcal: 2400,
      exerciseEnergyKcal: 81,
      diaryComplete: false,
      entryCount: 13,
      ...overrides,
    } as NutritionObservation;
  }

  function makeBodyComp(
    overrides: Partial<BodyCompositionObservation> = {},
  ): BodyCompositionObservation {
    return {
      id: 'body-obs-1',
      athleteId: 'athlete-1',
      type: 'BODY_COMPOSITION',
      source: 'WITHINGS',
      timestamp: new Date('2026-08-11T07:30:00Z'),
      receivedAt: new Date('2026-08-11T07:31:00Z'),
      trainingDayId: '2026-08-11',
      quality: 'MEASURED_DIRECT',
      qualityFlags: [],
      normalizedAt: new Date('2026-08-11T07:31:00Z'),
      externalId: 'withings-grp-1',
      weightKg: 81.1,
      ...overrides,
    } as BodyCompositionObservation;
  }

  it('computes fuel features with per-kilogram ratios from recent body weight', async () => {
    const featureRepository = new InMemoryFeatureRepository();
    const observationRepository = new InMemoryObservationRepository();
    const engine = new FeatureEngine({
      featureRepository,
      observationRepository,
      contextProvider: {
        getContext: async (): Promise<ExtractionContext> => ({
          athleteId: 'athlete-1',
          trainingDayId: '2026-08-19',
          timezone: 'UTC',
        }),
      },
    });

    await observationRepository.save(makeBodyComp());
    await observationRepository.save(makeNutrition());

    const result = await engine.computeDayFeatures('athlete-1', '2026-08-19');

    expect(result.fuel).not.toBe('PENDING');
    if (result.fuel === 'PENDING') throw new Error('Fuel features should have been computed');
    expect(result.fuel.proteinGPerKg).toBe(1.83);
    expect(result.fuel.carbohydratesGPerKg).toBe(2.96);
  });

  it('invalidates fuel features in the 30-day window when a weigh-in arrives', async () => {
    const featureRepository = new InMemoryFeatureRepository();
    const observationRepository = new InMemoryObservationRepository();
    const engine = new FeatureEngine({
      featureRepository,
      observationRepository,
      contextProvider: {
        getContext: async (): Promise<ExtractionContext> => ({
          athleteId: 'athlete-1',
          trainingDayId: '2026-08-19',
          timezone: 'UTC',
        }),
      },
    });

    await featureRepository.save({
      id: 'fuel-before-weigh-in',
      athleteId: 'athlete-1',
      category: 'FUEL',
      trainingDayId: '2026-08-19',
      version: 1,
      status: 'COMPUTED',
      computedAt: new Date('2026-08-19T10:00:00Z'),
      createdAt: new Date('2026-08-19T10:00:00Z'),
      data: {
        trainingDayId: '2026-08-19',
        observationId: 'nutrition-obs-1',
        logged: true,
        entryCount: 13,
        energyKcal: 2310,
        proteinG: 148.6,
        carbohydratesG: 240.2,
        fatG: 78.4,
        energyGoalKcal: 2400,
        exerciseEnergyKcal: 81,
        energyBudgetKcal: 2481,
        energyBalanceKcal: -171,
        energyBudgetRatio: 0.93,
        proteinGPerKg: null,
        carbohydratesGPerKg: null,
        referenceWeightKg: null,
        diaryComplete: false,
        confidence: 0.6,
        algorithmId: 'fuel-features-v1',
        sourceObsIds: ['nutrition-obs-1'],
      },
    } satisfies FuelFeatureSetRecord);

    await engine.onObservationIngested(makeBodyComp({ trainingDayId: '2026-08-11' }));

    expect(await featureRepository.findFuelFeatures('athlete-1', '2026-08-19')).toBeNull();
  });
});
