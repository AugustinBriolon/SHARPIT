import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildEnvironmentalImpact,
  buildEnvironmentalStress,
  ingestObservationRecord,
} from '@sharpit/core/environment';
import { manualEnvironmentalAdapter } from '@sharpit/server/adapters/environment/manual-adapter';
import { createProviderSnapshot } from '@sharpit/core/environment';
import { rebuildEnvironmentalTwinStateFromRecords } from '@sharpit/core/inference/environment-orchestrator';
import { buildEnvironmentalDecisionSnapshot } from '@sharpit/core/inference/environment/snapshot';
import {
  applyEnvironmentalImpactToReadiness,
  applyEnvironmentalImpactToFatigueIndex,
} from '@sharpit/core/inference/environment/apply-impact';
import { runRecoveryModel } from '@sharpit/core/inference/recovery/model';
import type { DayFeatures } from '@sharpit/core/features/types';

const LOCATION = { latitude: 48.85, longitude: 2.35 };
const META = {
  athleteId: 'default',
  receivedAt: new Date('2026-07-10T12:00:00Z'),
  trainingDayId: '2026-07-10',
  location: LOCATION,
  providerSnapshot: createProviderSnapshot({
    providerId: 'manual',
    payload: { test: true },
    fetchedAt: new Date('2026-07-10T12:00:00Z'),
  }),
};

function manualRecord(temp: number, id: string) {
  const [draft] = manualEnvironmentalAdapter.adapt(
    {
      observedAt: '2026-07-10T14:00:00.000Z',
      exposure: 'OUTDOOR',
      measurements: { airTemperatureC: temp, relativeHumidityPct: 60, windSpeedMps: 4 },
    },
    META,
  );
  return ingestObservationRecord(draft, id, new Date('2026-07-10T12:00:00Z'));
}

describe('environment phase 2 integration', () => {
  it('rebuilds identical twin environmental state from observations', () => {
    const records = [manualRecord(32, 'rec-a'), manualRecord(33, 'rec-b')];
    const referenceAt = new Date('2026-07-10T12:00:00.000Z');

    const first = rebuildEnvironmentalTwinStateFromRecords({
      athleteId: 'default',
      trainingDayId: '2026-07-10',
      referenceAt,
      location: LOCATION,
      records,
      computedAt: new Date('2026-07-10T15:00:00.000Z'),
    });

    const rebuilt = rebuildEnvironmentalTwinStateFromRecords({
      athleteId: 'default',
      trainingDayId: '2026-07-10',
      referenceAt,
      location: LOCATION,
      records,
      computedAt: new Date('2026-07-10T15:00:00.000Z'),
    });

    expect(rebuilt.stress).toEqual(first.stress);
    expect(rebuilt.impact).toEqual(first.impact);
    expect(rebuilt.meta.observationRecordIds).toEqual(['rec-a', 'rec-b']);
  });

  it('exposes only decision-relevant fields on Athlete Snapshot environment view', () => {
    const records = [manualRecord(34, 'rec-hot')];
    const twinState = rebuildEnvironmentalTwinStateFromRecords({
      athleteId: 'default',
      trainingDayId: '2026-07-10',
      referenceAt: new Date('2026-07-10T12:00:00.000Z'),
      location: LOCATION,
      records,
    });

    const snapshot = buildEnvironmentalDecisionSnapshot(twinState);
    const serialized = JSON.stringify(snapshot);

    expect(snapshot).toHaveProperty('thermalStressLevel');
    expect(snapshot).toHaveProperty('recoveryDemandAdjustment');
    expect(snapshot).toHaveProperty('trainingImpact');

    expect(serialized).not.toMatch(/humidity|dewPoint|pressure|provider|windSpeed|payloadHash/i);
    expect(Object.keys(snapshot)).toEqual([
      'thermalStressLevel',
      'recoveryDemandAdjustment',
      'fatigueAdjustment',
      'performanceAdjustment',
      'trainingImpact',
      'confidence',
      'computedAt',
    ]);
  });

  it('applies EnvironmentalImpact in recovery without importing EnvironmentalStress', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 36, relativeHumidityPct: 70, windSpeedMps: 2 },
    });
    const impact = buildEnvironmentalImpact({ stress });

    const baseScore = 80;
    const adjusted = applyEnvironmentalImpactToReadiness(baseScore, impact);
    expect(adjusted).not.toBeNull();
    if (adjusted !== null) {
      expect(adjusted).toBeLessThan(baseScore);
    }
  });

  it('applies EnvironmentalImpact in fatigue model context', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 36, relativeHumidityPct: 70, windSpeedMps: 2 },
    });
    const impact = buildEnvironmentalImpact({ stress });

    const adjusted = applyEnvironmentalImpactToFatigueIndex(50, impact);
    expect(adjusted).toBeGreaterThan(50);
  });

  it('keeps physiological models free of EnvironmentalStress imports', () => {
    const modelFiles = [
      '../../packages/core/src/inference/recovery/model.ts',
      '../../packages/core/src/inference/fatigue/model.ts',
      '../../packages/core/src/inference/adaptation/model.ts',
    ];

    for (const relativePath of modelFiles) {
      const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      expect(source).not.toMatch(/EnvironmentalStress/);
      expect(source).not.toMatch(/EnvironmentalObservation/);
      expect(source).not.toMatch(/EnvironmentalContext/);
      expect(source).toMatch(/EnvironmentalImpact|applyEnvironmentalImpact/);
    }
  });

  it('runs recovery model with environmentalImpact overlay only', () => {
    const stress = buildEnvironmentalStress({
      applicability: 'OUTDOOR',
      weather: { airTemperatureC: 36, relativeHumidityPct: 70, windSpeedMps: 2 },
    });
    const impact = buildEnvironmentalImpact({ stress });

    const features = {
      trainingDayId: '2026-07-10',
      athleteId: 'default',
      recovery: 'PENDING',
      load: 'PENDING',
      condition: 'PENDING',
      fuel: 'PENDING',
      sessions: [],
    } as unknown as DayFeatures;

    const without = runRecoveryModel(features, {
      athleteId: 'default',
      trainingDayId: '2026-07-10',
      previousReadinessScore: null,
      environmentalImpact: null,
    });

    const withImpact = runRecoveryModel(features, {
      athleteId: 'default',
      trainingDayId: '2026-07-10',
      previousReadinessScore: null,
      environmentalImpact: impact,
    });

    expect(without.recoveryState.readinessScore).toEqual(withImpact.recoveryState.readinessScore);
  });
});

describe('environment-v1.1 public contract unchanged', () => {
  it('still exports frozen version and builders', async () => {
    const env = await import('@sharpit/core/environment');
    expect(env.ENVIRONMENTAL_CONTEXT_ENGINE_VERSION).toBe('environment-v1.1');
    expect(typeof env.buildEnvironmentalStress).toBe('function');
    expect(typeof env.buildEnvironmentalImpact).toBe('function');
    expect(typeof env.buildTodayEnvironment).toBe('function');
  });
});
