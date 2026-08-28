/**
 * ADAPTER — BodyCompositionMeasurement (Prisma) → RawBodyCompositionObservation
 *
 * Pure functions. No I/O. No side effects.
 * Used when backfilling observations from stored provider measurements.
 */

import type { BodyCompositionMeasurement } from '@prisma/client';

import type { RawBodyCompositionObservation } from '@/core/observation/types';

function sourceToObservationSource(
  source: BodyCompositionMeasurement['source'],
): RawBodyCompositionObservation['source'] {
  return source === 'WITHINGS' ? 'WITHINGS' : 'RENPHO';
}

/** Drop optional BIA fields outside plausible range so weight can still ingest. */
function optionalPercent(
  value: number | null | undefined,
  min: number,
  max: number,
): number | undefined {
  if ((value === undefined || value === null) || value < min || value > max) {
    return undefined;
  }
  return value;
}

/**
 * Converts a stored BodyCompositionMeasurement row to a raw observation.
 * Returns null when weight is missing or non-positive (required for ingest).
 */
export function bodyCompositionMeasurementToObservation(
  row: BodyCompositionMeasurement,
  receivedAt: Date = row.updatedAt,
): RawBodyCompositionObservation | null {
  if ((row.weightKg === undefined || row.weightKg === null) || row.weightKg <= 0) {
    return null;
  }

  return {
    type: 'BODY_COMPOSITION',
    source: sourceToObservationSource(row.source),
    timestamp: row.measuredAt,
    receivedAt,
    externalId: row.externalId,
    weightKg: row.weightKg,
    fatPercent: optionalPercent(row.bodyFatPct, 1, 60),
    musclePercent: optionalPercent(row.musclePct, 1, 70),
    waterPercent: optionalPercent(row.waterPct, 20, 80),
    boneMassKg: row.boneKg ?? undefined,
    visceralFat: row.visceralFat ?? undefined,
    bmi: row.bmi ?? undefined,
  };
}
