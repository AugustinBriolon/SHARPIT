/**
 * ADAPTER — Renpho Measurement → RawBodyCompositionObservation
 *
 * Pure functions. No I/O. No side effects.
 *
 * Renpho bio-impedance scales provide body composition measurements.
 * Weight is in kg. Most other fields are percentages (fat%, muscle%, water%).
 * Exception: bone mass is in kg.
 */

import type { RenphoMeasurement } from '@/lib/integrations/renpho';

import type { RawBodyCompositionObservation } from '@/core/observation/types';

/**
 * Converts a Renpho measurement to a RawBodyCompositionObservation.
 * Returns null if no weight is present (weight is required).
 */
export function renphoMeasurementToBodyComposition(
  measurement: RenphoMeasurement,
  receivedAt: Date,
): RawBodyCompositionObservation | null {
  if (measurement.weight == null || measurement.weight <= 0) return null;

  const timestamp = new Date(measurement.time_stamp * 1000);

  return {
    type: 'BODY_COMPOSITION',
    source: 'RENPHO',
    timestamp,
    receivedAt,
    externalId: measurement.id,
    weightKg: measurement.weight,
    fatPercent: measurement.bodyfat ?? undefined,
    musclePercent: measurement.muscle ?? undefined,
    waterPercent: measurement.water ?? undefined,
    boneMassKg: measurement.bone ?? undefined,
    visceralFat: measurement.visceral_fat ?? undefined,
    bmi: measurement.bmi ?? undefined,
  };
}
