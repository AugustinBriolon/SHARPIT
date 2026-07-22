/**
 * FEATURE ENGINE — Extraction Context
 *
 * ExtractionContext carries everything the Feature extractors need that is NOT
 * derivable from the Observation itself. Primarily: athlete-specific constants
 * (FTP, HR thresholds) that personalize the extraction algorithms.
 *
 * The FeatureEngine assembles this context from the AthleteProfile / Digital Twin
 * before calling any extractor. The extractors themselves have no import
 * dependency on the Digital Twin — this is the FeatureEngine's concern.
 *
 * Invariants:
 *   - All fields are optional because an athlete may not have completed onboarding.
 *   - Extractors must gracefully degrade when context is incomplete:
 *     use a lower-tier TSS method rather than returning null.
 *   - Context is ephemeral — it is assembled at extraction time, not persisted.
 */

export type ExtractionContext = {
  readonly athleteId: string;
  /** YYYY-MM-DD — the training day being extracted. */
  readonly trainingDayId: string;
  /** IANA timezone string (e.g. 'Europe/Paris'). Defaults to 'UTC'. */
  readonly timezone: string;

  // ── Athlete capabilities (from AthleteProfile / Digital Twin) ──────────────

  /** Functional Threshold Power in watts. Required for power-based TSS. */
  readonly ftpW?: number;

  /** Maximum heart rate in bpm. Required for TRIMP-based TSS and HR zone computation. */
  readonly maxHr?: number;

  /** Resting heart rate in bpm. Required for TRIMP computation (HRR denominator). */
  readonly restingHr?: number;

  /**
   * Lactate Threshold Heart Rate in bpm.
   * Used as the TRIMP normalization reference (1hr at LTHR = 100 TSS).
   * If absent, estimated as 0.85 × maxHr (conservative approximation).
   */
  readonly lthr?: number;

  /**
   * Running threshold pace in seconds per kilometre.
   * Used for pace-based TSS (CSS / Critical Speed approach).
   */
  readonly runThresholdPaceSecPerKm?: number;

  /**
   * Target sleep duration in minutes (from athlete preferences).
   * Used to compute sleep debt. Default: 480 (8 hours) if absent.
   */
  readonly sleepTargetMinutes?: number;
};

import { SLEEP_TARGET_MIN } from '@/lib/sleep/sleep-scoring';

/** Effective sleep target — defaults to 7h30 if athlete has not set one. */
export function effectiveSleepTarget(ctx: ExtractionContext): number {
  return ctx.sleepTargetMinutes ?? SLEEP_TARGET_MIN;
}

/** Whether context has enough data for power-based TSS. */
export function canUsePowerTss(ctx: ExtractionContext): boolean {
  return ctx.ftpW != null && ctx.ftpW > 0;
}

/** Whether context has enough data for TRIMP-based TSS. */
export function canUseTrimpTss(ctx: ExtractionContext): boolean {
  return ctx.maxHr != null && ctx.maxHr > 0 && ctx.restingHr != null && ctx.restingHr >= 0;
}

/** Whether context has enough data for pace-based TSS. */
export function canUsePaceTss(ctx: ExtractionContext): boolean {
  return ctx.runThresholdPaceSecPerKm != null && ctx.runThresholdPaceSecPerKm > 0;
}
