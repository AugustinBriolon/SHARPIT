import type { SessionIntensity } from '@prisma/client';
import type { EnduranceSport, EnduranceTarget } from '@/lib/planned-session/endurance-prescription';

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
  if (sport !== 'RUN') {
    return { target: { metric: 'none' }, warnings: [] };
  }

  const warnings: string[] = [];
  let effective = intensity ?? 'ENDURANCE';
  if (effective === 'RACE') {
    effective = RACE_FALLBACK_INTENSITY;
    warnings.push(RACE_FALLBACK_WARNING);
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

function resolvePace(
  target: EnduranceTarget,
  thresholds: AthleteThresholds,
  warnings: string[],
): ResolvedTarget | null {
  let secPerKmSlow = target.absEasy ?? null;
  let secPerKmFast = target.absHard ?? null;

  if (secPerKmSlow == null || secPerKmFast == null) {
    const threshold = thresholds.runThresholdPaceSecPerKm;
    if (threshold == null || threshold <= 0) {
      warnings.push('Allure seuil inconnue — cible allure impossible.');
      return null;
    }
    if (target.pctMin == null || target.pctMax == null) return null;
    // Percentages are on speed, so the slower bound divides by the *lower* percent.
    secPerKmSlow = threshold / (target.pctMin / 100);
    secPerKmFast = threshold / (target.pctMax / 100);
  }

  if (secPerKmFast > secPerKmSlow) {
    [secPerKmFast, secPerKmSlow] = [secPerKmSlow, secPerKmFast];
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
  let bpmMin = target.absEasy ?? null;
  let bpmMax = target.absHard ?? null;

  if (bpmMin == null || bpmMax == null) {
    const reference = hrReference(target, thresholds);
    if (reference == null || reference <= 0) {
      warnings.push('FC seuil et FC max inconnues — cible FC impossible.');
      return null;
    }
    if (target.pctMin == null || target.pctMax == null) return null;
    bpmMin = (reference * target.pctMin) / 100;
    bpmMax = (reference * target.pctMax) / 100;
  }

  return {
    metric: 'hr',
    bpmMin: Math.round(Math.min(bpmMin, bpmMax)),
    bpmMax: Math.round(Math.max(bpmMin, bpmMax)),
  };
}

function resolvePower(
  target: EnduranceTarget,
  thresholds: AthleteThresholds,
  warnings: string[],
): ResolvedTarget | null {
  let wattsMin = target.absEasy ?? null;
  let wattsMax = target.absHard ?? null;

  if (wattsMin == null || wattsMax == null) {
    if (thresholds.ftpW == null || thresholds.ftpW <= 0) {
      warnings.push('FTP inconnue — cible puissance impossible.');
      return null;
    }
    if (target.pctMin == null || target.pctMax == null) return null;
    wattsMin = (thresholds.ftpW * target.pctMin) / 100;
    wattsMax = (thresholds.ftpW * target.pctMax) / 100;
  }

  return {
    metric: 'power',
    wattsMin: Math.round(Math.min(wattsMin, wattsMax)),
    wattsMax: Math.round(Math.max(wattsMin, wattsMax)),
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
  else if (target.metric === 'cadence') {
    const min = target.absEasy;
    const max = target.absHard;
    resolved =
      min != null && max != null
        ? {
            metric: 'cadence',
            min: Math.round(Math.min(min, max)),
            max: Math.round(Math.max(min, max)),
          }
        : null;
  }

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
