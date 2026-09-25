import { describe, expect, it, vi } from 'vitest';
import { isMetricAvailable } from '../types';
import { openMeteoEnvironmentalAdapter } from '@/core/adapters/environment/open-meteo-adapter';
import { manualEnvironmentalAdapter } from '@/core/adapters/environment/manual-adapter';
import {
  ENVIRONMENTAL_CONTEXT_ENGINE_VERSION,
  buildActivityEnvironment,
  buildActivityEnvironmentalCorrection,
  buildEnvironmentalImpact,
  buildEnvironmentalStress,
  buildForecastEnvironment,
  buildTodayEnvironment,
  collectEnvironmentalObservationDrafts,
  computeHeatIndexC,
  computeProviderPayloadHash,
  computeWbgtC,
  createProviderSnapshot,
  fetchAndIngestEnvironmentalRecords,
  getEnvironmentalStressor,
  ingestObservationRecord,
  ingestEnvironmentalRecords,
  isRecordActive,
  listKnownEnvironmentalStressorIds,
  mergeObservationDrafts,
  resolveEnvironmentalApplicability,
  supersedeObservationRecord,
} from '@/core/environment';
import type {
  EnvironmentalProvider,
  EnvironmentalProviderAdapter,
} from '@/core/environment/provider';
import { createOpenMeteoEnvironmentalProvider } from '@/infrastructure/environment/open-meteo-provider';

const LOCATION = { latitude: 48.85, longitude: 2.35 };
const SNAPSHOT = createProviderSnapshot({
  providerId: 'manual',
  payload: { test: true },
  fetchedAt: new Date('2026-07-10T12:00:00Z'),
});
const META = {
  athleteId: 'default',
  receivedAt: new Date('2026-07-10T12:00:00Z'),
  trainingDayId: '2026-07-10',
  location: LOCATION,
  providerSnapshot: SNAPSHOT,
};

function manualDraft(temp: number) {
  return manualEnvironmentalAdapter.adapt(
    {
      observedAt: '2026-07-10T14:00:00.000Z',
      exposure: 'OUTDOOR',
      measurements: { airTemperatureC: temp, relativeHumidityPct: 60 },
    },
    META,
  )[0];
}

describe('environment-v1.1 contract', () => {
  it('exposes frozen engine version', () => {
    expect(ENVIRONMENTAL_CONTEXT_ENGINE_VERSION).toBe('environment-v1.1');
  });
});

