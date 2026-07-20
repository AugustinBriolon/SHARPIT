import { ActivityType } from '@prisma/client';

/** Seuils athlète pour le calcul des zones et métriques avancées. */
export interface AthleteThresholds {
  ftp: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  source: 'profile' | 'estimate';
}

export interface ZoneBucket {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  seconds: number;
  percent: number;
}

export interface SplitRow {
  index: number;
  label: string;
  distanceM: number;
  durationSec: number;
  paceSecPerKm: number | null;
  avgHr: number | null;
  avgWatts: number | null;
  elevationGainM: number | null;
}

export interface ActivityAnalysis {
  thresholds: AthleteThresholds;
  load: {
    tss: number | null;
    intensityFactor: number | null;
    method: 'power' | 'hr' | null;
  };
  hr: {
    zones: ZoneBucket[];
    decouplingPct: number | null;
    efficiencyFactor: number | null;
    efficiencyLabel: string;
    avgHr: number | null;
    maxHr: number | null;
  };
  power: {
    normalized: number | null;
    avg: number | null;
    variabilityIndex: number | null;
    intensityFactor: number | null;
    tss: number | null;
    zones: ZoneBucket[];
  } | null;
  run: {
    splits: SplitRow[];
    paceVariabilityPct: number | null;
    avgPaceSecPerKm: number | null;
  } | null;
  bike: {
    splits: SplitRow[];
  } | null;
}

interface RawPoint {
  t: number;
  d: number;
  hr: number;
  watts: number;
  speed: number;
  alt: number;
}

interface ZoneDef {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  minPct: number;
  maxPct: number | null;
}

const PHYSIO_ZONE_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
] as const;

const HR_ZONE_DEFS: ZoneDef[] = [
  {
    id: 'z1',
    label: 'Récupération',
    shortLabel: 'Z1',
    color: PHYSIO_ZONE_COLORS[0],
    minPct: 0,
    maxPct: 81,
  },
  {
    id: 'z2',
    label: 'Endurance',
    shortLabel: 'Z2',
    color: PHYSIO_ZONE_COLORS[1],
    minPct: 81,
    maxPct: 89,
  },
  {
    id: 'z3',
    label: 'Tempo',
    shortLabel: 'Z3',
    color: PHYSIO_ZONE_COLORS[2],
    minPct: 89,
    maxPct: 93,
  },
  {
    id: 'z4',
    label: 'Seuil',
    shortLabel: 'Z4',
    color: PHYSIO_ZONE_COLORS[3],
    minPct: 93,
    maxPct: 100,
  },
  {
    id: 'z5',
    label: 'VO2max+',
    shortLabel: 'Z5',
    color: PHYSIO_ZONE_COLORS[4],
    minPct: 100,
    maxPct: null,
  },
];

const POWER_ZONE_DEFS: ZoneDef[] = [
  {
    id: 'z1',
    label: 'Récupération active',
    shortLabel: 'Z1',
    color: 'var(--signal-neutral)',
    minPct: 0,
    maxPct: 55,
  },
  {
    id: 'z2',
    label: 'Endurance',
    shortLabel: 'Z2',
    color: PHYSIO_ZONE_COLORS[0],
    minPct: 55,
    maxPct: 75,
  },
  {
    id: 'z3',
    label: 'Tempo',
    shortLabel: 'Z3',
    color: PHYSIO_ZONE_COLORS[2],
    minPct: 75,
    maxPct: 90,
  },
  {
    id: 'z4',
    label: 'Seuil lactique',
    shortLabel: 'Z4',
    color: PHYSIO_ZONE_COLORS[3],
    minPct: 90,
    maxPct: 105,
  },
  {
    id: 'z5',
    label: 'VO2max',
    shortLabel: 'Z5',
    color: PHYSIO_ZONE_COLORS[4],
    minPct: 105,
    maxPct: 120,
  },
  {
    id: 'z6',
    label: 'Capacité anaérobie',
    shortLabel: 'Z6',
    color: 'var(--signal-caution)',
    minPct: 120,
    maxPct: 150,
  },
  {
    id: 'z7',
    label: 'Neuromusculaire',
    shortLabel: 'Z7',
    color: 'var(--signal-risk)',
    minPct: 150,
    maxPct: null,
  },
];

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function segmentMean(arr: number[], start: number, end: number): number | null {
  const slice = arr.slice(start, end + 1).filter((v) => v > 0);
  if (!slice.length) return null;
  return mean(slice);
}

