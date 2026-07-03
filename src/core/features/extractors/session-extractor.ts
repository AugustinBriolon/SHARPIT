/**
 * SESSION FEATURE EXTRACTOR
 *
 * Pure function: (SessionObservation, SubjectiveObservation | null, ExtractionContext)
 *               → SessionFeatureSet
 *
 * Invariants:
 *   - Zero side effects. No I/O. No randomness.
 *   - Fully deterministic: same inputs always produce the same output.
 *   - TSS is computed using the highest-confidence method available (5-tier hierarchy).
 *   - Features that require stream data (hrDriftPercent, timeInZones, paceVariabilityIndex,
 *     aerobicLoadFactor, anaerobicLoadFactor) are null in v1.
 *     These are honest PENDING values — NOT zero.
 *
 * Scientific references:
 *   - TSS: Coggan (2003); Allen & Coggan "Training and Racing with a Power Meter"
 *   - TRIMP: Banister et al. (1975), modified by Morton et al. (1990)
 *   - TRIMP normalization: Manzi et al. (2009)
 */

import type { SessionFeatureSet, TssMethod, SessionExtractorInput } from '../types';
import type { ExtractionContext } from '../context';
import { canUsePowerTss, canUseTrimpTss, canUsePaceTss } from '../context';
import type { SportType } from '@/core/observation/types';
import { TSS_METHOD_CONFIDENCE, QUALITY_CONFIDENCE } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Sport-specific constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * TSS per hour when using the Duration × Factor method (last resort).
 * Values calibrated to approximate physiological cost relative to cycling FTP baseline.
 * Scientific basis: RPE-based metabolic equivalents per sport type.
 */
const SPORT_TSS_PER_HOUR: Record<SportType, number> = {
  RUN: 60,
  BIKE: 55,
  SWIM: 65,
  STRENGTH: 35,
  OPEN_WATER: 65,
  TRAIL_RUN: 70,
  MTB: 65,
  TRIATHLON: 60,
  YOGA: 20,
  OTHER: 45,
};

/**
 * Elevation stress factor per sport type.
 * Multiplied by elevation gain (m) to produce a dimensionless stress score.
 */
const ELEVATION_STRESS_FACTOR: Record<SportType, number> = {
  RUN: 0.1,
  BIKE: 0.05,
  SWIM: 0,
  STRENGTH: 0,
  OPEN_WATER: 0,
  TRAIL_RUN: 0.12,
  MTB: 0.08,
  TRIATHLON: 0.06,
  YOGA: 0,
  OTHER: 0.06,
};

// ─────────────────────────────────────────────────────────────────────────────
// TSS computation — 5-tier hierarchy
// ─────────────────────────────────────────────────────────────────────────────

type TssResult = {
  tssScore: number;
  method: TssMethod;
  confidence: number;
};

/**
 * Tier 1 — Power-based TSS (most accurate).
 * TSS = IF² × durationHr × 100, where IF = NP / FTP.
 * Requires normalizedPower AND FTP.
 */
function computePowerTss(
  durationSec: number,
  normalizedPower: number,
  ftpW: number,
  powerQuality: 'MEASURED_DIRECT' | 'MEASURED_OPTICAL',
): TssResult {
  const durationHr = durationSec / 3600;
  const intensityFactor = normalizedPower / ftpW;
  const tssScore = intensityFactor * intensityFactor * durationHr * 100;

  const baseConfidence = TSS_METHOD_CONFIDENCE.POWER_BASED;
  const qualityConfidence = QUALITY_CONFIDENCE[powerQuality];
  const confidence = baseConfidence * qualityConfidence;

  return { tssScore, method: 'POWER_BASED', confidence };
}

/**
 * Tier 2 — TRIMP-HR (Banister method normalized to TSS scale).
 *
 * TRIMP = durationMin × HRR × 0.64 × e^(1.92 × HRR)
 * where HRR = (avgHr − restingHr) / (maxHr − restingHr)
 *
 * Normalization: 1 hour at LTHR = 100 TSS.
 * If LTHR is not provided, it is estimated as 0.85 × maxHr.
 *
 * Scientific basis: Banister et al. (1975); Manzi et al. (2009) normalization.
 * Known limitation: assumes male physiology (coefficient 1.92).
 * See TRAINING_STRESS_MODEL.md Scientific Debt SD-013.
 */
