import type { SessionIntensity } from '@prisma/client';
import type {
  EnduranceSport,
  EnduranceTarget,
} from '@/lib/planned-session/endurance/endurance-prescription';

/** Athlete reference values a relative target is resolved against. */
export type AthleteThresholds = {
  runThresholdPaceSecPerKm: number | null;
  ftpW: number | null;
  lthr: number | null;
  maxHr: number | null;
};

export type ResolvedTarget =
  | { metric: 'none' }
  | {
      metric: 'pace';
      /** Garmin stores a pace target as a speed range in m/s, ascending. */
      speedMsMin: number;
      speedMsMax: number;
      /** Same band, athlete-facing. `fast` is the smaller number of seconds. */
      secPerKmFast: number;
      secPerKmSlow: number;
    }
  | { metric: 'hr'; bpmMin: number; bpmMax: number }
  | { metric: 'power'; wattsMin: number; wattsMax: number }
  | { metric: 'cadence'; min: number; max: number };

export type TargetResolution = {
  resolved: ResolvedTarget;
  /** Athlete-facing reasons a target was widened, downgraded or dropped. */
  warnings: string[];
};

/** Half-width of the band on a quality step, in percent of the reference. */
export const QUALITY_HALF_BAND_PCT = 2.5;

/**
 * Easy sessions get a cap, not a two-sided band: running slower than prescribed on
 * a recovery run is not an error, and a "too slow" alert is what makes an athlete
 * turn guidance off. Garmin still requires both bounds, so the floor is set wide
 * enough that it never fires.
 */
const OPEN_FLOOR_PCT = 40;
const OPEN_FLOOR_HR_PCT = 50;
const EASY_INTENSITIES = new Set<SessionIntensity>(['RECOVERY', 'ENDURANCE']);

/** Centre of the band, in percent of threshold *speed* (100 % = threshold pace). */
const RUN_SPEED_ANCHOR_PCT: Partial<Record<SessionIntensity, number>> = {
  RECOVERY: 68,
  ENDURANCE: 80,
  TEMPO: 90,
  THRESHOLD: 100,
  VO2MAX: 107,
};

/**
 * Centre of the band, in percent of FTP (ADR-017).
 * Values sit inside the classic Coggan zone bands rather than at their edges, so a
 * step lands unambiguously in its intended zone.
 */
const BIKE_POWER_ANCHOR_PCT: Partial<Record<SessionIntensity, number>> = {
  RECOVERY: 50,
  ENDURANCE: 65,
  TEMPO: 83,
  THRESHOLD: 98,
  VO2MAX: 112,
};

/** Fallback centre when no threshold pace is known, in percent of LTHR. */
const RUN_HR_ANCHOR_PCT: Partial<Record<SessionIntensity, number>> = {
  RECOVERY: 72,
  ENDURANCE: 82,
  TEMPO: 92,
  THRESHOLD: 100,
  VO2MAX: 105,
};

/** RACE pace depends on race distance, which the Goal model does not carry yet. */
const RACE_FALLBACK_INTENSITY: SessionIntensity = 'THRESHOLD';
const RACE_FALLBACK_WARNING =
  'Allure RACE non dérivable (objectif sans distance structurée) — repli sur allure seuil.';

function bandAround(centrePct: number, intensity: SessionIntensity, floorPct: number) {
  if (EASY_INTENSITIES.has(intensity)) {
    return { pctMin: floorPct, pctMax: centrePct + QUALITY_HALF_BAND_PCT };
  }
  return {
    pctMin: centrePct - QUALITY_HALF_BAND_PCT,
    pctMax: centrePct + QUALITY_HALF_BAND_PCT,
  };
}

/**
 * Default relative target for an intensity, before any athlete override.
 * Returns a pace band when the sport is running, since pace is what the watch
 * guides best; callers fall back to heart rate when no threshold pace exists.
 */
