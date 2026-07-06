/**
 * RECOVERY FEATURE EXTRACTOR
 *
 * Pure function: (HrvObservation|null, RestingHrObservation|null,
 *                SleepObservation|null, SubjectiveObservation|null,
 *                RecoveryHistory, ExtractionContext)
 *               → RecoveryFeatureSet
 *
 * Invariants:
 *   - Zero side effects. No I/O. No randomness.
 *   - Missing observations result in null features — never default values.
 *   - HRV baseline requires ≥ 7 data points in 14-day window (PENDING otherwise).
 *   - All confidence values are capped by the weakest input observation quality.
 *
 * Scientific references:
 *   - HRV baseline: Plews et al. (2013) Int J Sports Physiol Perform;
 *     Buchheit (2014) Front Physiol — 14-day rolling average
 *   - Sleep debt: Walker (2017) "Why We Sleep"; Belenky et al. (2003) J Sleep Res
 *   - Wellness index: Hooper et al. (1995); Saw et al. (2016) Sports Med
 *   - Sleep efficiency: Rechtschaffen & Kales (1968); AASM criteria
 */

import type {
  HrvObservation,
  RestingHrObservation,
  SleepObservation,
  SubjectiveObservation,
} from '@/core/observation/types';
import type { ExtractionContext } from '../context';
import { effectiveSleepTarget } from '../context';
import type { RecoveryFeatureSet, RecoveryHistory, SubjectiveWellnessComponents } from '../types';
import { QUALITY_CONFIDENCE } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Statistical helpers
// ─────────────────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Linear regression slope (dy/dx) over index-value pairs.
 * Returns null when fewer than 3 points are available.
 */
