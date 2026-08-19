import { BodyCompositionSource, type BodyCompositionMeasurement } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { bodyCompositionMeasurementToObservation } from './body-composition-measurement-adapter';

function row(overrides: Partial<BodyCompositionMeasurement> = {}): BodyCompositionMeasurement {
  return {
    id: 'row-1',
    source: BodyCompositionSource.WITHINGS,
    externalId: 'grp-123',
    measuredAt: new Date('2026-08-11T07:30:00Z'),
    weightKg: 72.4,
    bmi: 22.1,
    bodyFatPct: 14.2,
    waterPct: 58.5,
    musclePct: 41.3,
    boneKg: 3.1,
    bmr: 1680,
    visceralFat: 4,
    proteinPct: null,
    bodyAge: 32,
    subcutaneousFatPct: null,
    skeletalMusclePct: null,
    fatFreeWeightKg: 62.1,
    heartRate: 58,
    vascularAgeYears: null,
    pulseWaveVelocity: null,
    vo2Max: null,
    nerveHealthScore: null,
    nerveHealthLeft: null,
    nerveHealthRight: null,
    nerveResponseScore: null,
    skinConductance: null,
    metabolicAge: null,
    hydrationKg: null,
    fatMassKg: null,
    extracellularWaterKg: null,
    intracellularWaterKg: null,
    withingsExtras: null,
    createdAt: new Date('2026-08-11T07:31:00Z'),
    updatedAt: new Date('2026-08-11T07:31:00Z'),
    ...overrides,
  };
}

describe('bodyCompositionMeasurementToObservation', () => {
  it('maps a Withings row to a raw body composition observation', () => {
    const receivedAt = new Date('2026-08-11T08:00:00Z');
    const result = bodyCompositionMeasurementToObservation(row(), receivedAt);

    expect(result).toEqual({
      type: 'BODY_COMPOSITION',
      source: 'WITHINGS',
      timestamp: new Date('2026-08-11T07:30:00Z'),
      receivedAt,
      externalId: 'grp-123',
      weightKg: 72.4,
      fatPercent: 14.2,
      musclePercent: 41.3,
      waterPercent: 58.5,
      boneMassKg: 3.1,
      visceralFat: 4,
      bmi: 22.1,
    });
  });

  it('maps Renpho source correctly', () => {
    const result = bodyCompositionMeasurementToObservation(
      row({ source: BodyCompositionSource.RENPHO, externalId: 'renpho-99' }),
    );

    expect(result?.source).toBe('RENPHO');
    expect(result?.externalId).toBe('renpho-99');
  });

  it('returns null when weight is missing or non-positive', () => {
    expect(bodyCompositionMeasurementToObservation(row({ weightKg: null }))).toBeNull();
    expect(bodyCompositionMeasurementToObservation(row({ weightKg: 0 }))).toBeNull();
  });
});