describe('evidence quality + confidence', () => {
  it('separates quality from confidence on metrics', () => {
    const hi = computeHeatIndexC({ airTemperatureC: 32, relativeHumidityPct: 65 });
    expect(hi.available).toBe(true);
    if (hi.available) {
      expect(hi.quality).toBe('ESTIMATED');
      expect(hi.confidence).toBeGreaterThan(0);
      expect(hi.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('never fabricates WBGT without globe temperature', () => {
    const result = computeWbgtC({ airTemperatureC: 30, relativeHumidityPct: 70 }, 'OUTDOOR');
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.quality).toBe('MISSING');
      expect(result.confidence).toBe(0);
    }
  });
});

describe('immutable observation records', () => {
  it('freezes records at ingestion with payload hash', () => {
    const draft = manualDraft(22);
    const record = ingestObservationRecord(draft, 'rec-1', new Date('2026-07-10T12:00:00Z'));

    expect(record.recordVersion).toBe('environment-v1.1');
    expect(record.aggregateQuality).toBe('EXACT');
    expect(record.confidence).toBeGreaterThan(0);
    expect(record.providerSnapshot.payloadHash).toBe(computeProviderPayloadHash({ test: true }));
    expect(Object.isFrozen(record)).toBe(true);
  });

  it('supports supersede chain without mutating original', () => {
    const a = ingestObservationRecord(manualDraft(20), 'a');
    const b = ingestObservationRecord(manualDraft(21), 'b');
    const superseded = supersedeObservationRecord(a, b);

    expect(superseded.supersededBy).toBe('b');
    expect(a.supersededBy).toBeNull();
    expect(isRecordActive(superseded)).toBe(false);
    expect(isRecordActive(a)).toBe(true);
  });
});

describe('EnvironmentalStress stressor collection', () => {
  it('models stress as independent stressors with required fields', () => {
    const record = ingestObservationRecord(manualDraft(34), 'rec-hot');
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 34, relativeHumidityPct: 60, windSpeedMps: 3 },
      records: [record],
    });

    expect(stress.stressors.length).toBeGreaterThanOrEqual(5);
    expect(listKnownEnvironmentalStressorIds()).toEqual(
      expect.arrayContaining(['THERMAL', 'WIND', 'ALTITUDE', 'AIR_QUALITY', 'HYDRATION']),
    );

    for (const stressor of stress.stressors) {
      expect(stressor).toHaveProperty('intensity');
      expect(stressor).toHaveProperty('confidence');
      expect(stressor).toHaveProperty('supportingObservations');
      expect(stressor).toHaveProperty('explanation');
      expect(typeof stressor.explanation).toBe('string');
    }
  });

  it('resolves stressors by id without assuming fixed object keys', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 34, relativeHumidityPct: 60, windSpeedMps: 3 },
    });

    const thermal = getEnvironmentalStressor(stress, 'THERMAL');
    expect(thermal?.id).toBe('THERMAL');
    expect(thermal?.intensity.available).toBe(true);
    expect(stress.compositeIntensity.available).toBe(true);
  });

  it('marks stub stressors as missing without breaking the collection', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 25, relativeHumidityPct: 50, windSpeedMps: 2 },
    });

    const altitude = getEnvironmentalStressor(stress, 'ALTITUDE');
    const airQuality = getEnvironmentalStressor(stress, 'AIR_QUALITY');
    expect(altitude?.intensity.available).toBe(false);
    expect(airQuality?.intensity.available).toBe(false);
    expect(stress.stressors).toHaveLength(5);
  });

  it('suppresses stress for indoor activities', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'INDOOR',
      weather: { airTemperatureC: 35, relativeHumidityPct: 60 },
    });

    expect(stress.suppressionReason).not.toBeNull();
    expect(stress.compositeIntensity.available).toBe(false);
    for (const stressor of stress.stressors) {
      expect(stressor.intensity.available).toBe(false);
    }
  });
});

describe('EnvironmentalImpact physiological adjustments', () => {
  it('exposes only physiological adjustments — no environmental field names', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 34, relativeHumidityPct: 60, windSpeedMps: 3 },
    });
    const impact = buildEnvironmentalImpact({ stress });

    expect(impact).toHaveProperty('recovery');
    expect(impact).toHaveProperty('fatigue');
    expect(impact).toHaveProperty('performance');
    expect(impact).toHaveProperty('hydration');
    expect(impact).toHaveProperty('heatAcclimation');
    expect(impact.confidence).toBeGreaterThan(0);

    expect(impact.recovery.demandMultiplier.available).toBe(true);
    if (impact.recovery.demandMultiplier.available) {
      expect(impact.recovery.demandMultiplier.value).toBeGreaterThan(1);
    }
    expect(impact.performance.expectedOutputRatio.available).toBe(true);
    if (impact.performance.expectedOutputRatio.available) {
      expect(impact.performance.expectedOutputRatio.value).toBeLessThan(1);
    }

    const keys = Object.keys(impact);
    expect(keys).not.toContain('thermalStress');
    expect(keys).not.toContain('windExposure');
    expect(keys).not.toContain('weather');
  });

  it('returns unavailable adjustments when stress is suppressed', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'INDOOR',
      weather: { airTemperatureC: 35 },
    });
    const impact = buildEnvironmentalImpact({ stress });

    expect(impact.confidence).toBe(0);
    expect(impact.recovery.demandMultiplier.available).toBe(false);
  });
});

describe('ActivityEnvironmentalCorrection', () => {
  it('preserves raw metrics invariant and attributes factors for significant heat', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 34, relativeHumidityPct: 40, windSpeedMps: 2 },
    });
    const impact = buildEnvironmentalImpact({ stress });
    const correction = buildActivityEnvironmentalCorrection({
      activityId: 'act-1',
      stress,
      impact,
    });

    expect(correction.rawMetricsPreserved).toBe(true);
    expect(correction.factors.length).toBeGreaterThan(0);
    expect(correction.totalAttributedEffect.available).toBe(true);
    expect(correction.narrative.length).toBeGreaterThan(0);
  });

  it('returns neutral correction for mild conditions', () => {
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
    if (isMetricAvailable(correction.totalAttributedEffect)) {
      expect(correction.totalAttributedEffect.value).toBe(0);
    }
  });
});