function computeTrimpTss(
  durationSec: number,
  avgBpm: number,
  maxHr: number,
  restingHr: number,
  lthr: number | undefined,
  hrQuality: 'MEASURED_DIRECT' | 'MEASURED_OPTICAL',
): TssResult {
  const durationMin = durationSec / 60;
  const hrRange = maxHr - restingHr;

  if (hrRange <= 0) {
    return durationFactorFallback('TRIMP_HR', durationSec, 'RUN');
  }

  const hrr = Math.max(0, Math.min(1, (avgBpm - restingHr) / hrRange));
  const trimp = durationMin * hrr * 0.64 * Math.exp(1.92 * hrr);

  const effectiveLthr = lthr ?? maxHr * 0.85;
  const hrrLt = Math.max(0, Math.min(1, (effectiveLthr - restingHr) / hrRange));
  const trimpPerHourAtThreshold = 60 * hrrLt * 0.64 * Math.exp(1.92 * hrrLt);

  const tssScore =
    trimpPerHourAtThreshold > 0
      ? (trimp / trimpPerHourAtThreshold) * 100
      : (durationSec / 3600) * SPORT_TSS_PER_HOUR.RUN; // final fallback

  const baseConfidence = TSS_METHOD_CONFIDENCE.TRIMP_HR;
  const qualityConfidence = QUALITY_CONFIDENCE[hrQuality];
  const confidence = baseConfidence * qualityConfidence;

  return { tssScore, method: 'TRIMP_HR', confidence };
}

/**
 * Tier 3 — Pace-based TSS (for running and open water, when threshold pace is known).
 * Uses the same IF²-based formula as power TSS, with velocity ratio as IF proxy.
 * Known limitation: does not account for elevation gain (NGP approximation).
 */
function computePaceTss(
  durationSec: number,
  avgMinPerKm: number,
  distanceM: number,
  thresholdPaceSecPerKm: number,
): TssResult {
  const durationHr = durationSec / 3600;
  const avgPaceSecPerKm = avgMinPerKm * 60;
  const intensityFactor = thresholdPaceSecPerKm / avgPaceSecPerKm; // faster pace = higher IF
  const tssScore = intensityFactor * intensityFactor * durationHr * 100;

  return {
    tssScore,
    method: 'PACE_BASED',
    confidence: TSS_METHOD_CONFIDENCE.PACE_BASED,
  };
}

/**
 * Tier 4 — RPE-based TSS.
 * Formula: TSS ≈ (rpe / 5)² × durationHr × 100
 * Very rough approximation (±50% error at boundaries).
 * RPE=5 corresponds approximately to threshold effort (100 TSS/hr).
 */
function computeRpeTss(durationSec: number, rpe: number): TssResult {
  const durationHr = durationSec / 3600;
  const rpeFactor = rpe / 5;
  const tssScore = rpeFactor * rpeFactor * durationHr * 100;

  return {
    tssScore,
    method: 'RPE_BASED',
    confidence: TSS_METHOD_CONFIDENCE.RPE_BASED,
  };
}

/**
 * Tier 5 — Duration × sport constant (last resort).
 */
function durationFactorFallback(
  reason: TssMethod,
  durationSec: number,
  sportType: SportType,
): TssResult {
  const durationHr = durationSec / 3600;
  const tssScore = durationHr * SPORT_TSS_PER_HOUR[sportType];
  return {
    tssScore,
    method: 'DURATION_FACTOR',
    confidence: TSS_METHOD_CONFIDENCE.DURATION_FACTOR,
  };
}

/**
 * Main TSS dispatcher — selects the highest-confidence method available.
 */
