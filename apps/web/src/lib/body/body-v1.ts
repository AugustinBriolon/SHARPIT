/**
 * Corps (native, ADR-040): every body metric the app shows, read in one pass and
 * projected without React view models. Pure — the loaders live in `body-v1-data.ts`.
 */

export const BODY_METRIC_KEYS = [
  'weight',
  'bodyFatPct',
  'leanMassKg',
  'musclePct',
  'waterPct',
  'boneKg',
  'bmi',
  'visceralFat',
  'bmr',
  'bodyAgeScale',
  'vascularAge',
  'hrv',
  'restingHr',
  'vo2maxRun',
  'vo2maxBike',
  'ftp',
  'maxHr',
  'lthr',
  'runThresholdPace',
  'swimCss',
] as const;

export type BodyMetricKey = (typeof BODY_METRIC_KEYS)[number];

export const BODY_METRIC_UNITS: Record<BodyMetricKey, string> = {
  weight: 'kg',
  bodyFatPct: '%',
  leanMassKg: 'kg',
  musclePct: '%',
  waterPct: '%',
  boneKg: 'kg',
  bmi: 'kg/m²',
  visceralFat: 'index',
  bmr: 'kcal',
  bodyAgeScale: 'years',
  vascularAge: 'years',
  hrv: 'ms',
  restingHr: 'bpm',
  vo2maxRun: 'ml/kg/min',
  vo2maxBike: 'ml/kg/min',
  ftp: 'W',
  maxHr: 'bpm',
  lthr: 'bpm',
  runThresholdPace: 's/km',
  swimCss: 's/100m',
};

export const BODY_SERIES_RANGES = { '30d': 30, '90d': 90, '1y': 365, all: null } as const;
export type BodySeriesRange = keyof typeof BODY_SERIES_RANGES;

export function isBodyMetricKey(value: string | null): value is BodyMetricKey {
  return value !== null && (BODY_METRIC_KEYS as readonly string[]).includes(value);
}

export function isBodySeriesRange(value: string | null): value is BodySeriesRange {
  return value !== null && Object.hasOwn(BODY_SERIES_RANGES, value);
}

// ---- Inputs -------------------------------------------------------------------------

export type CompositionRow = {
  measuredAt: Date;
  source: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  fatFreeWeightKg: number | null;
  musclePct: number | null;
  waterPct: number | null;
  boneKg: number | null;
  bmi: number | null;
  visceralFat: number | null;
  bmr: number | null;
  bodyAge: number | null;
  vascularAgeYears: number | null;
};

export type DailyRow = {
  date: Date;
  hrv: number | null;
  restingHr: number | null;
  hrvBaselineLow: number | null;
  hrvBaselineHigh: number | null;
  weightKg: number | null;
};

export type ProfileThresholds = {
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
  ftpW: number | null;
  maxHr: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  swimCssSecPer100m: number | null;
  thresholdsSyncedAt: Date | null;
  updatedAt: Date;
};

export type ThresholdSnapshotRow = {
  createdAt: Date;
  source: string;
  ftpW: number | null;
  lthr: number | null;
  runThresholdPaceSecPerKm: number | null;
  swimCssSecPer100m: number | null;
};

export type BodyInputs = {
  /** Deduplicated per day, any order. */
  composition: CompositionRow[];
  /** Any order. */
  daily: DailyRow[];
  /** Who fills DailyHealth HRV / resting HR for this athlete. */
  dailySource: 'garmin' | 'apple_health';
  profile: ProfileThresholds | null;
  /** Any order. */
  snapshots: ThresholdSnapshotRow[];
};

// ---- Outputs ------------------------------------------------------------------------

export type V1BodyMetric = {
  key: BodyMetricKey;
  value: number;
  unit: string;
  previous?: number;
  deltaWindowDays?: number;
  baseline?: { low: number; high: number } | null;
  measuredAt: string;
  source: string;
};

export type V1BodyOverview = {
  apiVersion: 1;
  metrics: V1BodyMetric[];
  /** Web-owned estimate, not computed yet (method ADR pending). */
  biologicalAge: null;
};

export type V1BodySeries = {
  apiVersion: 1;
  metric: BodyMetricKey;
  unit: string;
  range: BodySeriesRange;
  points: Array<{ date: string; value: number }>;
  baseline?: Array<{ date: string; low: number; high: number }>;
};

// ---- Helpers ------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPOSITION_DELTA_DAYS = 7;
const THRESHOLD_DELTA_DAYS = 30;

type CompositionKey = Extract<
  BodyMetricKey,
  | 'weight'
  | 'bodyFatPct'
  | 'leanMassKg'
  | 'musclePct'
  | 'waterPct'
  | 'boneKg'
  | 'bmi'
  | 'visceralFat'
  | 'bmr'
  | 'bodyAgeScale'
  | 'vascularAge'
