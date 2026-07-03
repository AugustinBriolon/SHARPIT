/**
 * PHYSICAL CONDITION FEATURE EXTRACTOR
 *
 * Pure function: (ConditionHistory) → ConditionFeatureSet
 *
 * Aggregates all active PhysicalConditionObservations for a training day
 * into a set of objective Features.
 *
 * Invariants:
 *   - Zero side effects. No I/O. No randomness.
 *   - Trend computation requires ≥ 3 severity check-ins — null otherwise.
 *   - The IMPROVING/STABLE/WORSENING classification uses a slope threshold of ±0.3.
 */

import type { ConditionFeatureSet, ConditionHistory, ConditionTrend } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Trend classification
// ─────────────────────────────────────────────────────────────────────────────

/** Slope threshold (severity points per day) for classifying trend direction. */
const TREND_SLOPE_THRESHOLD = 0.3;

/**
 * Linear regression slope (dy/dx) over (timestamp, severity) pairs.
 * Returns null when fewer than 3 points are available.
 */
function severityRegressionSlope(history: ConditionHistory['severityHistory14d']): number | null {
  const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  if (sorted.length < 3) return null;

  const n = sorted.length;
  const t0 = sorted[0].timestamp.getTime();
  const pairs = sorted.map((h) => ({
    x: (h.timestamp.getTime() - t0) / 86_400_000, // days
    y: h.severity,
  }));

  const sumX = pairs.reduce((a, p) => a + p.x, 0);
  const sumY = pairs.reduce((a, p) => a + p.y, 0);
  const sumXY = pairs.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = pairs.reduce((a, p) => a + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;

  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

function classifyTrend(slope: number | null): ConditionTrend | null {
  if (slope == null) return null;
  if (slope < -TREND_SLOPE_THRESHOLD) return 'IMPROVING'; // severity decreasing
  if (slope > TREND_SLOPE_THRESHOLD) return 'WORSENING'; // severity increasing
  return 'STABLE';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extractor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract Physical Condition Features for a given training day.
 *
 * Pure function — no side effects, no async, fully deterministic.
 */
export function extractConditionFeatures(
  trainingDayId: string,
  conditionHistory: ConditionHistory,
): ConditionFeatureSet {
  const { activeConditions, severityHistory14d } = conditionHistory;

  const activeConditionCount = activeConditions.length;

  const maxActiveSeverity =
    activeConditions.length > 0 ? Math.max(...activeConditions.map((c) => c.severity)) : 0;

  const trainingBlockedByCondition = activeConditions.some(
    (c) => c.affectsTraining === true && c.severity >= 5,
  );

  const slope = severityRegressionSlope(severityHistory14d);
  const conditionTrend = classifyTrend(slope);

  // Confidence: physical conditions are MANUAL observations
  // Low active severity → higher confidence (less ambiguity)
  let confidence = 0.85;
  if (activeConditionCount === 0) {
    confidence = 0.95;
  } else if (maxActiveSeverity >= 7) {
    confidence = 0.75;
  }

  return {
    trainingDayId,

    activeConditionCount,
    maxActiveSeverity,
    trainingBlockedByCondition,
    conditionTrend,

    confidence,
    algorithmId: 'condition-features-v1',
    sourceObsIds: activeConditions.map((c) => c.id),
  } satisfies ConditionFeatureSet;
}
