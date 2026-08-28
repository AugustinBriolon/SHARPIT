/**
 * ADAPTER — Withings Measurement → RawBodyCompositionObservation
 */

import type { WithingsParsedMeasurement } from '@/lib/integrations/withings/withings';
import type { RawBodyCompositionObservation } from '@/core/observation/types';

function computeMusclePercent(muscleKg: number | null, weightKg: number): number | undefined {
  if ((muscleKg === undefined || muscleKg === null) || weightKg <= 0) {
    return undefined;
  }
  return (muscleKg / weightKg) * 100;
}

export function withingsMeasurementToBodyComposition(
  measurement: WithingsParsedMeasurement,
  receivedAt: Date,
): RawBodyCompositionObservation | null {
  if ((measurement.weightKg === undefined || measurement.weightKg === null) || measurement.weightKg <= 0) {
    return null;
  }

  const musclePercent = computeMusclePercent(measurement.muscleKg, measurement.weightKg);

  return {
    type: 'BODY_COMPOSITION',
    source: 'WITHINGS',
    timestamp: measurement.measuredAt,
    receivedAt,
    externalId: measurement.grpid,
    weightKg: measurement.weightKg,
    fatPercent: measurement.bodyFatPct ?? undefined,
    musclePercent,
    waterPercent: measurement.waterPct ?? undefined,
    boneMassKg: measurement.boneKg ?? undefined,
    visceralFat: measurement.visceralFat ?? undefined,
    bmi: undefined,
  };
}
