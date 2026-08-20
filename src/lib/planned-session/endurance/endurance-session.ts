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
 * Swimming has no validated target table (ADR-017). Inventing a band would put a
 * wrong number on the watch, so the step goes out free and the athlete is told why.
 */
const NO_TARGET_TABLE_WARNING =
  'Pas de table de cibles validée pour ce sport — étape envoyée sans guidage chiffré.';

const NO_FTP_WARNING = 'FTP inconnue — séance vélo envoyée sans guidage chiffré.';

export type EffectiveEndurancePrescription = {
  prescription: EndurancePrescription;
  /** True when nothing was stored and the prescription was derived. */
  derived: boolean;
  warnings: string[];
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
  if (sport === 'SWIM') return { target: NO_TARGET, warnings: [NO_TARGET_TABLE_WARNING] };

  if (sport === 'BIKE') {
    // Power only: heart rate would be anchored on running references, which are not the bike's.
    const powerDefault = defaultTargetForIntensity(sport, intensity);
    if (powerDefault.target.metric === 'power' && thresholds.ftpW != null) return powerDefault;
    return { target: NO_TARGET, warnings: [...powerDefault.warnings, NO_FTP_WARNING] };
  }

  const paceDefault = defaultTargetForIntensity(sport, intensity);
  if (paceDefault.target.metric === 'pace' && thresholds.runThresholdPaceSecPerKm != null) {
    return paceDefault;
  }
  if (thresholds.lthr != null || thresholds.maxHr != null) {
    return { target: defaultHrTargetForIntensity(intensity), warnings: paceDefault.warnings };
  }
  return paceDefault;
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
}): EffectiveEndurancePrescription {
  const stored = parseEndurancePrescription(input.stored);
  if (stored) {
    return {
      prescription: { ...stored, sport: input.sport },
      derived: false,
      warnings: [],
    };
  }

  const durationMin =
    input.durationMin != null && input.durationMin > 0 ? input.durationMin : DEFAULT_SESSION_MIN;
  const { target, warnings } = fallbackTarget(input.sport, input.intensity, input.thresholds);

  return {
    prescription: singleStepPrescription({ sport: input.sport, durationMin, target }),
    derived: true,
    warnings,
  };
}