function selectBestTss(input: SessionExtractorInput, ctx: ExtractionContext): TssResult {
  const { session, linkedSubjective } = input;
  const { durationSec, sportType } = session;

  // Tier 1: Power-based (requires NP + FTP)
  if (
    canUsePowerTss(ctx) &&
    session.powerData?.normalizedPower != null &&
    session.powerData.normalizedPower > 0
  ) {
    return computePowerTss(
      durationSec,
      session.powerData.normalizedPower,
      ctx.ftpW!,
      session.powerData.quality,
    );
  }

  // Tier 2: TRIMP-HR (requires avgHr + maxHr + restingHr)
  if (canUseTrimpTss(ctx) && session.hrData?.avgBpm != null) {
    return computeTrimpTss(
      durationSec,
      session.hrData.avgBpm,
      ctx.maxHr!,
      ctx.restingHr!,
      ctx.lthr,
      session.hrData.quality,
    );
  }

  // Tier 3: Pace-based (run / open water only, requires threshold pace)
  if (
    canUsePaceTss(ctx) &&
    session.paceData?.avgMinPerKm != null &&
    session.paceData?.distanceM != null &&
    (sportType === 'RUN' || sportType === 'TRAIL_RUN' || sportType === 'OPEN_WATER')
  ) {
    return computePaceTss(
      durationSec,
      session.paceData.avgMinPerKm,
      session.paceData.distanceM,
      ctx.runThresholdPaceSecPerKm!,
    );
  }

  // Tier 4: RPE-based (requires linked subjective observation with RPE)
  if (linkedSubjective?.rpe != null) {
    return computeRpeTss(durationSec, linkedSubjective.rpe);
  }

  // Tier 5: Duration × sport factor (always succeeds)
  return durationFactorFallback('DURATION_FACTOR', durationSec, sportType);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mechanical metrics
// ─────────────────────────────────────────────────────────────────────────────

function computeMechanicalLoad(durationSec: number, avgWatts: number | undefined): number | null {
  if (avgWatts == null || avgWatts <= 0) return null;
  return (avgWatts * durationSec) / 1000; // kJ
}

function computeElevationStressScore(
  elevationM: number | undefined,
  sportType: SportType,
): number | null {
  if (elevationM == null || elevationM <= 0) return null;
  const factor = ELEVATION_STRESS_FACTOR[sportType];
  if (factor === 0) return null; // sport has no elevation cost (SWIM, YOGA, STRENGTH)
  return elevationM * factor;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intensity factor
// ─────────────────────────────────────────────────────────────────────────────

function computeIntensityFactor(
  input: SessionExtractorInput,
  ctx: ExtractionContext,
): number | null {
  const { session } = input;

  // Power IF (preferred)
  if (ctx.ftpW && ctx.ftpW > 0 && session.powerData?.normalizedPower) {
    return session.powerData.normalizedPower / ctx.ftpW;
  }
  // Pre-computed by source
  if (session.powerData?.intensityFactor != null) {
    return session.powerData.intensityFactor;
  }
  // Pace IF for running
  if (
    ctx.runThresholdPaceSecPerKm &&
    session.paceData?.avgMinPerKm &&
    (session.sportType === 'RUN' || session.sportType === 'TRAIL_RUN')
  ) {
    const avgPaceSecPerKm = session.paceData.avgMinPerKm * 60;
    return ctx.runThresholdPaceSecPerKm / avgPaceSecPerKm;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Efficiency factor
// ─────────────────────────────────────────────────────────────────────────────

function computeEfficiencyFactor(input: SessionExtractorInput): number | null {
  const { session } = input;
  const avgHr = session.hrData?.avgBpm;
  if (!avgHr || avgHr <= 0) return null;

  // Power EF (NP ÷ avgHR)
  if (session.powerData?.normalizedPower) {
    return session.powerData.normalizedPower / avgHr;
  }

  // Pace EF (m/s ÷ avgHR)
  if (session.paceData?.avgMinPerKm) {
    const speedMps = 1000 / (session.paceData.avgMinPerKm * 60);
    return speedMps / avgHr;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main extractor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract all Session Features from a session observation and its optional linked subjective.
 *
 * Pure function — no side effects, no async, fully deterministic.
 */
export function extractSessionFeatures(
  input: SessionExtractorInput,
  ctx: ExtractionContext,
): SessionFeatureSet {
  const { session, linkedSubjective } = input;

  const tssResult = selectBestTss(input, ctx);
  const intensityFactor = computeIntensityFactor(input, ctx);
  const mechanicalLoad = computeMechanicalLoad(session.durationSec, session.powerData?.avgWatts);
  const elevationStressScore = computeElevationStressScore(session.elevationM, session.sportType);
  const efficiencyFactor = computeEfficiencyFactor(input);

  const sourceObsIds: string[] = [session.id];
  if (linkedSubjective) sourceObsIds.push(linkedSubjective.id);

  return {
    sessionObsId: session.id,
    trainingDayId: session.trainingDayId,
    sportType: session.sportType,
    durationSec: session.durationSec,

    tssScore: tssResult.tssScore,
    tssMethod: tssResult.method,

    intensityFactor,
    aerobicLoadFactor: null, // requires stream data — v2 enhancement
    anaerobicLoadFactor: null, // requires stream data — v2 enhancement
    timeInZones: null, // requires stream data — v2 enhancement
    hrDriftPercent: null, // requires stream data — v2 enhancement
    paceVariabilityIndex: null, // requires stream data — v2 enhancement

    mechanicalLoad,
    elevationStressScore,
    efficiencyFactor,

    subjectiveRpe: linkedSubjective?.rpe ?? null,
    sourceProvidedTss: session.sourceProvidedStress?.value ?? null,

    confidence: tssResult.confidence,
    algorithmId: 'session-features-v1',
    sourceObsIds,
  } satisfies SessionFeatureSet;
}
