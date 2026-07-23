import { ActivityType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Records & courbes de performance — désormais PERSISTÉS en base.
 *
 * Le calcul (PRs depuis les métriques + courbe de puissance/meilleurs temps
 * depuis les streams en cache) est lourd : on le fait une fois puis on stocke le
 * résultat (top 5 par catégorie) dans `PerformanceRecord`. La page lit le
 * stockage (instantané) ; le recalcul est déclenché à chaque mutation d'activité
 * et après les synchros Strava/backfill.
 */

/** Durées de référence pour la courbe de puissance (secondes). */
const POWER_DURATIONS = [5, 15, 30, 60, 120, 300, 600, 1200, 1800, 3600];

/** Distances de référence pour les meilleurs temps de course (mètres). */
const RUN_DISTANCES = [400, 1000, 1609, 5000, 10000, 21097, 42195];

/** Combien d'entrées on garde par record (top 5). */
const TOP_N = 5;

interface RawStreams {
  time: number[];
  distance: number[];
  altitude: number[];
  heartrate: number[];
  watts: number[];
  cadence: number[];
  velocity: number[];
  latlng: [number, number][];
}

export interface RecordEntry {
  rank: number;
  value: number;
  displayValue: string;
  sublabel: string | null;
  activityId: string | null;
  date: string; // ISO
  title: string | null;
}

export interface RecordCategory {
  key: string;
  label: string;
  entries: RecordEntry[]; // triées, meilleur en premier (max 5)
}

export interface PowerCurvePoint {
  seconds: number;
  label: string;
  watts: number;
  activityId: string | null;
  date: string;
  title: string | null;
}

export interface RunBestCategory {
  meters: number;
  label: string;
  entries: RecordEntry[]; // top 5, value = secondes
}

/**
 * Effort issu des métriques d'activité (pas des streams) : distance réelle +
 * temps. Couvre TOUTES les activités, pas seulement celles avec trace GPS.
 * Sert de référence robuste aux prédictions quand les streams manquent.
 */
export interface RunEffort {
  meters: number;
  seconds: number;
}

export interface BikeEffort {
  seconds: number; // durée du ride
  watts: number; // NP si dispo, sinon puissance moyenne
}

export interface RecordsPayload {
  prs: {
    run: RecordCategory[];
    bike: RecordCategory[];
    swim: RecordCategory[];
  };
  powerCurve: PowerCurvePoint[];
  runBests: RunBestCategory[];
  /** Efforts course (distance + temps) depuis les métriques — référence robuste. */
  runEfforts: RunEffort[];
  /** Efforts vélo (durée + puissance) depuis les métriques — référence robuste. */
  bikeEfforts: BikeEffort[];
  streamsAnalyzed: number;
  totalActivities: number;
  generatedAt: string | null;
}

/** Record dont le #1 a changé lors d'un recalcul (nouveau PR ou meilleur effort). */
export interface RecordChange {
  category: string;
  label: string;
  displayValue: string;
  activityId: string | null;
  activityTitle: string | null;
  previousDisplayValue: string | null;
}

// ---------------------------------------------------------------------------
// Formatage
// ---------------------------------------------------------------------------

function durationLabel(sec: number): string {
  if (sec < 60) return `${sec} s`;
  const min = sec / 60;
  return Number.isInteger(min) ? `${min} min` : `${(sec / 60).toFixed(1)} min`;
}

function distanceLabel(m: number): string {
  switch (m) {
    case 1609:
      return '1 mile';
    case 21097:
      return 'Semi';
    case 42195:
      return 'Marathon';
    default:
      return m < 1000 ? `${m} m` : `${m / 1000} km`;
  }
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

function fmtPace100(secPer100m: number): string {
  const m = Math.floor(secPer100m / 60);
  const s = Math.round(secPer100m % 60);
  return `${m}:${String(s).padStart(2, '0')}/100m`;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  const s = Math.round(sec % 60);
  if (m > 0) return `${m}min${s > 0 ? ` ${String(s).padStart(2, '0')}s` : ''}`;
  return `${s}s`;
}

function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

// ---------------------------------------------------------------------------
// Calcul depuis les streams
// ---------------------------------------------------------------------------

function hasSignal(arr: number[]): boolean {
  return arr.length > 0 && arr.some((v) => v != null && v !== 0);
}

/** Ré-échantillonne une série (time, values) à 1 Hz par maintien de la valeur. */
function resample1Hz(time: number[], values: number[]): number[] {
  if (!time.length) return [];
  const maxT = Math.floor(time[time.length - 1]);
  if (maxT <= 0 || maxT > 200_000) return [];
  const grid = new Array<number>(maxT + 1).fill(0);
  let idx = 0;
  for (let s = 0; s <= maxT; s++) {
    while (idx < time.length - 1 && time[idx + 1] <= s) idx++;
    grid[s] = values[idx] ?? 0;
  }
  return grid;
}

/** Meilleure moyenne glissante sur une fenêtre de `window` secondes. */
function bestAverage(grid: number[], window: number): number | null {
  if (grid.length < window || window <= 0) return null;
  let sum = 0;
  for (let i = 0; i < window; i++) sum += grid[i];
  let best = sum;
  for (let i = window; i < grid.length; i++) {
    sum += grid[i] - grid[i - window];
    if (sum > best) best = sum;
  }
  return best / window;
}

/** Temps le plus court (s) pour couvrir `meters` sur une grille distance 1 Hz. */
function fastestTime(distGrid: number[], meters: number): number | null {
  let j = 0;
  let best = Infinity;
  for (let i = 0; i < distGrid.length; i++) {
    if (j < i) j = i;
    while (j < distGrid.length && distGrid[j] - distGrid[i] < meters) j++;
    if (j >= distGrid.length) break;
    const t = j - i;
    if (t < best) best = t;
  }
  return best === Infinity ? null : best;
}

// ---------------------------------------------------------------------------
// PRs (depuis les métriques)
// ---------------------------------------------------------------------------

interface MetricActivity {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  duration: number | null;
  runMetrics: {
    distanceM: number | null;
    paceSecPerKm: number | null;
    elevationM?: number | null;
  } | null;
  bikeMetrics: {
    normalizedPower: number | null;
    avgPower: number | null;
    elevationM?: number | null;
  } | null;
  swimMetrics?: {
    distanceM: number | null;
    avgPaceSecPer100m: number | null;
  } | null;
}

interface Candidate {
  value: number;
  activity: MetricActivity;
}

/** Top N entrées pour un accesseur donné, triées (meilleur en premier). */
function topNEntries(
  activities: MetricActivity[],
  accessor: (a: MetricActivity) => number | null,
  mode: 'max' | 'min',
  format: (v: number) => string,
  sublabel?: (v: number, a: MetricActivity) => string | null,
): RecordEntry[] {
  const cands = activities
    .map((a) => ({ value: accessor(a), activity: a }))
    .filter((c): c is Candidate => c.value != null && !Number.isNaN(c.value) && c.value > 0);
  cands.sort((a, b) => (mode === 'max' ? b.value - a.value : a.value - b.value));
  return cands.slice(0, TOP_N).map((c, i) => ({
    rank: i + 1,
    value: c.value,
    displayValue: format(c.value),
    sublabel: sublabel?.(c.value, c.activity) ?? null,
    activityId: c.activity.id,
    date: c.activity.date.toISOString(),
    title: c.activity.title,
  }));
}

interface PrDef {
  group: 'run' | 'bike' | 'swim';
  key: string;
  label: string;
}

/** Définition (ordre + libellés) de toutes les catégories de PR. */
const PR_DEFS: PrDef[] = [
  { group: 'run', key: 'run-distance', label: 'Plus longue sortie' },
  { group: 'run', key: 'run-elevation', label: 'Plus gros dénivelé' },
  { group: 'run', key: 'run-pace', label: 'Meilleure allure moyenne' },
  { group: 'run', key: 'run-duration', label: 'Plus longue durée de course' },
  { group: 'bike', key: 'bike-np', label: 'Meilleure puissance normalisée' },
  { group: 'bike', key: 'bike-avg-power', label: 'Meilleure puissance moyenne' },
  { group: 'bike', key: 'bike-elevation', label: 'Plus gros dénivelé' },
  { group: 'bike', key: 'bike-duration', label: 'Plus longue durée à vélo' },
  { group: 'swim', key: 'swim-distance', label: 'Plus longue nage' },
  { group: 'swim', key: 'swim-pace', label: 'Meilleure allure /100m' },
  { group: 'swim', key: 'swim-duration', label: 'Plus longue durée de nage' },
];

const DURATION_PR_TYPE: Partial<Record<string, ActivityType>> = {
  'run-duration': ActivityType.RUN,
  'bike-duration': ActivityType.BIKE,
  'swim-duration': ActivityType.SWIM,
};

const DURATION_PR_CATEGORIES = Object.keys(DURATION_PR_TYPE);

/**
 * Detects the pre-fix duration PR bug: same longest session ranked #1 across
 * sports, or a leader whose activity type does not match its category.
 * Pure helper — used by getStoredRecords to trigger a one-shot repair in prod.
 */
export function durationPrLeadersNeedRepair(
  leaders: ReadonlyArray<{
    category: string;
    activityId: string | null;
    label: string;
    activityType?: ActivityType | null;
  }>,
): boolean {
  if (leaders.length === 0) return false;

  // Pre-fix generic label (shared across run/bike/swim).
  if (leaders.some((r) => r.label === 'Plus longue durée')) return true;

  const ids = leaders.map((r) => r.activityId).filter((id): id is string => Boolean(id));
  if (ids.length > 1 && new Set(ids).size < ids.length) return true;

  for (const row of leaders) {
    if (!row.activityId || row.activityType == null) continue;
    const expected = DURATION_PR_TYPE[row.category];
    if (expected && row.activityType !== expected) return true;
  }
  return false;
}

function activitiesForDurationPr(defKey: string, activities: MetricActivity[]): MetricActivity[] {
  const type = DURATION_PR_TYPE[defKey];
  if (!type) return activities;
  return activities.filter((a) => a.type === type);
}

function buildPrCategory(def: PrDef, activities: MetricActivity[]): RecordCategory {
  let entries: RecordEntry[] = [];
  switch (def.key) {
    case 'run-distance':
      entries = topNEntries(activities, (a) => a.runMetrics?.distanceM ?? null, 'max', fmtDistance);
      break;
    case 'run-elevation':
      entries = topNEntries(
        activities,
        (a) => a.runMetrics?.elevationM ?? null,
        'max',
        (v) => `${Math.round(v)} m D+`,
      );
      break;
    case 'run-pace':
      entries = topNEntries(
        activities.filter((a) => (a.runMetrics?.distanceM ?? 0) >= 3000),
        (a) => a.runMetrics?.paceSecPerKm ?? null,
        'min',
        fmtPace,
        (_v, a) => (a.runMetrics?.distanceM ? `sur ${fmtDistance(a.runMetrics.distanceM)}` : null),
      );
      break;
    case 'run-duration':
    case 'bike-duration':
    case 'swim-duration':
      // Duration must be sport-scoped: otherwise the same longest session becomes
      // #1 for run, bike and swim (identical chips on the activity page).
      entries = topNEntries(
        activitiesForDurationPr(def.key, activities),
        (a) => a.duration ?? null,
        'max',
        fmtDuration,
      );
      break;
    case 'bike-np':
      entries = topNEntries(
        activities,
        (a) => a.bikeMetrics?.normalizedPower ?? null,
        'max',
        (v) => `${Math.round(v)} W`,
      );
      break;
    case 'bike-avg-power':
      entries = topNEntries(
        activities,
        (a) => a.bikeMetrics?.avgPower ?? null,
        'max',
        (v) => `${Math.round(v)} W`,
      );
      break;
    case 'bike-elevation':
      entries = topNEntries(
        activities,
        (a) => a.bikeMetrics?.elevationM ?? null,
        'max',
        (v) => `${Math.round(v)} m D+`,
      );
      break;
    case 'swim-distance':
      entries = topNEntries(
        activities,
        (a) => a.swimMetrics?.distanceM ?? null,
        'max',
        fmtDistance,
      );
      break;
    case 'swim-pace':
      entries = topNEntries(
        activities,
        (a) => a.swimMetrics?.avgPaceSecPer100m ?? null,
        'min',
        fmtPace100,
      );
      break;
  }
  return { key: def.key, label: def.label, entries };
}

/** Builds PR categories from in-memory metrics (no DB). Used by compute + unit tests. */
export function buildMetricPrCategories(metrics: MetricActivity[]): {
  run: RecordCategory[];
  bike: RecordCategory[];
  swim: RecordCategory[];
} {
  return {
    run: PR_DEFS.filter((d) => d.group === 'run').map((d) => buildPrCategory(d, metrics)),
    bike: PR_DEFS.filter((d) => d.group === 'bike').map((d) => buildPrCategory(d, metrics)),
    swim: PR_DEFS.filter((d) => d.group === 'swim').map((d) => buildPrCategory(d, metrics)),
  };
}

// ---------------------------------------------------------------------------
// Calcul complet
// ---------------------------------------------------------------------------

interface StreamCandidate {
  value: number;
  id: string;
  date: Date;
  title: string | null;
}

interface StreamActivity {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  stream: { data: unknown } | null;
}

/** Sélection Prisma des activités avec stream exploitable, pour un ou plusieurs types. */
function streamSelect() {
  return {
    id: true,
    type: true,
    date: true,
    title: true,
    stream: { select: { data: true } },
  } as const;
}

/** Courbe de puissance (meilleur effort par durée) à partir des streams vélo. */
function computePowerCurveFrom(streamActivities: StreamActivity[]): PowerCurvePoint[] {
  const powerCand = new Map<number, StreamCandidate[]>();

  for (const a of streamActivities) {
    const raw = a.stream?.data as unknown as RawStreams | null;
    if (!raw || !raw.time?.length) continue;
    if (a.type !== ActivityType.BIKE || !hasSignal(raw.watts ?? [])) continue;

    const grid = resample1Hz(raw.time, raw.watts);
    for (const dur of POWER_DURATIONS) {
      const avg = bestAverage(grid, dur);
      if (avg == null || avg <= 0) continue;
      const list = powerCand.get(dur) ?? [];
      list.push({ value: Math.round(avg), id: a.id, date: a.date, title: a.title });
      powerCand.set(dur, list);
    }
  }

  return POWER_DURATIONS.map((d): PowerCurvePoint | null => {
    const [best] = (powerCand.get(d) ?? []).sort((a, b) => b.value - a.value);
    return best
      ? {
          seconds: d,
          label: durationLabel(d),
          watts: best.value,
          activityId: best.id,
          date: best.date.toISOString(),
          title: best.title,
        }
      : null;
  }).filter((p): p is PowerCurvePoint => p != null);
}

/** Meilleurs temps de course (top 5 par distance) à partir des streams course. */
function computeRunBestsFrom(streamActivities: StreamActivity[]): RunBestCategory[] {
  const runCand = new Map<number, StreamCandidate[]>();

  for (const a of streamActivities) {
    const raw = a.stream?.data as unknown as RawStreams | null;
    if (!raw || !raw.time?.length) continue;
    if (a.type !== ActivityType.RUN || !hasSignal(raw.distance ?? [])) continue;

    const distGrid = resample1Hz(raw.time, raw.distance);
    const total = distGrid.length ? distGrid[distGrid.length - 1] : 0;
    for (const meters of RUN_DISTANCES) {
      if (total < meters) continue;
      const secs = fastestTime(distGrid, meters);
      if (secs == null || secs <= 0) continue;
      const list = runCand.get(meters) ?? [];
      list.push({ value: secs, id: a.id, date: a.date, title: a.title });
      runCand.set(meters, list);
    }
  }

  return RUN_DISTANCES.map((meters): RunBestCategory | null => {
    const arr = (runCand.get(meters) ?? []).sort((a, b) => a.value - b.value).slice(0, TOP_N);
    if (!arr.length) return null;
    return {
      meters,
      label: distanceLabel(meters),
      entries: arr.map((c, i) => ({
        rank: i + 1,
        value: c.value,
        displayValue: fmtTime(c.value),
        sublabel: fmtPace(Math.round((c.value / meters) * 1000)),
        activityId: c.id,
        date: c.date.toISOString(),
        title: c.title,
      })),
    };
  }).filter((r): r is RunBestCategory => r != null);
}

/**
 * Construit les efforts course/vélo depuis les métriques d'activité.
 * Indépendant des streams : couvre tout l'historique. On privilégie la durée
 * réelle (temps de séance) et on retombe sur l'allure Garmin si besoin.
 */
function computeMetricEfforts(metrics: MetricActivity[]): {
  runEfforts: RunEffort[];
  bikeEfforts: BikeEffort[];
} {
  const runEfforts: RunEffort[] = [];
  const bikeEfforts: BikeEffort[] = [];

  for (const a of metrics) {
    if (a.type === ActivityType.RUN) {
      const meters = a.runMetrics?.distanceM ?? null;
      if (!meters || meters < 1500) continue; // bruit en dessous de 1,5 km
      let seconds: number | null = null;
      if (a.duration && a.duration > 0) {
        seconds = a.duration;
      } else if (a.runMetrics?.paceSecPerKm) {
        seconds = (a.runMetrics.paceSecPerKm * meters) / 1000;
      }
      if (seconds && seconds > 0) runEfforts.push({ meters, seconds });
    } else if (a.type === ActivityType.BIKE) {
      const watts = a.bikeMetrics?.normalizedPower ?? a.bikeMetrics?.avgPower ?? null;
      if (!watts || watts <= 0 || !a.duration || a.duration < 1200) continue; // >=20 min
      bikeEfforts.push({ seconds: a.duration, watts });
    }
  }

  return { runEfforts, bikeEfforts };
}

/** Calcule l'intégralité des records (top 5) — sans écrire en base. */
export async function computeRankedRecords(): Promise<RecordsPayload> {
  const [metricActivities, streamActivities, totalActivities, streamsAnalyzed] = await Promise.all([
    prisma.activity.findMany({
      select: {
        id: true,
        type: true,
        date: true,
        title: true,
        duration: true,
        runMetrics: {
          select: { distanceM: true, elevationM: true, paceSecPerKm: true },
        },
        bikeMetrics: {
          select: { normalizedPower: true, avgPower: true, elevationM: true },
        },
        swimMetrics: {
          select: { distanceM: true, avgPaceSecPer100m: true },
        },
      },
    }),
    prisma.activity.findMany({
      where: {
        type: { in: [ActivityType.RUN, ActivityType.BIKE] },
        stream: { available: true },
      },
      select: {
        id: true,
        type: true,
        date: true,
        title: true,
        stream: { select: { data: true } },
      },
    }),
    prisma.activity.count(),
    prisma.activityStream.count({ where: { available: true } }),
  ]);

  const metrics = metricActivities as MetricActivity[];
  const prs = buildMetricPrCategories(metrics);

  const streams = streamActivities as StreamActivity[];
  const powerCurve = computePowerCurveFrom(streams);
  const runBests = computeRunBestsFrom(streams);
  const { runEfforts, bikeEfforts } = computeMetricEfforts(metrics);

  return {
    prs,
    powerCurve,
    runBests,
    runEfforts,
    bikeEfforts,
    streamsAnalyzed,
    totalActivities,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Persistance
// ---------------------------------------------------------------------------

/** Groupes de records persistés (= colonne `group` en base). */
export type RecordGroup =
  'run' | 'bike' | 'swim' | 'power' | 'run-best' | 'run-effort' | 'bike-effort';

const METRIC_GROUPS: ReadonlyArray<RecordGroup> = ['run', 'bike', 'swim'];
const EFFORT_GROUPS: ReadonlyArray<RecordGroup> = ['run-effort', 'bike-effort'];

/** Groupes de records impactés par une activité d'un type donné. */
function groupsForType(type: ActivityType): RecordGroup[] {
  switch (type) {
    case ActivityType.RUN:
      return ['run', 'run-best', 'run-effort'];
    case ActivityType.BIKE:
      return ['bike', 'power', 'bike-effort'];
    case ActivityType.SWIM:
      return ['swim'];
    default:
      return []; // STRENGTH : aucun record
  }
}

type RecordRow = Prisma.PerformanceRecordCreateManyInput;

function categoryToRows(group: RecordGroup, cat: RecordCategory): RecordRow[] {
  return cat.entries.map((e) => ({
    group,
    category: cat.key,
    label: cat.label,
    rank: e.rank,
    value: e.value,
    displayValue: e.displayValue,
    sublabel: e.sublabel,
    activityId: e.activityId,
    activityDate: new Date(e.date),
    activityTitle: e.title,
  }));
}

function powerCurveToRows(points: PowerCurvePoint[]): RecordRow[] {
  return points.map((p) => ({
    group: 'power',
    category: `power-${p.seconds}`,
    label: p.label,
    rank: 1,
    value: p.watts,
    displayValue: `${p.watts} W`,
    sublabel: null,
    activityId: p.activityId,
    activityDate: new Date(p.date),
    activityTitle: p.title,
  }));
}

function runBestsToRows(bests: RunBestCategory[]): RecordRow[] {
  return bests.flatMap((rb) =>
    rb.entries.map((e) => ({
      group: 'run-best' as const,
      category: `run-best-${rb.meters}`,
      label: rb.label,
      rank: e.rank,
      value: e.value,
      displayValue: e.displayValue,
      sublabel: e.sublabel,
      activityId: e.activityId,
      activityDate: new Date(e.date),
      activityTitle: e.title,
    })),
  );
}

/** Persist scatter-reference efforts (no activity join on GET). */
function effortsToRows(runEfforts: RunEffort[], bikeEfforts: BikeEffort[]): RecordRow[] {
  const now = new Date();
  return [
    ...runEfforts.map((e, index) => ({
      group: 'run-effort' as const,
      category: `run-effort-${index}`,
      label: 'Run effort',
      rank: 1,
      value: e.meters,
      displayValue: String(e.seconds),
      sublabel: null,
      activityId: null,
      activityDate: now,
      activityTitle: null,
    })),
    ...bikeEfforts.map((e, index) => ({
      group: 'bike-effort' as const,
      category: `bike-effort-${index}`,
      label: 'Bike effort',
      rank: 1,
      value: e.watts,
      displayValue: String(e.seconds),
      sublabel: null,
      activityId: null,
      activityDate: now,
      activityTitle: null,
    })),
  ];
}

function effortsFromRows(rows: Array<{ group: string; value: number; displayValue: string }>): {
  runEfforts: RunEffort[];
  bikeEfforts: BikeEffort[];
} {
  const runEfforts: RunEffort[] = [];
  const bikeEfforts: BikeEffort[] = [];
  for (const row of rows) {
    if (row.group === 'run-effort') {
      const seconds = Number(row.displayValue);
      if (Number.isFinite(seconds) && seconds > 0) {
        runEfforts.push({ meters: row.value, seconds });
      }
    } else if (row.group === 'bike-effort') {
      const seconds = Number(row.displayValue);
      if (Number.isFinite(seconds) && seconds > 0 && row.value > 0) {
        bikeEfforts.push({ seconds, watts: row.value });
      }
    }
  }
  return { runEfforts, bikeEfforts };
}

async function loadMetricActivities(): Promise<MetricActivity[]> {
  const rows = await prisma.activity.findMany({
    select: {
      id: true,
      type: true,
      date: true,
      title: true,
      duration: true,
      runMetrics: {
        select: { distanceM: true, elevationM: true, paceSecPerKm: true },
      },
      bikeMetrics: {
        select: { normalizedPower: true, avgPower: true, elevationM: true },
      },
      swimMetrics: {
        select: { distanceM: true, avgPaceSecPer100m: true },
      },
    },
  });
  return rows as MetricActivity[];
}

/** Lignes des catégories de PR (métriques) pour un groupe donné. */
function metricRowsForGroup(
  group: 'run' | 'bike' | 'swim',
  metrics: MetricActivity[],
): RecordRow[] {
  return PR_DEFS.filter((d) => d.group === group).flatMap((def) =>
    categoryToRows(group, buildPrCategory(def, metrics)),
  );
}

/** Construit les lignes pour les groupes demandés (chargement ciblé). */
async function buildRowsForGroups(groups: Set<RecordGroup>): Promise<RecordRow[]> {
  const rows: RecordRow[] = [];

  const metricGroups = [...groups].filter((g): g is 'run' | 'bike' | 'swim' =>
    METRIC_GROUPS.includes(g),
  );
  const needsEfforts = EFFORT_GROUPS.some((g) => groups.has(g));
  const metrics = metricGroups.length > 0 || needsEfforts ? await loadMetricActivities() : null;

  if (metrics && metricGroups.length) {
    for (const g of metricGroups) rows.push(...metricRowsForGroup(g, metrics));
  }

  if (metrics && needsEfforts) {
    const { runEfforts, bikeEfforts } = computeMetricEfforts(metrics);
    if (groups.has('run-effort')) {
      rows.push(...effortsToRows(runEfforts, []).filter((r) => r.group === 'run-effort'));
    }
    if (groups.has('bike-effort')) {
      rows.push(...effortsToRows([], bikeEfforts).filter((r) => r.group === 'bike-effort'));
    }
  }

  if (groups.has('power')) {
    const bikeStreams = (await prisma.activity.findMany({
      where: { type: ActivityType.BIKE, stream: { available: true } },
      select: streamSelect(),
    })) as StreamActivity[];
    rows.push(...powerCurveToRows(computePowerCurveFrom(bikeStreams)));
  }

  if (groups.has('run-best')) {
    const runStreams = (await prisma.activity.findMany({
      where: { type: ActivityType.RUN, stream: { available: true } },
      select: streamSelect(),
    })) as StreamActivity[];
    rows.push(...runBestsToRows(computeRunBestsFrom(runStreams)));
  }

  return rows;
}

/** Compare les anciens et nouveaux leaders (#1) par catégorie. */
function diffRecordChanges(
  beforeLeaders: Map<string, { activityId: string | null; value: number; displayValue: string }>,
  afterRows: RecordRow[],
): RecordChange[] {
  const afterLeaders = new Map<string, RecordRow>();
  for (const row of afterRows) {
    if (row.rank === 1) afterLeaders.set(row.category, row);
  }

  const changes: RecordChange[] = [];
  for (const [category, row] of afterLeaders) {
    const prev = beforeLeaders.get(category);
    const leaderChanged = !prev || prev.activityId !== row.activityId || prev.value !== row.value;

    if (leaderChanged) {
      changes.push({
        category,
        label: row.label,
        displayValue: row.displayValue,
        activityId: row.activityId ?? null,
        activityTitle: row.activityTitle ?? null,
        previousDisplayValue: prev?.displayValue ?? null,
      });
    }
  }
  return changes;
}

/** Ne garde que les records battus par les activités du lot (sync / backfill). */
export function filterRecordChangesByActivities(
  changes: RecordChange[],
  activityIds: Iterable<string>,
): RecordChange[] {
  const ids = new Set(activityIds);
  return changes.filter((c) => c.activityId != null && ids.has(c.activityId));
}

/** Records personnels (#1) détenus par une séance. */
export async function getPerformanceRecordsForActivity(activityId: string) {
  return prisma.performanceRecord.findMany({
    where: { activityId, rank: 1 },
    orderBy: { label: 'asc' },
    select: {
      category: true,
      label: true,
    },
  });
}

export type RecordSportTab = 'run' | 'bike' | 'swim';

export const RECORDS_PAGE_PATH = '/training/progression';

/** Identifiant d'ancre DOM pour une catégorie de record (ex. `swim-distance`). */
export function recordCategoryAnchorId(category: string): string {
  return category;
}

/** Onglet sport de la page Progression pour une catégorie de record. */
export function recordSportTabFromCategory(category: string): RecordSportTab | null {
  if (category.startsWith('swim-')) return 'swim';
  if (category.startsWith('bike-') || category.startsWith('power-')) return 'bike';
  if (category.startsWith('run-') || category.startsWith('run-best')) return 'run';
  return null;
}

/** Lien vers la catégorie sur la page des records (onglet Progression + sport + ancre). */
export function recordCategoryHref(category: string): string {
  const sport = recordSportTabFromCategory(category);
  const sportQuery = sport ? `&sport=${sport}` : '';
  return `${RECORDS_PAGE_PATH}?tab=records${sportQuery}#${recordCategoryAnchorId(category)}`;
}

/** Recalcule uniquement les `groups` ciblés et remplace ces lignes en base. */
export async function recomputeRecordGroups(groups: Set<RecordGroup>): Promise<RecordChange[]> {
  if (groups.size === 0) return [];
  const affected = [...groups];

  const beforeRows = await prisma.performanceRecord.findMany({
    where: { group: { in: affected }, rank: 1 },
  });
  const beforeLeaders = new Map(
    beforeRows.map((r) => [
      r.category,
      { activityId: r.activityId, value: r.value, displayValue: r.displayValue },
    ]),
  );

  const rows = await buildRowsForGroups(groups);

  await prisma.$transaction([
    prisma.performanceRecord.deleteMany({ where: { group: { in: affected } } }),
    ...(rows.length ? [prisma.performanceRecord.createMany({ data: rows })] : []),
  ]);

  return diffRecordChanges(beforeLeaders, rows);
}

/** Recalcule tous les records et remplace le contenu de la table. */
export async function recomputeAndStoreRecords(): Promise<RecordsPayload> {
  const payload = await computeRankedRecords();
  const rows: RecordRow[] = [
    ...payload.prs.run.flatMap((c) => categoryToRows('run', c)),
    ...payload.prs.bike.flatMap((c) => categoryToRows('bike', c)),
    ...payload.prs.swim.flatMap((c) => categoryToRows('swim', c)),
    ...powerCurveToRows(payload.powerCurve),
    ...runBestsToRows(payload.runBests),
    ...effortsToRows(payload.runEfforts, payload.bikeEfforts),
  ];

  await prisma.$transaction([
    prisma.performanceRecord.deleteMany({}),
    ...(rows.length ? [prisma.performanceRecord.createMany({ data: rows })] : []),
  ]);

  return payload;
}

/** Recalcule incrémentalement les records impactés par des activités de ces types. */
export async function updateRecordsForTypes(
  types: Iterable<ActivityType>,
): Promise<RecordChange[]> {
  const groups = new Set<RecordGroup>();
  for (const t of types) for (const g of groupsForType(t)) groups.add(g);
  return recomputeRecordGroups(groups);
}

/** Variante sans throw pour les types donnés (à appeler depuis les mutations). */
export async function updateRecordsForTypesSafe(
  types: Iterable<ActivityType>,
): Promise<RecordChange[]> {
  try {
    return await updateRecordsForTypes(types);
  } catch (error) {
    console.error('[records] update', error);
    return [];
  }
}

/** Recalcul complet sans jamais throw (premier remplissage). */
export async function recomputeRecordsSafe(): Promise<void> {
  try {
    await recomputeAndStoreRecords();
  } catch (error) {
    console.error('[records] recompute', error);
  }
}

/**
 * Recalcule uniquement les groupes impactés après une sync cron/manuelle.
 * Évite de relire tous les streams JSON à chaque exécution (principal poste réseau).
 */
export async function updateRecordsAfterProviderSync(input: {
  importedTypes: Iterable<ActivityType>;
  backfilledActivityIds?: Iterable<string>;
}): Promise<void> {
  try {
    const recordCount = await prisma.performanceRecord.count();
    if (recordCount === 0) {
      await recomputeAndStoreRecords();
      return;
    }

    const groups = new Set<RecordGroup>();
    for (const t of input.importedTypes) {
      for (const g of groupsForType(t)) groups.add(g);
    }

    const backfillIds = [...(input.backfilledActivityIds ?? [])];
    if (backfillIds.length > 0) {
      const activities = await prisma.activity.findMany({
        where: { id: { in: backfillIds } },
        select: { type: true },
      });
      for (const a of activities) {
        for (const g of groupsForType(a.type)) groups.add(g);
      }
    }

    if (groups.size > 0) {
      await recomputeRecordGroups(groups);
    }
  } catch (error) {
    console.error('[records] updateAfterSync', error);
  }
}

function emptyPayload(totalActivities = 0, streamsAnalyzed = 0): RecordsPayload {
  return {
    prs: {
      run: PR_DEFS.filter((d) => d.group === 'run').map((d) => ({
        key: d.key,
        label: d.label,
        entries: [],
      })),
      bike: PR_DEFS.filter((d) => d.group === 'bike').map((d) => ({
        key: d.key,
        label: d.label,
        entries: [],
      })),
      swim: PR_DEFS.filter((d) => d.group === 'swim').map((d) => ({
        key: d.key,
        label: d.label,
        entries: [],
      })),
    },
    powerCurve: [],
    runBests: [],
    runEfforts: [],
    bikeEfforts: [],
    streamsAnalyzed,
    totalActivities,
    generatedAt: null,
  };
}

/** Lit les records stockés et les remet en forme pour le client. */
export async function getStoredRecords(): Promise<RecordsPayload> {
  let rows = await prisma.performanceRecord.findMany({
    orderBy: [{ category: 'asc' }, { rank: 'asc' }],
  });
  const [totalActivities, streamsAnalyzed] = await Promise.all([
    prisma.activity.count(),
    prisma.activityStream.count({ where: { available: true } }),
  ]);

  // Premier accès (rien de stocké) : on calcule à la volée puis on stocke.
  if (rows.length === 0) {
    if (totalActivities > 0) return recomputeAndStoreRecords();
    return emptyPayload(totalActivities, streamsAnalyzed);
  }

  // One-shot repair: duration PRs computed before sport-scoping (same longest
  // session as #1 for run/bike/swim). Recompute metric groups then re-read.
  const durationLeaders = rows.filter(
    (r) => DURATION_PR_CATEGORIES.includes(r.category) && r.rank === 1,
  );
  if (durationLeaders.length > 0) {
    const activityIds = [
      ...new Set(
        durationLeaders.map((r) => r.activityId).filter((id): id is string => Boolean(id)),
      ),
    ];
    const activities =
      activityIds.length > 0
        ? await prisma.activity.findMany({
            where: { id: { in: activityIds } },
            select: { id: true, type: true },
          })
        : [];
    const typeById = new Map(activities.map((a) => [a.id, a.type]));
    if (
      durationPrLeadersNeedRepair(
        durationLeaders.map((r) => ({
          category: r.category,
          activityId: r.activityId,
          label: r.label,
          activityType: r.activityId ? (typeById.get(r.activityId) ?? null) : null,
        })),
      )
    ) {
      await recomputeRecordGroups(new Set(METRIC_GROUPS));
      rows = await prisma.performanceRecord.findMany({
        orderBy: [{ category: 'asc' }, { rank: 'asc' }],
      });
    }
  }

  // Legacy rows without persisted efforts: one-time backfill, then read-only path.
  const hasEffortRows = rows.some((r) => r.group === 'run-effort' || r.group === 'bike-effort');
  let runEfforts: RunEffort[] = [];
  let bikeEfforts: BikeEffort[] = [];
  if (hasEffortRows) {
    ({ runEfforts, bikeEfforts } = effortsFromRows(rows));
  } else if (totalActivities > 0) {
    await recomputeRecordGroups(new Set(['run-effort', 'bike-effort']));
    const effortRows = await prisma.performanceRecord.findMany({
      where: { group: { in: ['run-effort', 'bike-effort'] } },
    });
    ({ runEfforts, bikeEfforts } = effortsFromRows(effortRows));
  }

  const byCategory = new Map<string, typeof rows>();
  for (const row of rows) {
    if (row.group === 'run-effort' || row.group === 'bike-effort') continue;
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  const toEntries = (list: typeof rows): RecordEntry[] =>
    list
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({
        rank: r.rank,
        value: r.value,
        displayValue: r.displayValue,
        sublabel: r.sublabel,
        activityId: r.activityId,
        date: r.activityDate.toISOString(),
        title: r.activityTitle,
      }));

  const prCategory = (def: PrDef): RecordCategory => ({
    key: def.key,
    label: def.label,
    entries: toEntries(byCategory.get(def.key) ?? []),
  });

  const prs = {
    run: PR_DEFS.filter((d) => d.group === 'run').map(prCategory),
    bike: PR_DEFS.filter((d) => d.group === 'bike').map(prCategory),
    swim: PR_DEFS.filter((d) => d.group === 'swim').map(prCategory),
  };

  const powerCurve: PowerCurvePoint[] = rows
    .filter((r) => r.group === 'power')
    .map((r) => {
      const seconds = Number(r.category.replace('power-', ''));
      return {
        seconds,
        label: r.label,
        watts: r.value,
        activityId: r.activityId,
        date: r.activityDate.toISOString(),
        title: r.activityTitle,
      };
    })
    .sort((a, b) => a.seconds - b.seconds);

  const runBestMap = new Map<number, typeof rows>();
  for (const r of rows.filter((x) => x.group === 'run-best')) {
    const meters = Number(r.category.replace('run-best-', ''));
    const list = runBestMap.get(meters) ?? [];
    list.push(r);
    runBestMap.set(meters, list);
  }
  const runBests: RunBestCategory[] = [...runBestMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([meters, list]) => ({
      meters,
      label: list[0].label,
      entries: toEntries(list),
    }));

  const generatedAt = rows.reduce<Date | null>((acc, r) => {
    return !acc || r.createdAt > acc ? r.createdAt : acc;
  }, null);

  return {
    prs,
    powerCurve,
    runBests,
    runEfforts,
    bikeEfforts,
    streamsAnalyzed,
    totalActivities,
    generatedAt: generatedAt ? generatedAt.toISOString() : null,
  };
}