describe('context types', () => {
  it('builds ActivityEnvironment with stress, impact, and correction', () => {
    const record = ingestObservationRecord(manualDraft(30), 'rec-act');
    const env = buildActivityEnvironment({
      activityId: 'act-1',
      athleteId: 'default',
      window: {
        start: new Date('2026-07-10T10:00:00Z'),
        end: new Date('2026-07-10T11:00:00Z'),
      },
      location: LOCATION,
      records: [record],
      applicability: { sportType: 'RUN', indoorFlag: false, locationType: 'ROAD' },
    });

    expect(env.kind).toBe('ACTIVITY');
    expect(env.binding.activityId).toBe('act-1');
    expect(env.stress.stressors.length).toBeGreaterThan(0);
    expect(env.impact.recovery.demandMultiplier.available).toBe(true);
    expect(env.correction.rawMetricsPreserved).toBe(true);
  });

  it('suppresses stress and impact for indoor activities', () => {
    const record = ingestObservationRecord(manualDraft(35), 'rec-indoor');
    const env = buildActivityEnvironment({
      activityId: 'act-trainer',
      athleteId: 'default',
      window: {
        start: new Date('2026-07-10T10:00:00Z'),
        end: new Date('2026-07-10T11:00:00Z'),
      },
      location: LOCATION,
      records: [record],
      applicability: { sportType: 'BIKE', indoorFlag: true, locationType: 'TRAINER' },
    });

    expect(env.applicability).toBe('INDOOR');
    expect(env.stress.suppressionReason).not.toBeNull();
    expect(env.impact.confidence).toBe(0);
  });

  it('builds TodayEnvironment from records', () => {
    const record = ingestObservationRecord(manualDraft(25), 'rec-today');
    const env = buildTodayEnvironment({
      athleteId: 'default',
      trainingDayId: '2026-07-10',
      referenceAt: new Date('2026-07-10T18:00:00Z'),
      location: LOCATION,
      records: [record],
    });

    expect(env.kind).toBe('TODAY');
    expect(env.providerIds).toContain('manual');
    expect(env.stress).toBeDefined();
    expect(env.impact).toBeDefined();
  });

  it('keeps ForecastEnvironment predictions separate with projected stress and impact', () => {
    const env = buildForecastEnvironment({
      athleteId: 'default',
      targetWindow: {
        start: new Date('2026-07-11T06:00:00Z'),
        end: new Date('2026-07-11T20:00:00Z'),
      },
      location: LOCATION,
      predictions: [
        {
          predictedAt: new Date('2026-07-10T20:00:00Z'),
          targetAt: new Date('2026-07-11T12:00:00Z'),
          dimension: 'WEATHER',
          payload: {
            dimension: 'WEATHER',
            data: { airTemperatureC: 28, relativeHumidityPct: 55 },
          },
          quality: 'INTERPOLATED',
          confidence: 0.7,
          providerId: 'open-meteo',
        },
      ],
    });

    expect(env.kind).toBe('FORECAST');
    expect(env.predictions).toHaveLength(1);
    expect('records' in env).toBe(false);
    expect(env.projectedStress).toBeDefined();
    expect(env.projectedImpact).toBeDefined();
  });
});

describe('applicability resolver', () => {
  it('marks trainer sessions as indoor', () => {
    expect(
      resolveEnvironmentalApplicability({
        sportType: 'BIKE',
        indoorFlag: true,
        locationType: 'TRAINER',
      }),
    ).toBe('INDOOR');
  });

  it('marks outdoor runs as outdoor', () => {
    expect(
      resolveEnvironmentalApplicability({
        sportType: 'RUN',
        indoorFlag: false,
        locationType: 'ROAD',
      }),
    ).toBe('OUTDOOR');
  });
});