>;

const COMPOSITION_FIELDS: Record<CompositionKey, keyof CompositionRow> = {
  weight: 'weightKg',
  bodyFatPct: 'bodyFatPct',
  leanMassKg: 'fatFreeWeightKg',
  musclePct: 'musclePct',
  waterPct: 'waterPct',
  boneKg: 'boneKg',
  bmi: 'bmi',
  visceralFat: 'visceralFat',
  bmr: 'bmr',
  bodyAgeScale: 'bodyAge',
  vascularAge: 'vascularAgeYears',
};

type SnapshotKey = Extract<BodyMetricKey, 'ftp' | 'lthr' | 'runThresholdPace' | 'swimCss'>;

const SNAPSHOT_FIELDS: Record<SnapshotKey, keyof ThresholdSnapshotRow & keyof ProfileThresholds> = {
  ftp: 'ftpW',
  lthr: 'lthr',
  runThresholdPace: 'runThresholdPaceSecPerKm',
  swimCss: 'swimCssSecPer100m',
};

type ProfileOnlyKey = Extract<BodyMetricKey, 'vo2maxRun' | 'vo2maxBike' | 'maxHr'>;

const PROFILE_FIELDS: Record<ProfileOnlyKey, keyof ProfileThresholds> = {
  vo2maxRun: 'vo2maxRunning',
  vo2maxBike: 'vo2maxCycling',
  maxHr: 'maxHr',
};

function isCompositionKey(key: BodyMetricKey): key is CompositionKey {
  return Object.hasOwn(COMPOSITION_FIELDS, key);
}

function isSnapshotKey(key: BodyMetricKey): key is SnapshotKey {
  return Object.hasOwn(SNAPSHOT_FIELDS, key);
}

function isProfileOnlyKey(key: BodyMetricKey): key is ProfileOnlyKey {
  return Object.hasOwn(PROFILE_FIELDS, key);
}

function dayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function newestFirst<T>(rows: T[], at: (row: T) => Date): T[] {
  return [...rows].sort((a, b) => at(b).getTime() - at(a).getTime());
}

function withPrevious(
  metric: V1BodyMetric,
  previous: number | null,
  windowDays: number,
): V1BodyMetric {
  return previous === null ? metric : { ...metric, previous, deltaWindowDays: windowDays };
}

// ---- Overview -----------------------------------------------------------------------

function compositionMetric(key: CompositionKey, rows: CompositionRow[]): V1BodyMetric | null {
  const field = COMPOSITION_FIELDS[key];
  const withValue = rows.filter((row) => asNumber(row[field]) !== null);
  const [latest] = withValue;
  if (!latest) {
    return null;
  }
  const cutoff = latest.measuredAt.getTime() - COMPOSITION_DELTA_DAYS * DAY_MS;
  const before = withValue.find((row) => row.measuredAt.getTime() <= cutoff);
  return withPrevious(
    {
      key,
      value: round(asNumber(latest[field])!),
      unit: BODY_METRIC_UNITS[key],
      measuredAt: latest.measuredAt.toISOString(),
      source: latest.source.toLowerCase(),
    },
    before ? round(asNumber(before[field])!) : null,
    COMPOSITION_DELTA_DAYS,
  );
}

/** Weight from the athlete's watch / Apple Health when no scale ever reported one. */
function dailyWeightMetric(daily: DailyRow[], source: string): V1BodyMetric | null {
  const withValue = daily.filter((row) => row.weightKg !== null);
  const [latest] = withValue;
  if (!latest) {
    return null;
  }
  const cutoff = latest.date.getTime() - COMPOSITION_DELTA_DAYS * DAY_MS;
  const before = withValue.find((row) => row.date.getTime() <= cutoff);
  return withPrevious(
    {
      key: 'weight',
      value: round(latest.weightKg!),
      unit: BODY_METRIC_UNITS.weight,
      measuredAt: latest.date.toISOString(),
      source,
    },
    before ? round(before.weightKg!) : null,
    COMPOSITION_DELTA_DAYS,
  );
}

function meanOver(
  daily: DailyRow[],
  field: 'hrv' | 'restingHr',
  endMs: number,
  days: number,
): number | null {
  const startMs = endMs - (days - 1) * DAY_MS;
  const values = daily
    .filter((row) => row.date.getTime() <= endMs && row.date.getTime() >= startMs)
    .map((row) => row[field])
    .filter((value): value is number => value !== null);
  const average = mean(values);
  return average === null ? null : round(average);
}

