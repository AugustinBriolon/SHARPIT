import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface HealthEntry {
  date: Date;
  sleepMinutes: number | null;
  hrv: number | null;
  restingHr: number | null;
  weightKg: number | null;
  calories: number | null;
  recoveryScore: number | null;
  stress: number | null;
  mood: string | null;
  readinessLevel: string | null;
  readinessFeedback: string | null;
  readinessFactors: unknown;
  hrvStatus: string | null;
  hrvBaselineLow: number | null;
  hrvBaselineHigh: number | null;
  bodyBattery: number | null;
}

export function formatSleep(minutes?: number | null): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export interface TrendStat {
  latest: number | null;
  avg7: number | null;
  delta: number | null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function computeTrend(
  entries: HealthEntry[],
  key: keyof Pick<HealthEntry, 'hrv' | 'restingHr' | 'weightKg' | 'sleepMinutes' | 'recoveryScore'>,
): TrendStat {
  const sorted = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
  const values = sorted.map((e) => e[key]).filter((v): v is number => v != null);

  const latest = values[0] ?? null;
  const last7 = values.slice(0, 7);
  const prev7 = values.slice(7, 14);
  const avg7 = average(last7);
  const avgPrev = average(prev7);
  const delta = avg7 != null && avgPrev != null ? Number((avg7 - avgPrev).toFixed(1)) : null;

  return { latest, avg7: avg7 != null ? Number(avg7.toFixed(1)) : null, delta };
}

export interface HealthChartPoint {
  date: string;
  label: string;
  hrv: number | null;
  restingHr: number | null;
  weightKg: number | null;
  sleepHours: number | null;
}

export function buildHealthSeries(entries: HealthEntry[], days = 60): HealthChartPoint[] {
  const byDate = new Map<string, HealthEntry>();
  for (const entry of entries) {
    byDate.set(format(entry.date, 'yyyy-MM-dd'), entry);
  }

  const series: HealthChartPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const day = subDays(today, i);
    const key = format(day, 'yyyy-MM-dd');
    const entry = byDate.get(key);
    series.push({
      date: key,
      label: format(day, 'd MMM', { locale: fr }),
      hrv: entry?.hrv ?? null,
      restingHr: entry?.restingHr ?? null,
      weightKg: entry?.weightKg ?? null,
      sleepHours: entry?.sleepMinutes != null ? Number((entry.sleepMinutes / 60).toFixed(1)) : null,
    });
  }

  return series;
}