export function defaultTargetForIntensity(
  sport: EnduranceSport,
  intensity: SessionIntensity | null,
): { target: EnduranceTarget; warnings: string[] } {
  // Swimming has no validated table — inventing one would put made-up numbers on the wrist.
  if (sport === 'SWIM') return { target: { metric: 'none' }, warnings: [] };

  const warnings: string[] = [];
  let effective = intensity ?? 'ENDURANCE';
  if (effective === 'RACE') {
    effective = RACE_FALLBACK_INTENSITY;
    warnings.push(RACE_FALLBACK_WARNING);
  }

  if (sport === 'BIKE') {
    const centre = BIKE_POWER_ANCHOR_PCT[effective];
    if (centre == null) return { target: { metric: 'none' }, warnings };
    return {
      target: { metric: 'power', ...bandAround(centre, effective, OPEN_FLOOR_PCT) },
      warnings,
    };
  }

  const centre = RUN_SPEED_ANCHOR_PCT[effective];
  if (centre == null) return { target: { metric: 'none' }, warnings };

  return { target: { metric: 'pace', ...bandAround(centre, effective, OPEN_FLOOR_PCT) }, warnings };
}

/** Heart-rate equivalent of `defaultTargetForIntensity`, used when pace is unavailable. */
export function defaultHrTargetForIntensity(intensity: SessionIntensity | null): EnduranceTarget {
  const effective = intensity === 'RACE' || intensity == null ? 'THRESHOLD' : intensity;
  const centre = RUN_HR_ANCHOR_PCT[effective];
  if (centre == null) return { metric: 'none' };
  return {
    metric: 'hr',
    hrRef: 'lthr',
    ...bandAround(centre, effective, OPEN_FLOOR_HR_PCT),
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

const UNUSABLE_BAND_WARNING =
  'Cible sans fourchette exploitable — étape envoyée sans guidage chiffré.';

type Bounds = { easy: number; hard: number };

/**
 * Merge the athlete's absolute overrides with the relative band, side by side.
 * A single-sided override wins on its own side and keeps the derived value on
 * the other, so "no faster than 4:00" never silently drops the whole target.
 */
function mergeBounds(
  target: EnduranceTarget,
  derive: () => Bounds | null,
  warnings: string[],
): Bounds | null {
  const easyOverride = target.absEasy ?? null;
  const hardOverride = target.absHard ?? null;
  if (easyOverride != null && hardOverride != null) {
    return { easy: easyOverride, hard: hardOverride };
  }

  const derived = derive();
  if (!derived) {
    if (easyOverride != null || hardOverride != null) warnings.push(UNUSABLE_BAND_WARNING);
    return null;
  }
  return { easy: easyOverride ?? derived.easy, hard: hardOverride ?? derived.hard };
}

/** Relative bounds are unusable without both percentages — say so rather than dropping silently. */
function relativeBand(
  target: EnduranceTarget,
  compute: (pctMin: number, pctMax: number) => Bounds,
  warnings: string[],
): Bounds | null {
  if (target.pctMin == null || target.pctMax == null) {
    warnings.push(UNUSABLE_BAND_WARNING);
    return null;
  }
  return compute(target.pctMin, target.pctMax);
}

function resolvePace(
  target: EnduranceTarget,
  thresholds: AthleteThresholds,
  warnings: string[],
): ResolvedTarget | null {
  const bounds = mergeBounds(
    target,
    () => {
      const threshold = thresholds.runThresholdPaceSecPerKm;
      if (threshold == null || threshold <= 0) {
        warnings.push('Allure seuil inconnue — cible allure impossible.');
        return null;
      }
      // Percentages are on speed, so the slower bound divides by the *lower* percent.
      return relativeBand(
        target,
        (pctMin, pctMax) => ({
          easy: threshold / (pctMin / 100),
          hard: threshold / (pctMax / 100),
        }),
        warnings,
      );
    },
    warnings,
  );
  if (!bounds) return null;

  const secPerKmSlow = Math.max(bounds.easy, bounds.hard);
  const secPerKmFast = Math.min(bounds.easy, bounds.hard);
  if (secPerKmFast <= 0) {
    warnings.push(UNUSABLE_BAND_WARNING);
    return null;
  }

  return {
    metric: 'pace',
    speedMsMin: round(1000 / secPerKmSlow, 4),
    speedMsMax: round(1000 / secPerKmFast, 4),
    secPerKmFast: Math.round(secPerKmFast),
    secPerKmSlow: Math.round(secPerKmSlow),
  };
}

function hrReference(target: EnduranceTarget, thresholds: AthleteThresholds): number | null {
  const ref = target.hrRef ?? 'auto';
  if (ref === 'maxhr') return thresholds.maxHr;
  if (ref === 'lthr') return thresholds.lthr;
  return thresholds.lthr ?? thresholds.maxHr;
}

function resolveHr(
  target: EnduranceTarget,
  thresholds: AthleteThresholds,
  warnings: string[],
): ResolvedTarget | null {
  const bounds = mergeBounds(
    target,
    () => {
      const reference = hrReference(target, thresholds);
      if (reference == null || reference <= 0) {
        warnings.push('FC seuil et FC max inconnues — cible FC impossible.');
        return null;
      }
      return relativeBand(
        target,
        (pctMin, pctMax) => ({
          easy: (reference * pctMin) / 100,
          hard: (reference * pctMax) / 100,
        }),
        warnings,
      );
    },
    warnings,
  );
  if (!bounds) return null;

  return {
    metric: 'hr',
    bpmMin: Math.round(Math.min(bounds.easy, bounds.hard)),
    bpmMax: Math.round(Math.max(bounds.easy, bounds.hard)),
  };
}

function resolvePower(
  target: EnduranceTarget,
  thresholds: AthleteThresholds,
  warnings: string[],
): ResolvedTarget | null {
  const bounds = mergeBounds(
    target,
    () => {
      const ftp = thresholds.ftpW;
      if (ftp == null || ftp <= 0) {
        warnings.push('FTP inconnue — cible puissance impossible.');
        return null;
      }
      return relativeBand(
        target,
        (pctMin, pctMax) => ({ easy: (ftp * pctMin) / 100, hard: (ftp * pctMax) / 100 }),
        warnings,
      );
    },
    warnings,
  );
  if (!bounds) return null;

  return {
    metric: 'power',
    wattsMin: Math.round(Math.min(bounds.easy, bounds.hard)),
    wattsMax: Math.round(Math.max(bounds.easy, bounds.hard)),
  };
}

/** Cadence has no athlete reference — both bounds must be given explicitly. */
function resolveCadence(target: EnduranceTarget, warnings: string[]): ResolvedTarget | null {
  const min = target.absEasy;
  const max = target.absHard;
  if (min == null || max == null) {
    warnings.push(UNUSABLE_BAND_WARNING);
    return null;
  }
  return {
    metric: 'cadence',
    min: Math.round(Math.min(min, max)),
    max: Math.round(Math.max(min, max)),
  };
}

/**
 * Resolve a stored target into the absolute numbers the watch needs, against the
 * athlete thresholds passed in — always the current ones, never those that were
 * in force when the session was planned.
 */
export function resolveEnduranceTarget(
  target: EnduranceTarget,
  thresholds: AthleteThresholds,
): TargetResolution {
  const warnings: string[] = [];
  let resolved: ResolvedTarget | null = null;

  if (target.metric === 'pace') resolved = resolvePace(target, thresholds, warnings);
  else if (target.metric === 'hr') resolved = resolveHr(target, thresholds, warnings);
  else if (target.metric === 'power') resolved = resolvePower(target, thresholds, warnings);
  else if (target.metric === 'cadence') resolved = resolveCadence(target, warnings);

  return { resolved: resolved ?? { metric: 'none' }, warnings };
}

/** Athlete-facing pace label, e.g. "3:54–4:06/km". */
export function formatPaceBand(secPerKmFast: number, secPerKmSlow: number): string {
  return `${formatPace(secPerKmFast)}–${formatPace(secPerKmSlow)}/km`;
}

export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