/** HRV: 7-day mean against the previous 7 days, Garmin's balanced band as baseline. */
function hrvMetric(daily: DailyRow[], source: string): V1BodyMetric | null {
  const latest = daily.find((row) => row.hrv !== null);
  if (!latest) {
    return null;
  }
  const endMs = latest.date.getTime();
  const value = meanOver(daily, 'hrv', endMs, 7);
  if (value === null) {
    return null;
  }
  const band = daily.find(
    (row) =>
      row.date.getTime() <= endMs && row.hrvBaselineLow !== null && row.hrvBaselineHigh !== null,
  );
  return withPrevious(
    {
      key: 'hrv',
      value,
      unit: BODY_METRIC_UNITS.hrv,
      baseline: band ? { low: band.hrvBaselineLow!, high: band.hrvBaselineHigh! } : null,
      measuredAt: latest.date.toISOString(),
      source,
    },
    meanOver(daily, 'hrv', endMs - 7 * DAY_MS, 7),
    7,
  );
}

/** Resting HR: 7-day mean against the 30-day mean. */
function restingHrMetric(daily: DailyRow[], source: string): V1BodyMetric | null {
  const latest = daily.find((row) => row.restingHr !== null);
  if (!latest) {
    return null;
  }
  const endMs = latest.date.getTime();
  const value = meanOver(daily, 'restingHr', endMs, 7);
  if (value === null) {
    return null;
  }
  return withPrevious(
    {
      key: 'restingHr',
      value,
      unit: BODY_METRIC_UNITS.restingHr,
      measuredAt: latest.date.toISOString(),
      source,
    },
    meanOver(daily, 'restingHr', endMs, 30),
    30,
  );
}

function thresholdsSource(profile: ProfileThresholds): string {
  return profile.thresholdsSyncedAt ? 'garmin' : 'profile';
}

function thresholdsMeasuredAt(profile: ProfileThresholds): Date {
  return profile.thresholdsSyncedAt ?? profile.updatedAt;
}

/** When the current threshold value was set: its snapshot, else the last Garmin import. */
function snapshotAnchor(
  field: keyof ThresholdSnapshotRow & keyof ProfileThresholds,
  profile: ProfileThresholds,
  withValue: ThresholdSnapshotRow[],
  current: number,
): { measuredAt: Date; source: string } {
  const latest = withValue.find((row) => asNumber(row[field]) === current);
  return latest
    ? { measuredAt: latest.createdAt, source: latest.source }
    : { measuredAt: thresholdsMeasuredAt(profile), source: thresholdsSource(profile) };
}

function snapshotMetric(
  key: SnapshotKey,
  profile: ProfileThresholds | null,
  snapshots: ThresholdSnapshotRow[],
): V1BodyMetric | null {
  const field = SNAPSHOT_FIELDS[key];
  const current = profile ? asNumber(profile[field]) : null;
  if (!profile || current === null) {
    return null;
  }
  const withValue = snapshots.filter((row) => asNumber(row[field]) !== null);
  const { measuredAt, source } = snapshotAnchor(field, profile, withValue, current);
  const cutoff = measuredAt.getTime() - THRESHOLD_DELTA_DAYS * DAY_MS;
  const before = withValue.find((row) => row.createdAt.getTime() <= cutoff);
  return withPrevious(
    {
      key,
      value: round(current),
      unit: BODY_METRIC_UNITS[key],
      measuredAt: measuredAt.toISOString(),
      source,
    },
    before ? round(asNumber(before[field])!) : null,
    THRESHOLD_DELTA_DAYS,
  );
}

function profileMetric(
  key: ProfileOnlyKey,
  profile: ProfileThresholds | null,
): V1BodyMetric | null {
  const value = profile ? asNumber(profile[PROFILE_FIELDS[key]]) : null;
  if (!profile || value === null) {
    return null;
  }
  return {
    key,
    value: round(value),
    unit: BODY_METRIC_UNITS[key],
    measuredAt: thresholdsMeasuredAt(profile).toISOString(),
    source: thresholdsSource(profile),
  };
}

function overviewMetric(key: BodyMetricKey, inputs: BodyInputs): V1BodyMetric | null {
  if (key === 'weight') {
    return (
      compositionMetric('weight', inputs.composition) ??
      dailyWeightMetric(inputs.daily, inputs.dailySource)
    );
  }
  if (isCompositionKey(key)) {
    return compositionMetric(key, inputs.composition);
  }
  if (key === 'hrv') {
    return hrvMetric(inputs.daily, inputs.dailySource);
  }
  if (key === 'restingHr') {
    return restingHrMetric(inputs.daily, inputs.dailySource);
  }
  if (isSnapshotKey(key)) {
    return snapshotMetric(key, inputs.profile, inputs.snapshots);
  }
  return isProfileOnlyKey(key) ? profileMetric(key, inputs.profile) : null;
}

