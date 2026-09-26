/**
 * Deterministic triathlon finish-time projection from demonstrated swim/bike/run
 * capacity + transition history (race multisport legs and brick gaps).
 *
 * Same family as predictRunRaces — pure training analytics, not a Core engine.
 */

import { predictRunRaces } from '@sharpit/server/lib/training/periodization/performance-predictor';
import type { RunBestCategory, RunEffort } from '@sharpit/server/lib/training/records/records';

export type TriathlonFormat = 'sprint' | 'olympic' | 'half' | 'full';

export type TriathlonSegmentSeconds = {
  readonly swim: number;
  readonly bike: number;
  readonly run: number;
  readonly t1: number;
  readonly t2: number;
};

export type TriathlonPredictionConfidence = 'high' | 'medium' | 'low';

export type TriathlonPrediction = {
  readonly format: TriathlonFormat;
  readonly seconds: number;
  readonly displayTime: string;
  readonly segments: TriathlonSegmentSeconds;
  readonly segmentLabels: {
    readonly swim: string;
    readonly bike: string;
    readonly run: string;
    readonly t1: string;
    readonly t2: string;
    readonly transitions: string;
  };
  readonly confidence: TriathlonPredictionConfidence;
  readonly sources: {
    readonly swim: string;
    readonly bike: string;
    readonly run: string;
    readonly t1: string;
    readonly t2: string;
    readonly transitions: string;
  };
};

export type SwimPaceSample = {
  readonly paceSecPer100m: number;
  readonly distanceM: number;
};

export type BikeSpeedSample = {
  readonly distanceM: number;
  readonly durationSec: number;
};

export type RaceTransitionSample = {
  readonly t1Sec: number | null;
  readonly t2Sec: number | null;
};

export type BrickTransitionSample = {
  readonly gapSec: number;
  /** e.g. swim→bike ≈ T1, bike→run ≈ T2 */
  readonly kind: 't1' | 't2';
};

type FormatSpec = {
  readonly swimM: number;
  readonly bikeM: number;
  readonly runM: number;
  readonly defaultT1Sec: number;
  readonly defaultT2Sec: number;
  /** Race bike intensity vs FTP. */
  readonly bikeIf: number;
  /** Fresh-run → T-run slowdown when no brick evidence. */
  readonly defaultBrickRunFactor: number;
  /** Open-water / race swim vs pool CSS. */
  readonly openWaterPaceFactor: number;
};

const FORMAT_SPECS: Record<TriathlonFormat, FormatSpec> = {
  sprint: {
    swimM: 750,
    bikeM: 20_000,
    runM: 5000,
    defaultT1Sec: 180,
    defaultT2Sec: 120,
    bikeIf: 0.85,
    defaultBrickRunFactor: 1.04,
    openWaterPaceFactor: 1.05,
  },
  olympic: {
    swimM: 1500,
    bikeM: 40_000,
    runM: 10_000,
    defaultT1Sec: 210,
    defaultT2Sec: 150,
    bikeIf: 0.8,
    defaultBrickRunFactor: 1.06,
    openWaterPaceFactor: 1.06,
  },
  half: {
    swimM: 1900,
    bikeM: 90_000,
    runM: 21_097,
    defaultT1Sec: 240,
    defaultT2Sec: 180,
    bikeIf: 0.75,
    defaultBrickRunFactor: 1.08,
    openWaterPaceFactor: 1.07,
  },
  full: {
    swimM: 3800,
    bikeM: 180_000,
    runM: 42_195,
    defaultT1Sec: 300,
    defaultT2Sec: 240,
    bikeIf: 0.7,
    defaultBrickRunFactor: 1.12,
    openWaterPaceFactor: 1.08,
  },
};

const SWIM_MIN_SAMPLE_M = 800;
const DEFAULT_WEIGHT_KG = 75;
const MIN_BRICK_GAP_SEC = 30;
const MAX_BRICK_GAP_SEC = 20 * 60;

