import { BodyCompositionSource, type BodyCompositionMeasurement } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { dedupeBodyCompositionByDay } from '@/lib/body-composition';

function row(source: BodyCompositionSource, day: string, hour: number): BodyCompositionMeasurement {
  return {
    id: `${source}-${day}-${hour}`,
    source,
    externalId: `${source}-${day}`,
    measuredAt: new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`),
    weightKg: source === BodyCompositionSource.WITHINGS ? 75 : 74,
    bmi: null,
    bodyFatPct: null,
    waterPct: null,
    musclePct: null,
    boneKg: null,
    bmr: null,
    visceralFat: null,
    proteinPct: null,
    bodyAge: null,
    subcutaneousFatPct: null,
    skeletalMusclePct: null,
    fatFreeWeightKg: null,
    heartRate: null,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('dedupeBodyCompositionByDay', () => {
  it('prefers Withings over Renpho on the same day', () => {
    const result = dedupeBodyCompositionByDay([
      row(BodyCompositionSource.RENPHO, '2026-07-01', 8),
      row(BodyCompositionSource.WITHINGS, '2026-07-01', 9),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe(BodyCompositionSource.WITHINGS);
    expect(result[0]?.weightKg).toBe(75);
  });

  it('keeps Renpho when Withings is absent', () => {
    const result = dedupeBodyCompositionByDay([row(BodyCompositionSource.RENPHO, '2026-06-01', 8)]);
    expect(result[0]?.source).toBe(BodyCompositionSource.RENPHO);
  });
});
