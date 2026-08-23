import type { SessionIntensity } from '@prisma/client';
import type {
  EnduranceSport,
  EnduranceTarget,
} from '@/lib/planned-session/endurance/endurance-prescription';

/** Athlete reference values a relative target is resolved against. */
export type AthleteThresholds = {
  runThresholdPaceSecPerKm: number | null;
  /** Critical swim speed, seconds per 100 m — the swimmer's threshold pace. */
  swimCssSecPer100m: number | null;
  ftpW: number | null;
  lthr: number | null;
  maxHr: number | null;
};

/** Pace reads per kilometre on land and per 100 m in the water. */
export type PaceUnit = 'km' | '100m';

export type ResolvedTarget =
  | { metric: 'none' }
  | {
      metric: 'pace';
      /** Garmin stores a pace target as a speed range in m/s, ascending. */
      speedMsMin: number;
      speedMsMax: number;
      paceUnit: PaceUnit;
      /** Same band, athlete-facing, in seconds per unit. `fast` is the smaller. */
      paceSecFast: number;
      paceSecSlow: number;
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
 * Half-width on an easy step. Wider than a quality band because the pace does not
 * need policing, narrow enough that Connect renders a range an athlete can read:
 * the earlier design left the slow bound open so it would never alert, but the
 * watch displays both bounds, and a band reaching 14:45/km is unreadable.
 */
export const EASY_HALF_BAND_PCT = 7.5;

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
 * Centre of the band, in percent of CSS *speed* (100 % = critical swim speed).
 * A swimmer's easy and threshold speeds sit far closer together than a runner's —
 * water punishes the range — so the anchors are compressed accordingly.
 */
const SWIM_SPEED_ANCHOR_PCT: Partial<Record<SessionIntensity, number>> = {
  RECOVERY: 85,
  ENDURANCE: 90,
  TEMPO: 96,
  THRESHOLD: 100,
  VO2MAX: 105,
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

function bandAround(centrePct: number, intensity: SessionIntensity) {
  const half = EASY_INTENSITIES.has(intensity) ? EASY_HALF_BAND_PCT : QUALITY_HALF_BAND_PCT;
  return { pctMin: centrePct - half, pctMax: centrePct + half };
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
      target: { metric: 'power', ...bandAround(centre, effective) },
      warnings,
    };
  }

  const anchors = sport === 'SWIM' ? SWIM_SPEED_ANCHOR_PCT : RUN_SPEED_ANCHOR_PCT;
  const centre = anchors[effective];
  if (centre == null) return { target: { metric: 'none' }, warnings };

  return { target: { metric: 'pace', ...bandAround(centre, effective) }, warnings };
}

/**
 * Read an intensity back out of a stored band — the inverse of the anchor tables.
 *
 * A stored target carries percentages, not the word the athlete thinks in. The
 * summary line needs "tempo", and resolving the band into 5:31–5:50/km to get
 * there would freeze numbers that go stale the day a threshold moves. The
 * percentages do not: they are the intent itself.
 *
 * Returns null for a band nobody's table produced — an athlete override, or a
 * metric with no anchors — and the caller falls back to the step's role.
 */
/** The table a band was drawn from: the metric decides, then the sport. */
function anchorTableFor(
  sport: EnduranceSport,
  metric: 'pace' | 'hr' | 'power',
): Partial<Record<SessionIntensity, number>> {
  if (metric === 'power') return BIKE_POWER_ANCHOR_PCT;
  if (metric === 'hr') return RUN_HR_ANCHOR_PCT;
  return sport === 'SWIM' ? SWIM_SPEED_ANCHOR_PCT : RUN_SPEED_ANCHOR_PCT;
}

export function intensityFromTarget(
  sport: EnduranceSport,
  target: EnduranceTarget,
): SessionIntensity | null {
  if (target.metric === 'none' || target.metric === 'cadence') return null;

  const anchors = anchorTableFor(sport, target.metric);

  // An absolute override carries no percentages, and neither does a hand-typed band.
  if (target.pctMin == null || target.pctMax == null) return null;

  const centre = (target.pctMin + target.pctMax) / 2;
  for (const [intensity, anchor] of Object.entries(anchors)) {
    if (anchor != null && Math.abs(anchor - centre) < 0.01) return intensity as SessionIntensity;
  }
  return null;
}

/** Heart-rate equivalent of `defaultTargetForIntensity`, used when pace is unavailable. */
export function defaultHrTargetForIntensity(intensity: SessionIntensity | null): EnduranceTarget {
  const effective = intensity === 'RACE' || intensity == null ? 'THRESHOLD' : intensity;
  const centre = RUN_HR_ANCHOR_PCT[effective];
  if (centre == null) return { metric: 'none' };
  return {
    metric: 'hr',
    hrRef: 'lthr',
    ...bandAround(centre, effective),
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
  sport: EnduranceSport,
  warnings: string[],
): ResolvedTarget | null {
  const bounds = mergeBounds(
    target,
    () => {
      const threshold =
        sport === 'SWIM' ? thresholds.swimCssSecPer100m : thresholds.runThresholdPaceSecPerKm;
      if (threshold == null || threshold <= 0) {
        warnings.push(
          sport === 'SWIM'
            ? 'Vitesse critique (CSS) inconnue — cible allure impossible.'
            : 'Allure seuil inconnue — cible allure impossible.',
        );
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

  const paceSecSlow = Math.max(bounds.easy, bounds.hard);
  const paceSecFast = Math.min(bounds.easy, bounds.hard);
  if (paceSecFast <= 0) {
    warnings.push(UNUSABLE_BAND_WARNING);
    return null;
  }

  // Connect always wants m/s, whatever unit the athlete reads.
  const paceUnit: PaceUnit = sport === 'SWIM' ? '100m' : 'km';
  const metresPerUnit = paceUnit === '100m' ? 100 : 1000;

  return {
    metric: 'pace',
    speedMsMin: round(metresPerUnit / paceSecSlow, 4),
    speedMsMax: round(metresPerUnit / paceSecFast, 4),
    paceUnit,
    paceSecFast: Math.round(paceSecFast),
    paceSecSlow: Math.round(paceSecSlow),
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
  sport: EnduranceSport,
): TargetResolution {
  const warnings: string[] = [];
  let resolved: ResolvedTarget | null = null;

  if (target.metric === 'pace') resolved = resolvePace(target, thresholds, sport, warnings);
  else if (target.metric === 'hr') resolved = resolveHr(target, thresholds, warnings);
  else if (target.metric === 'power') resolved = resolvePower(target, thresholds, warnings);
  else if (target.metric === 'cadence') resolved = resolveCadence(target, warnings);

  return { resolved: resolved ?? { metric: 'none' }, warnings };
}

/** Athlete-facing pace label, e.g. "3:54–4:06/km" or "1:38–1:43/100m". */
export function formatPaceBand(
  paceSecFast: number,
  paceSecSlow: number,
  unit: PaceUnit = 'km',
): string {
  return `${formatPace(paceSecFast)}–${formatPace(paceSecSlow)}/${unit}`;
}

export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