function fmtTime(sec: number): string {
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function matchesHalfIron(haystack: string): boolean {
  return (
    /\b70\.3\b/.test(haystack) ||
    /\bhalf\s*iron/.test(haystack) ||
    /\bhalf[\s-]*im\b/.test(haystack) ||
    (/\btriathlon\b/.test(haystack) && /\bhalf\b/.test(haystack))
  );
}

function matchesFullIron(haystack: string): boolean {
  return /\bironman\b/.test(haystack) || /\bfull\s*(iron|distance)\b/.test(haystack);
}

function matchesOlympic(haystack: string): boolean {
  return /\bolympique\b/.test(haystack) || /\bolympic\b/.test(haystack);
}

function matchesSprint(haystack: string): boolean {
  return (
    /\bsprint\b/.test(haystack) && (/\btriathlon\b/.test(haystack) || /\btri\b/.test(haystack))
  );
}

/** Resolve Half / 70.3 / Olympic / Ironman / Sprint from free-text format or title. */
export function resolveTriathlonFormat(
  raceFormat: string | null,
  title: string | null,
): TriathlonFormat | null {
  const haystack = [raceFormat, title].filter(Boolean).join(' · ').toLowerCase();
  if (!haystack.trim()) {
    return null;
  }
  if (matchesHalfIron(haystack)) {
    return 'half';
  }
  if (matchesFullIron(haystack)) {
    return 'full';
  }
  if (matchesOlympic(haystack)) {
    return 'olympic';
  }
  if (matchesSprint(haystack)) {
    return 'sprint';
  }
  return null;
}

export function triathlonDistances(format: TriathlonFormat): FormatSpec {
  return FORMAT_SPECS[format];
}

function resolveSwimPaceSecPer100m(input: {
  swimCssSecPer100m: number | null;
  swimPaceSamples: readonly SwimPaceSample[];
  openWaterPaceFactor: number;
}): { pace: number; source: string } | null {
  if (input.swimCssSecPer100m && input.swimCssSecPer100m > 0) {
    return {
      pace: input.swimCssSecPer100m * input.openWaterPaceFactor,
      source: 'CSS profil',
    };
  }

  const paces = input.swimPaceSamples
    .filter((s) => s.distanceM >= SWIM_MIN_SAMPLE_M && s.paceSecPer100m > 0)
    .map((s) => s.paceSecPer100m)
    .sort((a, b) => a - b);
  if (paces.length === 0) {
    return null;
  }
  const chosen = paces.length >= 3 ? paces[1] : paces[0];
  return {
    pace: chosen * input.openWaterPaceFactor,
    source: 'allure nage historique',
  };
}

/**
 * Flat-road power → speed (m/s). CdA / Crr are typical triathlon TT assumptions.
 * Iterative solve of P ≈ 0.5·ρ·CdA·v³ + Crr·m·g·v.
 */
export function estimateBikeSpeedMsFromPower(watts: number, weightKg: number): number {
  const rho = 1.225;
  const cda = 0.3;
  const crr = 0.005;
  const g = 9.81;
  let v = 10;
  for (let i = 0; i < 12; i++) {
    const aero = 0.5 * rho * cda * v * v * v;
    const roll = crr * weightKg * g * v;
    const p = aero + roll;
    const dp = 1.5 * rho * cda * v * v + crr * weightKg * g;
    if (dp <= 0) {
      break;
    }
    v = Math.max(1, v - (p - watts) / dp);
  }
  return v;
}

function resolveBikeSeconds(input: {
  bikeM: number;
  bikeIf: number;
  samples: readonly BikeSpeedSample[];
  ftpW: number | null;
  weightKg: number | null;
}): { seconds: number; source: string } | null {
  const minDistance = input.bikeM * 0.35;
  const speeds = input.samples
    .filter((s) => s.distanceM >= minDistance && s.durationSec > 0)
    .map((s) => s.distanceM / s.durationSec)
    .filter((speed) => speed > 4 && speed < 18)
    .sort((a, b) => b - a);

  if (speeds.length > 0) {
    const top = speeds.slice(0, Math.max(1, Math.ceil(speeds.length / 2)));
    const speed = median(top);
    if (speed && speed > 0) {
      return {
        seconds: input.bikeM / speed,
        source: 'vitesse sorties vélo',
      };
    }
  }

  if (input.ftpW && input.ftpW > 0) {
    const watts = input.ftpW * input.bikeIf;
    const weight = input.weightKg && input.weightKg > 40 ? input.weightKg : DEFAULT_WEIGHT_KG;
    const speed = estimateBikeSpeedMsFromPower(watts, weight);
    return {
      seconds: input.bikeM / speed,
      source: `FTP × IF ${input.bikeIf.toFixed(2)}`,
    };
  }

  return null;
}

function resolveRunSeconds(input: {
  runM: number;
  defaultBrickRunFactor: number;
  runBests: readonly RunBestCategory[];
  runEfforts: readonly RunEffort[];
  brickRunFactors: readonly number[];
}): { seconds: number; source: string } | null {
  const predictions = predictRunRaces([...input.runBests], [...input.runEfforts]);
  const exact = predictions.find((p) => p.meters === input.runM);
  const prediction =
    exact ??
    predictions.reduce<(typeof predictions)[number] | null>((best, cur) => {
      if (!best) {
        return cur;
      }
      return Math.abs(cur.meters - input.runM) < Math.abs(best.meters - input.runM) ? cur : best;
    }, null);

  if (!prediction) {
    return null;
  }

  let { seconds } = prediction;
  if (prediction.meters !== input.runM && prediction.meters > 0) {
    seconds = prediction.seconds * (input.runM / prediction.meters) ** 1.06;
  }

  const measured = input.brickRunFactors.filter((f) => f >= 1 && f <= 1.3);
  const factor =
    measured.length > 0
      ? (median(measured) ?? input.defaultBrickRunFactor)
      : input.defaultBrickRunFactor;
  const source =
    measured.length > 0
      ? `Riegel × facteur brick (${factor.toFixed(2)})`
      : `Riegel × facteur T-run défaut (${factor.toFixed(2)})`;

  return { seconds: seconds * factor, source };
}

function resolveTransitionSeconds(input: {
  kind: 't1' | 't2';
  defaultSec: number;
  raceTransitions: readonly RaceTransitionSample[];
  brickTransitions: readonly BrickTransitionSample[];
}): { seconds: number; source: string } {
  const fromRace = input.raceTransitions
    .map((t) => (input.kind === 't1' ? t.t1Sec : t.t2Sec))
    .filter(
      (v): v is number => typeof v === 'number' && v >= MIN_BRICK_GAP_SEC && v <= MAX_BRICK_GAP_SEC,
    );
  const raceMedian = median(fromRace);
  if (raceMedian !== null) {
    return { seconds: raceMedian, source: 'transitions course Garmin' };
  }

  const fromBrick = input.brickTransitions
    .filter((t) => t.kind === input.kind)
    .map((t) => t.gapSec)
    .filter((v) => v >= MIN_BRICK_GAP_SEC && v <= MAX_BRICK_GAP_SEC);
  const brickMedian = median(fromBrick);
  if (brickMedian !== null) {
    return { seconds: brickMedian, source: 'gaps brick' };
  }

  return { seconds: input.defaultSec, source: 'défaut format' };
}

function overallConfidence(sources: TriathlonPrediction['sources']): TriathlonPredictionConfidence {
  const blob = Object.values(sources).join(' ');
  const defaults = (blob.match(/défaut/g) ?? []).length;
  const ftp = blob.includes('FTP');
  if (defaults === 0 && !ftp) {
    return 'high';
  }
  if (defaults <= 2) {
    return 'medium';
  }
  return 'low';
}

function segmentSeconds(input: {
  swimPace: number;
  swimM: number;
  bikeSeconds: number;
  runSeconds: number;
  t1Seconds: number;
  t2Seconds: number;
}) {
  const swim = Math.round((input.swimM / 100) * input.swimPace);
  const bike = Math.round(input.bikeSeconds);
  const run = Math.round(input.runSeconds);
  const t1 = Math.round(input.t1Seconds);
  const t2 = Math.round(input.t2Seconds);
  return {
    swim,
    bike,
    run,
    t1,
    t2,
    total: swim + bike + run + t1 + t2,
  };
}

function transitionSourceLabel(t1Source: string, t2Source: string): string {
  return t1Source === t2Source ? t1Source : `T1 ${t1Source} · T2 ${t2Source}`;
}

function assembleTriathlonPrediction(input: {
  format: TriathlonFormat;
  swim: { pace: number; source: string };
  bike: { seconds: number; source: string };
  run: { seconds: number; source: string };
  t1: { seconds: number; source: string };
  t2: { seconds: number; source: string };
  swimM: number;
}): TriathlonPrediction {
  const segments = segmentSeconds({
    swimPace: input.swim.pace,
    swimM: input.swimM,
    bikeSeconds: input.bike.seconds,
    runSeconds: input.run.seconds,
    t1Seconds: input.t1.seconds,
    t2Seconds: input.t2.seconds,
  });
  const sources = {
    swim: input.swim.source,
    bike: input.bike.source,
    run: input.run.source,
    t1: input.t1.source,
    t2: input.t2.source,
    transitions: transitionSourceLabel(input.t1.source, input.t2.source),
  };

  return {
    format: input.format,
    seconds: segments.total,
    displayTime: fmtTime(segments.total),
    segments: {
      swim: segments.swim,
      bike: segments.bike,
      run: segments.run,
      t1: segments.t1,
      t2: segments.t2,
    },
    segmentLabels: {
      swim: fmtTime(segments.swim),
      bike: fmtTime(segments.bike),
      run: fmtTime(segments.run),
      t1: fmtTime(segments.t1),
      t2: fmtTime(segments.t2),
      transitions: fmtTime(segments.t1 + segments.t2),
    },
    confidence: overallConfidence(sources),
    sources,
  };
}

function resolveTriathlonSegments(input: {
  format: TriathlonFormat;
  swimCssSecPer100m: number | null;
  swimPaceSamples: readonly SwimPaceSample[];
  bikeSpeedSamples: readonly BikeSpeedSample[];
  ftpW: number | null;
  weightKg: number | null;
  runBests: readonly RunBestCategory[];
  runEfforts: readonly RunEffort[];
  brickRunFactors: readonly number[];
}) {
  const spec = FORMAT_SPECS[input.format];
  return {
    spec,
    swim: resolveSwimPaceSecPer100m({
      swimCssSecPer100m: input.swimCssSecPer100m,
      swimPaceSamples: input.swimPaceSamples,
      openWaterPaceFactor: spec.openWaterPaceFactor,
    }),
    bike: resolveBikeSeconds({
      bikeM: spec.bikeM,
      bikeIf: spec.bikeIf,
      samples: input.bikeSpeedSamples,
      ftpW: input.ftpW,
      weightKg: input.weightKg,
    }),
    run: resolveRunSeconds({
      runM: spec.runM,
      defaultBrickRunFactor: spec.defaultBrickRunFactor,
      runBests: input.runBests,
      runEfforts: input.runEfforts,
      brickRunFactors: input.brickRunFactors,
    }),
  };
}

function resolveFinishTransitions(
  spec: FormatSpec,
  raceTransitions: readonly RaceTransitionSample[],
  brickTransitions: readonly BrickTransitionSample[],
) {
  return {
    t1: resolveTransitionSeconds({
      kind: 't1',
      defaultSec: spec.defaultT1Sec,
      raceTransitions,
      brickTransitions,
    }),
    t2: resolveTransitionSeconds({
      kind: 't2',
      defaultSec: spec.defaultT2Sec,
      raceTransitions,
      brickTransitions,
    }),
  };
}

function predictInputDefaults(input: {
  swimPaceSamples?: readonly SwimPaceSample[];
  bikeSpeedSamples?: readonly BikeSpeedSample[];
  weightKg?: number | null;
  runEfforts?: readonly RunEffort[];
  brickRunFactors?: readonly number[];
  raceTransitions?: readonly RaceTransitionSample[];
  brickTransitions?: readonly BrickTransitionSample[];
}) {
  return {
    swimPaceSamples: input.swimPaceSamples ?? [],
    bikeSpeedSamples: input.bikeSpeedSamples ?? [],
    weightKg: input.weightKg ?? null,
    runEfforts: input.runEfforts ?? [],
    brickRunFactors: input.brickRunFactors ?? [],
    raceTransitions: input.raceTransitions ?? [],
    brickTransitions: input.brickTransitions ?? [],
  };
}

/**
 * Project a triathlon finish time. Returns null when swim, bike, or run cannot
 * be estimated from athlete evidence (thresholds / history / FTP).
 */
export function predictTriathlonFinish(input: {
  format: TriathlonFormat;
  swimCssSecPer100m: number | null;
  swimPaceSamples?: readonly SwimPaceSample[];
  bikeSpeedSamples?: readonly BikeSpeedSample[];
  ftpW: number | null;
  weightKg?: number | null;
  runBests: readonly RunBestCategory[];
  runEfforts?: readonly RunEffort[];
  raceTransitions?: readonly RaceTransitionSample[];
  brickTransitions?: readonly BrickTransitionSample[];
  brickRunFactors?: readonly number[];
}): TriathlonPrediction | null {
  const defaults = predictInputDefaults(input);
  const { spec, swim, bike, run } = resolveTriathlonSegments({
    format: input.format,
    swimCssSecPer100m: input.swimCssSecPer100m,
    swimPaceSamples: defaults.swimPaceSamples,
    bikeSpeedSamples: defaults.bikeSpeedSamples,
    ftpW: input.ftpW,
    weightKg: defaults.weightKg,
    runBests: input.runBests,
    runEfforts: defaults.runEfforts,
    brickRunFactors: defaults.brickRunFactors,
  });

  if (!swim || !bike || !run) {
    return null;
  }

  const { t1, t2 } = resolveFinishTransitions(
    spec,
    defaults.raceTransitions,
    defaults.brickTransitions,
  );
  return assembleTriathlonPrediction({
    format: input.format,
    swim,
    bike,
    run,
    t1,
    t2,
    swimM: spec.swimM,
  });
}