function buildPoints(raw: {
  time: number[];
  distance: number[];
  heartrate: number[];
  watts: number[];
  velocity: number[];
  altitude: number[];
}): RawPoint[] {
  const len = Math.max(raw.time.length, raw.distance.length, raw.heartrate.length);
  const points: RawPoint[] = [];
  for (let i = 0; i < len; i++) {
    points.push({
      t: raw.time[i] ?? 0,
      d: raw.distance[i] ?? 0,
      hr: raw.heartrate[i] ?? 0,
      watts: raw.watts[i] ?? 0,
      speed: raw.velocity[i] ?? 0,
      alt: raw.altitude[i] ?? 0,
    });
  }
  return points;
}

function zoneIndex(value: number, ref: number, defs: ZoneDef[]): number {
  const pct = (value / ref) * 100;
  for (let i = 0; i < defs.length; i++) {
    const z = defs[i];
    if (pct >= z.minPct && (z.maxPct == null || pct < z.maxPct)) return i;
  }
  return defs.length - 1;
}

function computeZoneTimes(
  values: number[],
  times: number[],
  ref: number,
  defs: ZoneDef[],
): ZoneBucket[] {
  const seconds = new Array(defs.length).fill(0);
  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    if (v <= 0) continue;
    const dt = Math.max(0, times[i] - times[i - 1]);
    if (dt <= 0 || dt > 120) continue;
    seconds[zoneIndex(v, ref, defs)] += dt;
  }
  const total = seconds.reduce((s, v) => s + v, 0) || 1;
  return defs.map((z, i) => ({
    id: z.id,
    label: z.label,
    shortLabel: z.shortLabel,
    color: z.color,
    seconds: Math.round(seconds[i]),
    percent: Math.round((seconds[i] / total) * 100),
  }));
}

function computeNormalizedPower(watts: number[], time: number[]): number | null {
  const valid = watts.filter((w) => w > 0);
  if (valid.length < 30) return null;

  const buckets: number[] = [];
  let [windowStart] = time;
  let windowWatts: number[] = [];

  for (let i = 0; i < watts.length; i++) {
    while (time[i] - windowStart >= 30) {
      if (windowWatts.length) buckets.push(mean(windowWatts));
      windowStart += 30;
      windowWatts = [];
    }
    if (watts[i] > 0) windowWatts.push(watts[i]);
  }
  if (windowWatts.length) buckets.push(mean(windowWatts));
  if (!buckets.length) return null;

  const fourth = buckets.map((b) => b ** 4);
  return Math.round(Math.pow(fourth.reduce((s, v) => s + v, 0) / fourth.length, 0.25));
}

function computeDecoupling(points: RawPoint[], mode: 'pace' | 'power'): number | null {
  if (points.length < 120) return null;
  const duration = points[points.length - 1].t - points[0].t;
  if (duration < 30 * 60) return null;

  const warmupEnd = points[0].t + 10 * 60;
  const mid = points[0].t + duration / 2;
  const first: RawPoint[] = [];
  const second: RawPoint[] = [];

  for (const p of points) {
    if (p.t < warmupEnd) continue;
    if (p.t < mid) first.push(p);
    else second.push(p);
  }
  if (first.length < 30 || second.length < 30) return null;

  const ef = (seg: RawPoint[]) => {
    const hrs = seg.map((p) => p.hr).filter((h) => h > 0);
    if (!hrs.length) return null;
    const avgHr = mean(hrs);
    if (mode === 'power') {
      const ws = seg.map((p) => p.watts).filter((w) => w > 0);
      if (!ws.length) return null;
      return mean(ws) / avgHr;
    }
    const speeds = seg.map((p) => p.speed).filter((s) => s > 0.5);
    if (!speeds.length) return null;
    return mean(speeds) / avgHr;
  };

  const ef1 = ef(first);
  const ef2 = ef(second);
  if (ef1 == null || ef2 == null || ef1 === 0) return null;
  return Number((((ef1 - ef2) / ef1) * 100).toFixed(1));
}

