/**
 * What a planned endurance session actually prescribes — stored structure when
 * there is one, derived from duration + intensity otherwise.
 *
 * Pure and sport-agnostic so the push path and the staleness check see the same
 * prescription: a derived session depends on athlete thresholds just as much as
 * a structured one, and both must be able to go stale.
 */
import type { SessionIntensity } from '@prisma/client';
import {
  NO_TARGET,
  parseEndurancePrescription,
  singleStepPrescription,
  type EndurancePrescription,
  type EnduranceSport,
  type EnduranceTarget,
} from '@/lib/planned-session/endurance/endurance-prescription';
import {
  defaultHrTargetForIntensity,
  defaultTargetForIntensity,
  type AthleteThresholds,
} from '@/lib/planned-session/endurance/endurance-targets';

const DEFAULT_SESSION_MIN = 45;

/**
 * Connect cannot render a pool workout without a length, so a swim session always
 * leaves with one. 25 m is the near-universal default when the athlete has not
 * said otherwise — better than refusing to send the session.
 */
export const DEFAULT_POOL_LENGTH_M = 25;

const NO_FTP_WARNING = 'FTP inconnue — séance vélo envoyée sans guidage chiffré.';

const NO_CSS_WARNING = 'Vitesse critique natation inconnue — séance envoyée sans guidage chiffré.';

export type EffectiveEndurancePrescription = {
  prescription: EndurancePrescription;
  /** True when nothing was stored and the prescription was derived. */
  derived: boolean;
  warnings: string[];
};

function swimFallbackTarget(
  intensity: SessionIntensity | null,
  thresholds: AthleteThresholds,
): { target: EnduranceTarget; warnings: string[] } {
  const paceDefault = defaultTargetForIntensity('SWIM', intensity);
  if (paceDefault.target.metric === 'pace' && thresholds.swimCssSecPer100m !== null) {
    return paceDefault;
  }
  return { target: NO_TARGET, warnings: [...paceDefault.warnings, NO_CSS_WARNING] };
}

function bikeFallbackTarget(
  intensity: SessionIntensity | null,
  thresholds: AthleteThresholds,
): { target: EnduranceTarget; warnings: string[] } {
  const powerDefault = defaultTargetForIntensity('BIKE', intensity);
  if (powerDefault.target.metric === 'power' && thresholds.ftpW !== null) {
    return powerDefault;
  }
  return { target: NO_TARGET, warnings: [...powerDefault.warnings, NO_FTP_WARNING] };
}

function runFallbackTarget(
  intensity: SessionIntensity | null,
  thresholds: AthleteThresholds,
): { target: EnduranceTarget; warnings: string[] } {
  const paceDefault = defaultTargetForIntensity('RUN', intensity);
  if (paceDefault.target.metric === 'pace' && thresholds.runThresholdPaceSecPerKm !== null) {
    return paceDefault;
  }
  if (thresholds.lthr !== null || thresholds.maxHr !== null) {
    return { target: defaultHrTargetForIntensity(intensity), warnings: paceDefault.warnings };
  }
  return paceDefault;
}

const SPORT_FALLBACK: Record<
  EnduranceSport,
  (intensity: SessionIntensity | null, thresholds: AthleteThresholds) => { target: EnduranceTarget; warnings: string[] }
> = {
  SWIM: swimFallbackTarget,
  BIKE: bikeFallbackTarget,
  RUN: runFallbackTarget,
};

/**
 * Target for a session with no structure: pace when a threshold pace is known,
 * heart rate as a fallback, nothing when neither reference exists.
 */
export function fallbackTarget(
  sport: EnduranceSport,
  intensity: SessionIntensity | null,
  thresholds: AthleteThresholds,
): { target: EnduranceTarget; warnings: string[] } {
  return SPORT_FALLBACK[sport](intensity, thresholds);
}

/**
 * Resolve what the session prescribes. The sport always comes from the session's
 * own activity type: a stored prescription carrying a different sport would
 * otherwise send a run workout to Connect for a ride.
 */
export function effectiveEndurancePrescription(input: {
  sport: EnduranceSport;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  stored: unknown;
  thresholds: AthleteThresholds;
  /** Athlete's usual pool length — only consulted for swimming. */
  defaultPoolLengthM?: number | null;
}): EffectiveEndurancePrescription {
  const stored = parseEndurancePrescription(input.stored);
  if (stored) {
    return {
      prescription: withPoolLength({ ...stored, sport: input.sport }, input.defaultPoolLengthM),
      derived: false,
      warnings: [],
    };
  }

  const durationMin =
    input.durationMin !== null && input.durationMin > 0 ? input.durationMin : DEFAULT_SESSION_MIN;
  const { target, warnings } = fallbackTarget(input.sport, input.intensity, input.thresholds);

  return {
    prescription: withPoolLength(
      singleStepPrescription({ sport: input.sport, durationMin, target }),
      input.defaultPoolLengthM,
    ),
    derived: true,
    warnings,
  };
}

/** Stamp a pool length on a swim prescription: its own, the athlete's, then 25 m. */
function withPoolLength(
  prescription: EndurancePrescription,
  defaultPoolLengthM: number | null | undefined,
): EndurancePrescription {
  if (prescription.sport !== 'SWIM') {
    return prescription;
  }
  return {
    ...prescription,
    poolLengthM: prescription.poolLengthM ?? defaultPoolLengthM ?? DEFAULT_POOL_LENGTH_M,
  };
}
