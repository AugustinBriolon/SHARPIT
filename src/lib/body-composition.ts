import { BodyCompositionSource, type BodyCompositionMeasurement } from '@prisma/client';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface BodyCompositionEntry {
  id: string;
  measuredAt: Date;
  weightKg: number | null;
  bmi: number | null;
  bodyFatPct: number | null;
  waterPct: number | null;
  musclePct: number | null;
  boneKg: number | null;
  bmr: number | null;
  visceralFat: number | null;
  proteinPct: number | null;
  bodyAge: number | null;
  subcutaneousFatPct: number | null;
  skeletalMusclePct: number | null;
  fatFreeWeightKg: number | null;
  heartRate: number | null;
}

export interface CompositionChartPoint {
  date: string;
  label: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  visceralFat: number | null;
  waterPct: number | null;
}

export interface CompositionTrend {
  latest: number | null;
  avg7: number | null;
  delta: number | null;
}

/** Withings l'emporte sur Renpho pour une même journée calendaire. */
export function dedupeBodyCompositionByDay(
  rows: BodyCompositionMeasurement[],
): BodyCompositionMeasurement[] {
  const byDay = new Map<string, BodyCompositionMeasurement[]>();

  for (const row of rows) {
    const dayKey = format(row.measuredAt, 'yyyy-MM-dd');
    const bucket = byDay.get(dayKey);
    if (bucket) bucket.push(row);
    else byDay.set(dayKey, [row]);
  }

  const picked: BodyCompositionMeasurement[] = [];

  for (const dayRows of byDay.values()) {
    const withings = dayRows.filter((r) => r.source === BodyCompositionSource.WITHINGS);
    const pool = withings.length > 0 ? withings : dayRows;
    if (withings.length > 1) {
      picked.push(mergeWithingsDayRows(withings));
    } else {
      pool.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime());
      picked.push(pool[0]!);
    }
  }

  return picked.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime());
}

const WITHINGS_MERGE_SCALAR_KEYS = [
  'weightKg',
  'bmi',
  'bodyFatPct',
  'waterPct',
  'musclePct',
  'boneKg',
  'bmr',
  'visceralFat',
  'proteinPct',
  'bodyAge',
  'subcutaneousFatPct',
  'skeletalMusclePct',
  'fatFreeWeightKg',
  'heartRate',
  'vascularAgeYears',
  'pulseWaveVelocity',
  'vo2Max',
  'nerveHealthScore',
  'nerveHealthLeft',
  'nerveHealthRight',
  'nerveResponseScore',
  'skinConductance',
  'metabolicAge',
  'hydrationKg',
  'fatMassKg',
  'extracellularWaterKg',
  'intracellularWaterKg',
] as const satisfies ReadonlyArray<keyof BodyCompositionMeasurement>;

/** Fusionne plusieurs lignes Withings du même jour (measuregrps API séparés). */
function mergeWithingsDayRows(rows: BodyCompositionMeasurement[]): BodyCompositionMeasurement {
  const sorted = [...rows].sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime());
  const merged: BodyCompositionMeasurement = { ...sorted[0]! };

  for (const key of WITHINGS_MERGE_SCALAR_KEYS) {
    if (merged[key] != null) continue;
    for (const row of sorted) {
      const value = row[key];
      if (value != null) {
        (merged as Record<string, unknown>)[key] = value;
        break;
      }
    }
  }

  let extras = merged.withingsExtras;
  for (const row of sorted) {
    if (row.withingsExtras == null) continue;
    extras = mergeWithingsExtrasJson(extras, row.withingsExtras);
  }
  merged.withingsExtras = extras;

  return merged;
}

function mergeWithingsExtrasJson(
  a: BodyCompositionMeasurement['withingsExtras'],
  b: BodyCompositionMeasurement['withingsExtras'],
): BodyCompositionMeasurement['withingsExtras'] {
  if (a == null) return b;
  if (b == null) return a;
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const ecgA = (objA.ecg as Record<string, number> | undefined) ?? {};
  const ecgB = (objB.ecg as Record<string, number> | undefined) ?? {};
  const segmentalA = (objA.segmental as unknown[] | undefined) ?? [];
  const segmentalB = (objB.segmental as unknown[] | undefined) ?? [];
  return {
    ...objA,
    ...objB,
    ...(objA.ecgAfibClassification != null || objB.ecgAfibClassification != null
      ? {
          ecgAfibClassification:
            (objB.ecgAfibClassification as number | undefined) ??
            (objA.ecgAfibClassification as number | undefined),
        }
      : {}),
    ...(Object.keys(ecgA).length + Object.keys(ecgB).length > 0
      ? { ecg: { ...ecgA, ...ecgB } }
      : {}),
    ...(segmentalA.length + segmentalB.length > 0
      ? { segmental: [...segmentalA, ...segmentalB] }
      : {}),
  } as BodyCompositionMeasurement['withingsExtras'];
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeCompositionTrend(
  entries: BodyCompositionEntry[],
  key: keyof Pick<
    BodyCompositionEntry,
    'weightKg' | 'bodyFatPct' | 'musclePct' | 'visceralFat' | 'waterPct' | 'bmi'
  >,
): CompositionTrend {
  const sorted = [...entries].sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime());
  const values = sorted
    .map((entry) => entry[key])
    .filter((value): value is number => value != null);

  const latest = values[0] ?? null;
  const last7 = values.slice(0, 7);
  const prev7 = values.slice(7, 14);
  const avg7 = average(last7);
  const avgPrev = average(prev7);
  const delta = avg7 != null && avgPrev != null ? Number((avg7 - avgPrev).toFixed(2)) : null;

  return {
    latest: latest != null ? Number(latest.toFixed(2)) : null,
    avg7: avg7 != null ? Number(avg7.toFixed(2)) : null,
    delta,
  };
}

/** Une mesure par jour (la plus récente) pour les courbes. */
export function buildCompositionSeries(
  entries: BodyCompositionEntry[],
  days = 90,
): CompositionChartPoint[] {
  const byDay = new Map<string, BodyCompositionEntry>();
  for (const entry of entries) {
    const key = format(entry.measuredAt, 'yyyy-MM-dd');
    const prev = byDay.get(key);
    if (!prev || entry.measuredAt.getTime() > prev.measuredAt.getTime()) {
      byDay.set(key, entry);
    }
  }

  const series: CompositionChartPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(today, i);
    const key = format(day, 'yyyy-MM-dd');
    const entry = byDay.get(key);
    series.push({
      date: key,
      label: format(day, 'd MMM', { locale: fr }),
      weightKg: entry?.weightKg ?? null,
      bodyFatPct: entry?.bodyFatPct ?? null,
      musclePct: entry?.musclePct ?? null,
      visceralFat: entry?.visceralFat ?? null,
      waterPct: entry?.waterPct ?? null,
    });
  }

  return series;
}

export function formatCompositionDelta(delta: number | null, unit = ''): string | undefined {
  if (delta == null) return undefined;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${unit} vs 7j préc.`;
}