function computeSplits(points: RawPoint[], splitM: number): SplitRow[] {
  if (points.length < 2) return [];
  const splits: SplitRow[] = [];
  let target = splitM;
  let startIdx = 0;

  for (let i = 1; i < points.length; i++) {
    const isLast = i === points.length - 1;
    if (points[i].d >= target || isLast) {
      const dist = points[i].d - points[startIdx].d;
      const dur = points[i].t - points[startIdx].t;
      if (dist < splitM * 0.5 && !isLast) continue;

      let elevGain = 0;
      for (let j = startIdx + 1; j <= i; j++) {
        const diff = points[j].alt - points[j - 1].alt;
        if (diff > 0) elevGain += diff;
      }

      const pace = dist > 0 ? (dur / dist) * 1000 : null;

      splits.push({
        index: splits.length + 1,
        label: splitM >= 1000 ? `${(target / 1000).toFixed(0)} km` : `${target} m`,
        distanceM: Math.round(dist),
        durationSec: Math.round(dur),
        paceSecPerKm: pace != null ? Math.round(pace) : null,
        avgHr: segmentMean(
          points.map((p) => p.hr),
          startIdx,
          i,
        ),
        avgWatts: segmentMean(
          points.map((p) => p.watts),
          startIdx,
          i,
        ),
        elevationGainM: elevGain > 0 ? Math.round(elevGain) : null,
      });

      startIdx = i;
      target += splitM;
      if (isLast) break;
    }
  }
  return splits;
}

function paceVariability(points: RawPoint[]): number | null {
  const paces: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const dd = points[i].d - points[i - 1].d;
    const dt = points[i].t - points[i - 1].t;
    if (dd > 5 && dt > 0) paces.push((dt / dd) * 1000);
  }
  if (paces.length < 20) return null;
  const avg = mean(paces);
  if (avg === 0) return null;
  const variance = paces.reduce((s, p) => s + (p - avg) ** 2, 0) / paces.length;
  return Number(((Math.sqrt(variance) / avg) * 100).toFixed(1));
}

export interface AnalysisContext {
  type: ActivityType;
  durationSec: number | null;
  bikeNormalizedPower: number | null;
  bikeIntensityFactor: number | null;
}

export interface ProfileInput {
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
}

export function resolveThresholds(
  profile: ProfileInput | null,
  raw: {
    heartrate: number[];
    watts: number[];
  },
  ctx: AnalysisContext,
): AthleteThresholds {
  const streamMaxHr = raw.heartrate.length ? Math.max(...raw.heartrate.filter((h) => h > 0)) : null;

  const hasProfile = profile?.ftpW || profile?.lthr || profile?.maxHr;

  let ftp = profile?.ftpW ?? null;
  if (!ftp && ctx.bikeNormalizedPower && ctx.bikeIntensityFactor && ctx.bikeIntensityFactor > 0) {
    ftp = Math.round(ctx.bikeNormalizedPower / ctx.bikeIntensityFactor);
  }
  if (!ftp && raw.watts.length) {
    const sorted = [...raw.watts].filter((w) => w > 0).sort((a, b) => b - a);
    if (sorted.length > 60) {
      const top = sorted.slice(0, Math.floor(sorted.length * 0.05));
      ftp = Math.round(mean(top) * 0.95);
    }
  }

  const maxHr = profile?.maxHr ?? streamMaxHr;
  const lthr = profile?.lthr ?? (maxHr ? Math.round(maxHr * 0.91) : null);

  const runThresholdPaceSecPerKm = profile?.runThresholdPaceSecPerKm ?? null;

  return {
    ftp,
    maxHr: maxHr ?? null,
    lthr,
    runThresholdPaceSecPerKm,
    source: hasProfile ? 'profile' : 'estimate',
  };
}

