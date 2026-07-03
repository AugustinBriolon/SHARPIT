/**
 * ADAPTER — Withings Measurement → RawBodyCompositionObservation
 */

import type { WithingsParsedMeasurement } from '@/lib/integrations/withings';
import type { RawBodyCompositionObservation } from '@/core/observation/types';

export function withingsMeasurementToBodyComposition(
  measurement: WithingsParsedMeasurement,
  receivedAt: Date,
): RawBodyCompositionObservation | null {
  if (measurement.weightKg == null || measurement.weightKg <= 0) return null;

  const musclePercent =
    measurement.muscleKg != null && measurement.weightKg > 0
      ? (measurement.muscleKg / measurement.weightKg) * 100
      : undefined;

  return {
    type: 'BODY_COMPOSITION',
    source: 'WITHINGS',
    timestamp: measurement.measuredAt,
    receivedAt,
    externalId: measurement.grpid,
    weightKg: measurement.weightKg,
    fatPercent: measurement.bodyFatPct ?? undefined,
    musclePercent,
    boneMassKg: measurement.boneKg ?? undefined,
    bmi: undefined,
  };
}
