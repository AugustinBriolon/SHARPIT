/**
 * BODY COMPOSITION FEATURE EXTRACTOR
 *
 * Pure function: (BodyCompositionObservation, BodyHistory) → BodyFeatureSet
 *
 * Invariants:
 *   - Zero side effects. No I/O. No randomness.
 *   - Bioimpedance measurements are accepted at face value (no calibration).
 *   - Trends require ≥ 3 data points — null when insufficient history.
 *
 * Known limitation: bioimpedance accuracy is affected by hydration status,
 * meal timing, and electrode placement. SHARPIT uses raw reported values
 * without correction. See FEATURE_EXTRACTION.md §Body Composition Features.
 */

import type { BodyFeatureSet, BodyHistory } from '../types';
import type { BodyCompositionObservation } from '@/core/observation/types';
import { QUALITY_CONFIDENCE } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Statistical helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Linear regression slope (dy/dx) over a time series.
 * Returns null when fewer than 3 points are available.
 */
function regressionSlope(pairs: Array<[number, number]>): number | null {
  const n = pairs.length;
  if (n < 3) return null;
  const sumX = pairs.reduce((a, [x]) => a + x, 0);
  const sumY = pairs.reduce((a, [, y]) => a + y, 0);
  const sumXY = pairs.reduce((a, [x, y]) => a + x * y, 0);
  const sumX2 = pairs.reduce((a, [x]) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trend computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute slope of a measurement over time (in days).
 * Pairs are (days since earliest measurement, value).
 */
function computeTrend(
  measurements: BodyHistory['measurements7d'],
  getValue: (m: BodyHistory['measurements7d'][number]) => number | null,
): number | null {
  const valid = measurements
    .filter((m) => getValue(m) != null)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (valid.length < 3) return null;

  const t0 = valid[0].timestamp.getTime();
  const pairs: Array<[number, number]> = valid.map((m) => [
    (m.timestamp.getTime() - t0) / 86_400_000, // days
    getValue(m)!,
  ]);

  return regressionSlope(pairs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extractor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract Body Composition Features from a body composition observation.
 *
 * Pure function — no side effects, no async, fully deterministic.
 */
export function extractBodyFeatures(
  obs: BodyCompositionObservation,
  history: BodyHistory,
): BodyFeatureSet {
  const fatMassKg = obs.fatPercent != null ? (obs.weightKg * obs.fatPercent) / 100 : null;

  const leanMassKg = obs.fatPercent != null ? obs.weightKg * (1 - obs.fatPercent / 100) : null;

  // Include current observation in history for trend computation
  const allMeasurements = [
    ...history.measurements7d,
    { weightKg: obs.weightKg, fatPercent: obs.fatPercent ?? null, timestamp: obs.timestamp },
  ].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const weightTrend7d = computeTrend(allMeasurements, (m) => m.weightKg);
  const fatPercentTrend7d = computeTrend(allMeasurements, (m) => m.fatPercent);

  // Confidence: body composition from optical/scale sensor is MEASURED_OPTICAL equivalent
  // Bioimpedance accuracy is lower than direct measurement — cap at 0.75
  const confidence = Math.min(
    QUALITY_CONFIDENCE[obs.quality] ?? QUALITY_CONFIDENCE.MEASURED_OPTICAL,
    0.75,
  );

  return {
    trainingDayId: obs.trainingDayId,
    observationId: obs.id,

    weightKg: obs.weightKg,
    fatPercent: obs.fatPercent ?? null,
    fatMassKg,
    leanMassKg,
    musclePercent: obs.musclePercent ?? null,
    waterPercent: obs.waterPercent ?? null,
    visceralFat: obs.visceralFat ?? null,

    weightTrend7d,
    fatPercentTrend7d,

    confidence,
    algorithmId: 'body-features-v1',
    sourceObsIds: [obs.id],
  } satisfies BodyFeatureSet;
}