export function analyzeActivityStreams(
  raw: {
    time: number[];
    distance: number[];
    heartrate: number[];
    watts: number[];
    velocity: number[];
    altitude: number[];
  },
  thresholds: AthleteThresholds,
  ctx: AnalysisContext,
): ActivityAnalysis | null {
  const points = buildPoints(raw);
  if (points.length < 10) return null;

  const isBike = ctx.type === ActivityType.BIKE;
  const hrs = raw.heartrate.filter((h) => h > 0);
  const watts = raw.watts.filter((w) => w > 0);
  const { lthr } = thresholds;
  // Le FTP (vélo) ne s'applique qu'au vélo : la puissance de course est sur une
  // échelle différente et n'est pas comparable au FTP cycliste.
  const ftp = isBike ? thresholds.ftp : null;
  const duration = ctx.durationSec ?? points[points.length - 1].t;
  const avgHr = hrs.length ? mean(hrs) : null;

  const hrZones =
    lthr && hrs.length ? computeZoneTimes(raw.heartrate, raw.time, lthr, HR_ZONE_DEFS) : [];

  // Métriques de puissance : vélo uniquement (NP, VI, IF, TSS, zones).
  const np = isBike && watts.length > 30 ? computeNormalizedPower(raw.watts, raw.time) : null;
  const avgWatts = watts.length ? Math.round(mean(watts)) : null;
  const vi = np && avgWatts && avgWatts > 0 ? Number((np / avgWatts).toFixed(2)) : null;
  const powerIf = np && ftp && ftp > 0 ? Number((np / ftp).toFixed(2)) : null;
  const powerTss =
    np && powerIf && ftp ? Math.round(((duration * np * powerIf) / (ftp * 3600)) * 100) : null;

  const powerZones =
    ftp && watts.length ? computeZoneTimes(raw.watts, raw.time, ftp, POWER_ZONE_DEFS) : [];

  // Charge globale : puissance pour le vélo, sinon TSS basé sur la FC (LTHR).
  let loadTss: number | null = null;
  let loadIf: number | null = null;
  let loadMethod: 'power' | 'hr' | null = null;
  if (powerTss != null && powerIf != null) {
    loadTss = powerTss;
    loadIf = powerIf;
    loadMethod = 'power';
  } else if (avgHr && lthr && lthr > 0) {
    loadIf = Number((avgHr / lthr).toFixed(2));
    loadTss = Math.round((duration / 3600) * loadIf ** 2 * 100);
    loadMethod = 'hr';
  }

  const decouplingMode = ctx.type === ActivityType.BIKE && watts.length > 30 ? 'power' : 'pace';
  const decoupling = lthr && hrs.length ? computeDecoupling(points, decouplingMode) : null;

  let efficiencyFactor: number | null = null;
  let efficiencyLabel = "Facteur d'efficacité";
  if (avgHr) {
    if (isBike && avgWatts) {
      efficiencyFactor = Number((avgWatts / avgHr).toFixed(2));
      efficiencyLabel = 'Efficacité (W/bpm)';
    } else if (ctx.type === ActivityType.RUN) {
      const speeds = raw.velocity.filter((s) => s > 0.5);
      if (speeds.length) {
        efficiencyFactor = Number(((mean(speeds) / avgHr) * 1000).toFixed(2));
        efficiencyLabel = 'Efficacité (m/bpm)';
      }
    }
  }

  const runSplits =
    ctx.type === ActivityType.RUN && raw.distance.length ? computeSplits(points, 1000) : [];
  const bikeSplits =
    ctx.type === ActivityType.BIKE && raw.distance.length ? computeSplits(points, 5000) : [];

  const avgPace =
    ctx.type === ActivityType.RUN && raw.distance.length
      ? (() => {
          const totalD = raw.distance[raw.distance.length - 1];
          const totalT = raw.time[raw.time.length - 1];
          return totalD > 0 ? Math.round((totalT / totalD) * 1000) : null;
        })()
      : null;

  return {
    thresholds,
    load: { tss: loadTss, intensityFactor: loadIf, method: loadMethod },
    hr: {
      zones: hrZones,
      decouplingPct: decoupling,
      efficiencyFactor,
      efficiencyLabel,
      avgHr: hrs.length ? Math.round(mean(hrs)) : null,
      maxHr: hrs.length ? Math.max(...hrs) : null,
    },
    power:
      isBike && watts.length > 30
        ? {
            normalized: np,
            avg: avgWatts,
            variabilityIndex: vi,
            intensityFactor: powerIf,
            tss: powerTss,
            zones: powerZones,
          }
        : null,
    run:
      ctx.type === ActivityType.RUN
        ? {
            splits: runSplits,
            paceVariabilityPct: paceVariability(points),
            avgPaceSecPerKm: avgPace,
          }
        : null,
    bike: ctx.type === ActivityType.BIKE ? { splits: bikeSplits } : null,
  };
}
