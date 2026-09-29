import type { HealthTone } from '@sharpit/server/lib/health/health-norms';

/**
 * Where a marker is heading against the athlete's own recent past — the "évolution" half of
 * Santé's reading, beside the published norm (`health-norms.ts`).
 *
 * The recent value is the mean of the last days; the baseline is the mean of the month before
 * them. A change smaller than the marker's everyday noise reads as stable, so a normal day-to-day
 * wobble is never called a trend.
 */

export type HealthPoint = { date: Date; value: number };

export type HealthTrend = {
  recent: number;
  baseline: number;
  delta: number;
  /** Within the marker's everyday noise: not a change worth naming. */
  stable: boolean;
  tone: HealthTone;
};

export type TrendRule = {
  /** Which way is better; `none` only describes the change. */
  favorable: 'up' | 'down' | 'none';
  /** Changes smaller than this are day-to-day noise. */
  noise: number;
  /** Days the recent value reaches back — longer for sparse readings such as a scale's. */
  recentDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const BASELINE_DAYS = 30;

export function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function valuesBetween(points: HealthPoint[], from: number, to: number): number[] {
  return points
    .filter((point) => point.date.getTime() > from && point.date.getTime() <= to)
    .map((point) => point.value);
}

function toneOf(delta: number, rule: TrendRule): HealthTone {
  if (Math.abs(delta) < rule.noise || rule.favorable === 'none') {
    return 'neutral';
  }
  const improving = rule.favorable === 'up' ? delta > 0 : delta < 0;
  return improving ? 'good' : 'watch';
}

export function healthTrend(points: HealthPoint[], now: Date, rule: TrendRule): HealthTrend | null {
  const recentDays = rule.recentDays ?? 7;
  const end = now.getTime();
  const split = end - recentDays * DAY_MS;
  const recent = mean(valuesBetween(points, split, end));
  const baseline = mean(valuesBetween(points, split - BASELINE_DAYS * DAY_MS, split));
  if (recent === null || baseline === null) {
    return null;
  }
  const delta = recent - baseline;
  return {
    recent,
    baseline,
    delta,
    stable: Math.abs(delta) < rule.noise,
    tone: toneOf(delta, rule),
  };
}