describe('multi-provider merge', () => {
  it('merges drafts from multiple providers', () => {
    const manual = manualEnvironmentalAdapter.adapt(
      {
        observedAt: '2026-07-10T10:00:00.000Z',
        measurements: { airTemperatureC: 18, windSpeedMps: 2 },
      },
      {
        ...META,
        providerSnapshot: createProviderSnapshot({
          providerId: 'manual',
          payload: {},
          fetchedAt: new Date(),
        }),
      },
    );
    const openMeteo = openMeteoEnvironmentalAdapter.adapt(
      {
        latitude: 48.85,
        longitude: 2.35,
        timezone: 'UTC',
        hourly: {
          time: ['2026-07-10T10:00:00.000Z'],
          temperature_2m: [20],
          relative_humidity_2m: [50],
        },
      },
      {
        ...META,
        providerSnapshot: createProviderSnapshot({
          providerId: 'open-meteo',
          payload: {},
          fetchedAt: new Date(),
        }),
      },
    );

    const merged = mergeObservationDrafts([
      { providerId: 'manual', priority: 1, drafts: manual },
      { providerId: 'open-meteo', priority: 10, drafts: openMeteo },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].payload.dimension).toBe('WEATHER');
    if (merged[0].payload.dimension === 'WEATHER') {
      expect(merged[0].payload.data.airTemperatureC).toBe(18);
      expect(merged[0].payload.data.relativeHumidityPct).toBe(50);
    }
  });

  it('collects from all providers without early exit', async () => {
    const p1: EnvironmentalProvider = {
      id: 'open-meteo',
      priority: 10,
      isAvailable: () => true,
      fetch: async () => ({
        status: 'success',
        providerId: 'open-meteo',
        payload: {
          latitude: 48.85,
          longitude: 2.35,
          timezone: 'UTC',
          hourly: { time: ['2026-07-10T10:00'], temperature_2m: [19] },
        },
        fetchedAt: new Date(),
        cacheHit: false,
      }),
    };
    const p2: EnvironmentalProvider = {
      id: 'manual',
      priority: 1,
      isAvailable: () => true,
      fetch: async () => ({
        status: 'success',
        providerId: 'manual',
        payload: {
          observedAt: '2026-07-10T10:00:00Z',
          measurements: { windSpeedMps: 4 },
        },
        fetchedAt: new Date(),
        cacheHit: false,
      }),
    };

    const adapters = new Map<
      import('@/core/environment').EnvironmentalProviderId,
      EnvironmentalProviderAdapter
    >([
      ['open-meteo', openMeteoEnvironmentalAdapter],
      ['manual', manualEnvironmentalAdapter],
    ]);

    const collection = await collectEnvironmentalObservationDrafts(
      { providers: [p1, p2], adapters },
      {
        athleteId: 'default',
        location: LOCATION,
        from: new Date('2026-07-10'),
        to: new Date('2026-07-10'),
      },
    );

    expect(collection.bundles).toHaveLength(2);
    expect(collection.attempts.filter((a) => a.status === 'success')).toHaveLength(2);
  });
});

describe('provider infrastructure', () => {
  it('degrades gracefully on network failure', async () => {
    const provider = createOpenMeteoEnvironmentalProvider({
      fetchFn: vi.fn().mockRejectedValue(new Error('offline')),
    });

    const result = await provider.fetch({
      athleteId: 'default',
      location: LOCATION,
      from: new Date('2026-07-10'),
      to: new Date('2026-07-10'),
    });

    expect(result.status).toBe('unavailable');
  });

  it('ingests merged records end-to-end', async () => {
    const provider: EnvironmentalProvider = {
      id: 'manual',
      priority: 1,
      isAvailable: () => true,
      fetch: async () => ({
        status: 'success',
        providerId: 'manual',
        payload: {
          observedAt: '2026-07-10T10:00:00Z',
          measurements: { airTemperatureC: 22 },
        },
        fetchedAt: new Date('2026-07-10T12:00:00Z'),
        cacheHit: false,
      }),
    };

    const outcome = await fetchAndIngestEnvironmentalRecords(
      {
        providers: [provider],
        adapters: new Map<
          import('@/core/environment').EnvironmentalProviderId,
          EnvironmentalProviderAdapter
        >([['manual', manualEnvironmentalAdapter]]),
        createObservationId: () => 'generated',
      },
      {
        athleteId: 'default',
        location: LOCATION,
        from: new Date('2026-07-10'),
        to: new Date('2026-07-10'),
      },
    );

    expect(outcome.records).toHaveLength(1);
    expect(outcome.records[0].id).toBe('generated');
    expect(ingestEnvironmentalRecords).toBeDefined();
  });
});
