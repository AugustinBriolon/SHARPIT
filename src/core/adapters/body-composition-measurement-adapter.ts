/**
 * ADAPTER — BodyCompositionMeasurement (Prisma) → RawBodyCompositionObservation
 *
 * Pure functions. No I/O. No side effects.
 * Used when backfilling observations from stored provider measurements.
 */

import { BodyCompositionSource, type BodyCompositionMeasurement } from '@prisma/client';

import type { RawBodyCompositionObservation } from '@/core/observation/types';

function sourceToObservationSource(
  source: BodyCompositionSource,
): RawBodyCompositionObservation['source'] {
  return source === BodyCompositionSource.WITHINGS ? 'WITHINGS' : 'RENPHO';
}

/**
 * Converts a stored BodyCompositionMeasurement row to a raw observation.
 * Returns null when weight is missing or non-positive (required for ingest).
 */
export function bodyCompositionMeasurementToObservation(
  row: BodyCompositionMeasurement,
  receivedAt: Date = row.updatedAt,
): RawBodyCompositionObservation | null {
  if (row.weightKg == null || row.weightKg <= 0) return null;

  return {
    type: 'BODY_COMPOSITION',
    source: sourceToObservationSource(row.source),
    timestamp: row.measuredAt,
    receivedAt,
    externalId: row.externalId,
    weightKg: row.weightKg,
    fatPercent: row.bodyFatPct ?? undefined,
    musclePercent: row.musclePct ?? undefined,
    waterPercent: row.waterPct ?? undefined,
    boneMassKg: row.boneKg ?? undefined,
    visceralFat: row.visceralFat ?? undefined,
    bmi: row.bmi ?? undefined,
  };
}