function regressionSlope(values: number[]): number | null {
  if (values.length < 3) return null;
  const n = values.length;
  const pairs: Array<[number, number]> = values.map((v, i) => [i, v]);
  const sumX = pairs.reduce((a, [x]) => a + x, 0);
  const sumY = pairs.reduce((a, [, y]) => a + y, 0);
  const sumXY = pairs.reduce((a, [x, y]) => a + x * y, 0);
  const sumX2 = pairs.reduce((a, [x]) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sleep features
// ─────────────────────────────────────────────────────────────────────────────

function computeSleepEfficiency(sleep: SleepObservation | null): number | null {
  if (!sleep) return null;
  const { deepMin, remMin, totalMinutes } = sleep;
  if (!deepMin || !remMin || totalMinutes <= 0) return null;
  return ((deepMin + remMin) / totalMinutes) * 100;
}

function computeSleepDebt(
  sleep14d: RecoveryHistory['sleep14d'],
  ctx: ExtractionContext,
): number | null {
  const last7d = sleep14d.slice(0, 7);
  if (last7d.length === 0) return null;
  const target = effectiveSleepTarget(ctx);
  const totalActual = last7d.reduce((acc, s) => acc + s.totalMinutes, 0);
  return target * last7d.length - totalActual;
}

function computeSleepOnsetConsistency(sleep14d: RecoveryHistory['sleep14d']): number | null {
  const bedtimes = sleep14d
    .filter((s) => s.bedtimeMinFromMidnight != null)
    .map((s) => s.bedtimeMinFromMidnight!);

  if (bedtimes.length < 4) return null;
  return stdDev(bedtimes);
}

function computeSleepDurationTrend(sleep14d: RecoveryHistory['sleep14d']): number | null {
  const last7d = sleep14d.slice(0, 7).map((s) => s.totalMinutes);
  return regressionSlope(last7d.reverse()); // oldest first for correct slope
}

// ─────────────────────────────────────────────────────────────────────────────
// HRV features
// ─────────────────────────────────────────────────────────────────────────────

const HRV_BASELINE_MIN_POINTS = 7;

function computeHrvDelta(
  hrv: HrvObservation | null,
  hrv14d: RecoveryHistory['hrv14d'],
): number | null {
  if (!hrv) return null;

  // Primary: SHARPIT 14-day rolling personal baseline (≥ 7 prior nights)
  const prior = hrv14d.filter((h) => h.timestamp.getTime() !== hrv.timestamp.getTime());
  if (prior.length >= HRV_BASELINE_MIN_POINTS) {
    const baseline = mean(prior.map((h) => h.valueMsRmssd));
    if (baseline > 0) {
      return ((hrv.valueMsRmssd - baseline) / baseline) * 100;
    }
  }

  // Fallback: Garmin personal baseline band (midpoint of balanced zone)
  const { garminBaselineLow, garminBaselineHigh } = hrv;
  if (
    garminBaselineLow != null &&
    garminBaselineHigh != null &&
    garminBaselineLow > 0 &&
    garminBaselineHigh > 0
  ) {
    const garminBaseline = (garminBaselineLow + garminBaselineHigh) / 2;
    return ((hrv.valueMsRmssd - garminBaseline) / garminBaseline) * 100;
  }

  return null;
}

function computeHrvCv(hrv14d: RecoveryHistory['hrv14d']): number | null {
  const last7d = hrv14d.slice(0, 7).map((h) => h.valueMsRmssd);
  if (last7d.length < 3) return null;
  const avg = mean(last7d);
  if (avg <= 0) return null;
  return (stdDev(last7d) / avg) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Resting HR features
// ─────────────────────────────────────────────────────────────────────────────

const RHR_BASELINE_MIN_POINTS = 7;

function computeRhrDelta(
  rhr: RestingHrObservation | null,
  rhr14d: RecoveryHistory['rhr14d'],
): number | null {
  if (!rhr) return null;
  const prior = rhr14d.filter((h) => h.timestamp.getTime() !== rhr.timestamp.getTime());
  if (prior.length < RHR_BASELINE_MIN_POINTS) return null;

  const baseline = mean(prior.map((h) => h.valueBpm));
  return rhr.valueBpm - baseline;
}

// ─────────────────────────────────────────────────────────────────────────────
// Subjective wellness
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composite Subjective Wellness Index (0–10).
 *
 * Components (when available):
 *   mood (1–5): multiply by 2 to normalize to 0–10 scale
 *   energyLevel (1–5): multiply by 2 to normalize
 *   perceivedSoreness (0–10): inverted (10 - soreness) because higher soreness = worse
 *
 * Weights: mood 0.35, energy 0.35, soreness_inv 0.30
 *
 * When only some components are available, the index is computed from available
 * components with re-normalized weights. Returns null when NO component is available.
 *
 * Scientific basis: Hooper Quality of Life scale adapted (Hooper et al. 1995);
 * Saw et al. (2016) meta-analysis on subjective wellness monitoring.
 */
function computeWellnessIndex(subjective: SubjectiveObservation | null): {
  index: number | null;
  components: SubjectiveWellnessComponents | null;
} {
  if (!subjective) return { index: null, components: null };

  const { mood, energyLevel, perceivedSoreness } = subjective;

  const components: SubjectiveWellnessComponents = {
    mood: mood ?? null,
    energyLevel: energyLevel ?? null,
    perceivedSoreness: perceivedSoreness ?? null,
  };

  // Build weighted contributions from available components
  type WeightedDimension = { value: number; weight: number };
  const dims: WeightedDimension[] = [];

  if (mood != null) {
    dims.push({ value: Math.min(10, mood * 2), weight: 0.35 });
  }
  if (energyLevel != null) {
    dims.push({ value: Math.min(10, energyLevel * 2), weight: 0.35 });
  }
  if (perceivedSoreness != null) {
    dims.push({ value: Math.max(0, 10 - perceivedSoreness), weight: 0.3 });
  }

  if (dims.length === 0) return { index: null, components };

  // Re-normalize weights to sum to 1
  const totalWeight = dims.reduce((acc, d) => acc + d.weight, 0);
  const index = dims.reduce((acc, d) => acc + (d.value * d.weight) / totalWeight, 0);

  return { index, components };
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence computation
// ─────────────────────────────────────────────────────────────────────────────

function computeConfidence(
  hrv: HrvObservation | null,
  rhr: RestingHrObservation | null,
  sleep: SleepObservation | null,
  subjective: SubjectiveObservation | null,
  hrv14dCount: number,
  _rhr14dCount: number,
): number {
  const confidences: number[] = [];

  if (hrv) {
    confidences.push(QUALITY_CONFIDENCE[hrv.quality]);
    if (hrv14dCount < HRV_BASELINE_MIN_POINTS) {
      // No baseline established — HRV delta not available
      confidences.push(0.5);
    }
  }
  if (rhr) {
    confidences.push(QUALITY_CONFIDENCE[rhr.quality]);
  }
  if (sleep) {
    confidences.push(QUALITY_CONFIDENCE[sleep.quality]);
  }
  if (subjective) {
    confidences.push(QUALITY_CONFIDENCE[subjective.quality]);
  }

  if (confidences.length === 0) return 0.1; // no data at all

  // Final confidence = average of available dimensions (not min)
  // because partial data is still valuable
  const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  // Sparse data penalty: fewer than 2 observation types
  const observationCount = [hrv, rhr, sleep, subjective].filter(Boolean).length;
  if (observationCount < 2) return avg * 0.7;

  return avg;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extractor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract all Recovery Features for a given training day.
 *
 * Pure function — no side effects, no async, fully deterministic.
 *
 * All four observation inputs may be null when the athlete has not yet synced
 * a device or entered a check-in. Null inputs produce null feature values —
 * the FeatureEngine marks the resulting record with appropriate PENDING fields.
 */
export function extractRecoveryFeatures(
  hrv: HrvObservation | null,
  rhr: RestingHrObservation | null,
  sleep: SleepObservation | null,
  subjective: SubjectiveObservation | null,
  history: RecoveryHistory,
  ctx: ExtractionContext,
): RecoveryFeatureSet {
  const sleepEfficiencyPercent = computeSleepEfficiency(sleep);
  const sleepDebtMin = computeSleepDebt(history.sleep14d, ctx);
  const sleepOnsetConsistencyMin = computeSleepOnsetConsistency(history.sleep14d);
  const sleepDurationTrend = computeSleepDurationTrend(history.sleep14d);

  const hrvAbsolute = hrv?.valueMsRmssd ?? null;
  const hrvDeltaFromBaseline = computeHrvDelta(hrv, history.hrv14d);
  const hrvCoefficientOfVariation = computeHrvCv(history.hrv14d);

  const rhrAbsolute = rhr?.valueBpm ?? null;
  const rhrDeltaFromBaseline = computeRhrDelta(rhr, history.rhr14d);

  const { index: subjectiveWellnessIndex, components: subjectiveWellnessComponents } =
    computeWellnessIndex(subjective);

  const confidence = computeConfidence(
    hrv,
    rhr,
    sleep,
    subjective,
    history.hrv14d.length,
    history.rhr14d.length,
  );

  const sourceObsIds: string[] = [];
  if (hrv) sourceObsIds.push(hrv.id);
  if (rhr) sourceObsIds.push(rhr.id);
  if (sleep) sourceObsIds.push(sleep.id);
  if (subjective) sourceObsIds.push(subjective.id);

  return {
    trainingDayId: ctx.trainingDayId,

    sleepEfficiencyPercent,
    sleepDebtMin,
    sleepOnsetConsistencyMin,
    sleepDurationTrend,

    hrvAbsolute,
    hrvDeltaFromBaseline,
    hrvCoefficientOfVariation,

    rhrAbsolute,
    rhrDeltaFromBaseline,

    subjectiveWellnessIndex,
    subjectiveWellnessComponents,
    rpeVsTargetZone: null, // populated by FeatureEngine in second pass (requires session features)

    confidence,
    algorithmId: 'recovery-features-v1',
    sourceObsIds,
  } satisfies RecoveryFeatureSet;
}

// ─────────────────────────────────────────────────────────────────────────────
// RPE vs target zone (second-pass enhancement)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute rpeVsTargetZone after session features are available.
 *
 * This is called by the FeatureEngine in a second pass after session features
 * have been extracted for the day. See INFERENCE_ARCHITECTURE_REVIEW.md §4.4.
 *
 * v1 simplification: expected RPE is derived from the session's sportType
 * (not from a Training Stress Model session classification, which requires
 * a full inference pass).
 *
 * Returns null when no session had an RPE recorded.
 */
export function computeRpeVsTargetZone(
  sessionRpe: number | null,
  sessionSportType: import('@/core/observation/types').SportType | null,
): number | null {
  if (sessionRpe == null || sessionSportType == null) return null;

  const EXPECTED_RPE: Record<import('@/core/observation/types').SportType, number> = {
    RUN: 5.5,
    BIKE: 5.0,
    SWIM: 5.5,
    STRENGTH: 6.0,
    OPEN_WATER: 6.0,
    TRAIL_RUN: 6.5,
    MTB: 6.0,
    TRIATHLON: 6.0,
    YOGA: 2.0,
    OTHER: 5.0,
  };

  return sessionRpe - EXPECTED_RPE[sessionSportType];
}