function sortInputs(inputs: BodyInputs): BodyInputs {
  return {
    ...inputs,
    composition: newestFirst(inputs.composition, (row) => row.measuredAt),
    daily: newestFirst(inputs.daily, (row) => row.date),
    snapshots: newestFirst(inputs.snapshots, (row) => row.createdAt),
  };
}

/** Every metric with data, in the app's display order; the rest is absent. */
export function projectV1BodyOverview(inputs: BodyInputs): V1BodyOverview {
  const sorted = sortInputs(inputs);
  const metrics = BODY_METRIC_KEYS.map((key) => overviewMetric(key, sorted)).filter(
    (metric): metric is V1BodyMetric => metric !== null,
  );
  return { apiVersion: 1, metrics, biologicalAge: null };
}

// ---- Series -------------------------------------------------------------------------

type SeriesPoints = Pick<V1BodySeries, 'points' | 'baseline'>;

function compositionPoints(key: CompositionKey, rows: CompositionRow[]): SeriesPoints {
  const field = COMPOSITION_FIELDS[key];
  return {
    points: rows
      .filter((row) => asNumber(row[field]) !== null)
      .map((row) => ({ date: dayString(row.measuredAt), value: round(asNumber(row[field])!) })),
  };
}

function dailyPoints(daily: DailyRow[], field: 'hrv' | 'restingHr' | 'weightKg'): SeriesPoints {
  return {
    points: daily
      .filter((row) => row[field] !== null)
      .map((row) => ({ date: dayString(row.date), value: round(row[field]!) })),
  };
}

function hrvPoints(daily: DailyRow[]): SeriesPoints {
  return {
    ...dailyPoints(daily, 'hrv'),
    baseline: daily
      .filter((row) => row.hrvBaselineLow !== null && row.hrvBaselineHigh !== null)
      .map((row) => ({
        date: dayString(row.date),
        low: row.hrvBaselineLow!,
        high: row.hrvBaselineHigh!,
      })),
  };
}

function snapshotPoints(
  key: SnapshotKey,
  profile: ProfileThresholds | null,
  snapshots: ThresholdSnapshotRow[],
): SeriesPoints {
  const field = SNAPSHOT_FIELDS[key];
  const points = snapshots
    .filter((row) => asNumber(row[field]) !== null)
    .map((row) => ({ date: dayString(row.createdAt), value: round(asNumber(row[field])!) }));
  if (points.length > 0) {
    return { points };
  }
  const current = profile ? asNumber(profile[field]) : null;
  return {
    points:
      profile && current !== null
        ? [{ date: dayString(thresholdsMeasuredAt(profile)), value: round(current) }]
        : [],
  };
}

/** Daily readings (HRV, resting HR) and the profile-only metrics. */
function dailyOrProfilePoints(key: BodyMetricKey, inputs: BodyInputs): SeriesPoints {
  if (key === 'hrv') {
    return hrvPoints(inputs.daily);
  }
  if (key === 'restingHr') {
    return dailyPoints(inputs.daily, 'restingHr');
  }
  // No history is kept for VO₂max / max HR: the current value is the only point.
  const current = isProfileOnlyKey(key) ? profileMetric(key, inputs.profile) : null;
  return {
    points: current ? [{ date: current.measuredAt.slice(0, 10), value: current.value }] : [],
  };
}

function seriesPoints(key: BodyMetricKey, inputs: BodyInputs): SeriesPoints {
  if (key === 'weight') {
    const scale = compositionPoints('weight', inputs.composition);
    return scale.points.length > 0 ? scale : dailyPoints(inputs.daily, 'weightKg');
  }
  if (isCompositionKey(key)) {
    return compositionPoints(key, inputs.composition);
  }
  if (isSnapshotKey(key)) {
    return snapshotPoints(key, inputs.profile, inputs.snapshots);
  }
  return dailyOrProfilePoints(key, inputs);
}

/**
 * One metric over a range, oldest first. Inputs are expected already limited to the
 * range by the loader; this only shapes them.
 */
export function projectV1BodySeries(
  metric: BodyMetricKey,
  range: BodySeriesRange,
  inputs: BodyInputs,
): V1BodySeries {
  const oldestFirst: BodyInputs = {
    ...inputs,
    composition: newestFirst(inputs.composition, (row) => row.measuredAt).reverse(),
    daily: newestFirst(inputs.daily, (row) => row.date).reverse(),
    snapshots: newestFirst(inputs.snapshots, (row) => row.createdAt).reverse(),
  };
  const { points, baseline } = seriesPoints(metric, oldestFirst);
  return {
    apiVersion: 1,
    metric,
    unit: BODY_METRIC_UNITS[metric],
    range,
    points,
    ...(baseline ? { baseline } : {}),
  };
}
