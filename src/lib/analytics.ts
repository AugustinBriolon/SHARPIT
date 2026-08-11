import { ActivityType } from '@prisma/client';
import { format, startOfDay, startOfWeek, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { estimateActivityLoad, type ActivityForAnalytics } from '@/lib/training/activity-load';
import { slicePmcWindow } from '@/lib/training/pmc';
import { computeAthletePmc, toPmcPoints, type PmcPoint } from '@/lib/training/pmc-history';

export { estimateActivityLoad };
export type { ActivityForAnalytics, PmcPoint };

export interface WeeklyVolumePoint {
  week: string;
  label: string;
  total: number;
  RUN: number;
  BIKE: number;
  SWIM: number;
  STRENGTH: number;
  TRIATHLON: number;
  HIKE: number;
  OTHER: number;
}

export function computeWeeklyVolume(
  activities: ActivityForAnalytics[],
  weeks = 16,
): WeeklyVolumePoint[] {
  const end = startOfDay(new Date());
  const start = startOfWeek(subDays(end, weeks * 7), { weekStartsOn: 1 });

  const buckets = new Map<string, WeeklyVolumePoint>();

  for (const activity of activities) {
    if (activity.date < start) continue;
    const weekStart = startOfWeek(activity.date, { weekStartsOn: 1 });
    const key = format(weekStart, 'yyyy-MM-dd');
    if (!buckets.has(key)) {
      buckets.set(key, {
        week: key,
        label: format(weekStart, 'd MMM', { locale: fr }),
        total: 0,
        RUN: 0,
        BIKE: 0,
        SWIM: 0,
        STRENGTH: 0,
        TRIATHLON: 0,
        HIKE: 0,
        OTHER: 0,
      });
    }
    const hours = (activity.duration ?? 0) / 3600;
    const bucket = buckets.get(key)!;
    bucket[activity.type] += hours;
    bucket.total += hours;
  }

  return [...buckets.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((b) => ({
      ...b,
      total: Number(b.total.toFixed(1)),
      RUN: Number(b.RUN.toFixed(1)),
      BIKE: Number(b.BIKE.toFixed(1)),
      SWIM: Number(b.SWIM.toFixed(1)),
      STRENGTH: Number(b.STRENGTH.toFixed(1)),
      TRIATHLON: Number(b.TRIATHLON.toFixed(1)),
      HIKE: Number(b.HIKE.toFixed(1)),
      OTHER: Number(b.OTHER.toFixed(1)),
    }));
}

export interface SportDistribution {
  type: ActivityType;
  label: string;
  hours: number;
  count: number;
  percent: number;
}

export function computeSportDistribution(
  activities: ActivityForAnalytics[],
  days = 90,
): SportDistribution[] {
  const since = subDays(startOfDay(new Date()), days);
  const filtered = activities.filter((a) => a.date >= since);

  const totals: Record<ActivityType, { hours: number; count: number }> = {
    RUN: { hours: 0, count: 0 },
    BIKE: { hours: 0, count: 0 },
    SWIM: { hours: 0, count: 0 },
    STRENGTH: { hours: 0, count: 0 },
    TRIATHLON: { hours: 0, count: 0 },
    HIKE: { hours: 0, count: 0 },
    OTHER: { hours: 0, count: 0 },
  };

  let totalHours = 0;
  for (const activity of filtered) {
    const hours = (activity.duration ?? 0) / 3600;
    totals[activity.type].hours += hours;
    totals[activity.type].count += 1;
    totalHours += hours;
  }

  const labels: Record<ActivityType, string> = {
    RUN: 'Course',
    BIKE: 'Vélo',
    SWIM: 'Natation',
    STRENGTH: 'Musculation',
    TRIATHLON: 'Triathlon',
    HIKE: 'Randonnée',
    OTHER: 'Autre',
  };

  return (Object.keys(totals) as ActivityType[])
    .map((type) => ({
      type,
      label: labels[type],
      hours: Number(totals[type].hours.toFixed(1)),
      count: totals[type].count,
      percent: totalHours > 0 ? Math.round((totals[type].hours / totalHours) * 100) : 0,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.hours - a.hours);
}

export interface AnalyticsSummary {
  ctl: number;
  atl: number;
  tsb: number;
  weeklyHours: number;
  weeklyLoad: number;
  totalActivities: number;
  periodDays: number;
}

export interface AnalyticsViewModel {
  pmc: PmcPoint[];
  weeklyVolume: WeeklyVolumePoint[];
  distribution: SportDistribution[];
  summary: AnalyticsSummary;
}

type AnalyticsAggregates = {
  weeklyVolumeByWeek: Map<string, WeeklyVolumePoint>;
  sportTotals: Record<ActivityType, { hours: number; count: number }>;
  weeklyHours: number;
  weeklyLoad: number;
  totalActivities: number;
};

function emptySportTotals(): Record<ActivityType, { hours: number; count: number }> {
  return {
    RUN: { hours: 0, count: 0 },
    BIKE: { hours: 0, count: 0 },
    SWIM: { hours: 0, count: 0 },
    STRENGTH: { hours: 0, count: 0 },
    TRIATHLON: { hours: 0, count: 0 },
    HIKE: { hours: 0, count: 0 },
    OTHER: { hours: 0, count: 0 },
  };
}

function aggregateAnalytics(
  activities: ActivityForAnalytics[],
  options?: {
    weeklyVolumeWeeks?: number;
    distributionDays?: number;
    refDate?: Date;
  },
): AnalyticsAggregates {
  const refDate = startOfDay(options?.refDate ?? new Date());
  const weeklyVolumeWeeks = options?.weeklyVolumeWeeks ?? 16;
  const distributionDays = options?.distributionDays ?? 90;

  const weeklyVolumeStart = startOfWeek(subDays(refDate, weeklyVolumeWeeks * 7), {
    weekStartsOn: 1,
  });
  const distributionSince = subDays(refDate, distributionDays);
  const weekAgo = subDays(refDate, 7);

  const weeklyVolumeByWeek = new Map<string, WeeklyVolumePoint>();
  const sportTotals = emptySportTotals();
  let weeklyHours = 0;
  let weeklyLoad = 0;

  for (const activity of activities) {
    const hours = (activity.duration ?? 0) / 3600;
    const load = estimateActivityLoad(activity);

    if (activity.date >= weeklyVolumeStart) {
      const weekStart = startOfWeek(activity.date, { weekStartsOn: 1 });
      const key = format(weekStart, 'yyyy-MM-dd');
      let bucket = weeklyVolumeByWeek.get(key);
      if (!bucket) {
        bucket = {
          week: key,
          label: format(weekStart, 'd MMM', { locale: fr }),
          total: 0,
          RUN: 0,
          BIKE: 0,
          SWIM: 0,
          STRENGTH: 0,
          TRIATHLON: 0,
          HIKE: 0,
          OTHER: 0,
        };
        weeklyVolumeByWeek.set(key, bucket);
      }
      bucket[activity.type] += hours;
      bucket.total += hours;
    }

    if (activity.date >= distributionSince) {
      sportTotals[activity.type].hours += hours;
      sportTotals[activity.type].count += 1;
    }

    if (activity.date >= weekAgo) {
      weeklyHours += hours;
      weeklyLoad += load;
    }
  }

  return {
    weeklyVolumeByWeek,
    sportTotals,
    weeklyHours,
    weeklyLoad,
    totalActivities: activities.length,
  };
}

function computeWeeklyVolumeFromBuckets(
  buckets: Map<string, WeeklyVolumePoint>,
): WeeklyVolumePoint[] {
  return [...buckets.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((bucket) => ({
      ...bucket,
      total: Number(bucket.total.toFixed(1)),
      RUN: Number(bucket.RUN.toFixed(1)),
      BIKE: Number(bucket.BIKE.toFixed(1)),
      SWIM: Number(bucket.SWIM.toFixed(1)),
      STRENGTH: Number(bucket.STRENGTH.toFixed(1)),
      TRIATHLON: Number(bucket.TRIATHLON.toFixed(1)),
      HIKE: Number(bucket.HIKE.toFixed(1)),
      OTHER: Number(bucket.OTHER.toFixed(1)),
    }));
}

function computeSportDistributionFromTotals(
  totals: Record<ActivityType, { hours: number; count: number }>,
): SportDistribution[] {
  const totalHours = Object.values(totals).reduce((sum, sport) => sum + sport.hours, 0);
  const labels: Record<ActivityType, string> = {
    RUN: 'Course',
    BIKE: 'Vélo',
    SWIM: 'Natation',
    STRENGTH: 'Musculation',
    TRIATHLON: 'Triathlon',
    HIKE: 'Randonnée',
    OTHER: 'Autre',
  };

  return (Object.keys(totals) as ActivityType[])
    .map((type) => ({
      type,
      label: labels[type],
      hours: Number(totals[type].hours.toFixed(1)),
      count: totals[type].count,
      percent: totalHours > 0 ? Math.round((totals[type].hours / totalHours) * 100) : 0,
    }))
    .filter((sport) => sport.count > 0)
    .sort((a, b) => b.hours - a.hours);
}

function buildAnalyticsSummary(
  pmc: PmcPoint[],
  aggregates: Pick<AnalyticsAggregates, 'weeklyHours' | 'weeklyLoad' | 'totalActivities'>,
): AnalyticsSummary {
  const latest = pmc[pmc.length - 1];
  return {
    ctl: latest?.ctl ?? 0,
    atl: latest?.atl ?? 0,
    tsb: latest?.tsb ?? 0,
    weeklyHours: Number(aggregates.weeklyHours.toFixed(1)),
    weeklyLoad: Math.round(aggregates.weeklyLoad),
    totalActivities: aggregates.totalActivities,
    periodDays: 180,
  };
}

export function computeAnalyticsSummary(
  activities: ActivityForAnalytics[],
  pmc: PmcPoint[],
): AnalyticsSummary {
  const latest = pmc[pmc.length - 1];
  const weekAgo = subDays(startOfDay(new Date()), 7);

  const weekActivities = activities.filter((a) => a.date >= weekAgo);
  const weeklyHours = weekActivities.reduce((s, a) => s + (a.duration ?? 0), 0) / 3600;
  const weeklyLoad = weekActivities.reduce((s, a) => s + estimateActivityLoad(a), 0);

  return {
    ctl: latest?.ctl ?? 0,
    atl: latest?.atl ?? 0,
    tsb: latest?.tsb ?? 0,
    weeklyHours: Number(weeklyHours.toFixed(1)),
    weeklyLoad: Math.round(weeklyLoad),
    totalActivities: activities.length,
    periodDays: 180,
  };
}

export function buildAnalyticsViewModel(
  activities: ActivityForAnalytics[],
  options?: {
    pmcDays?: number;
    weeklyVolumeWeeks?: number;
    distributionDays?: number;
    refDate?: Date;
  },
): AnalyticsViewModel {
  const aggregates = aggregateAnalytics(activities, options);
  // Computed across the whole history, then trimmed for display: `pmcDays` is a
  // chart width, not a computation boundary. See ADR-011.
  const pmc = slicePmcWindow(
    toPmcPoints(computeAthletePmc(activities, { refDate: options?.refDate })),
    options?.pmcDays ?? 180,
    options?.refDate,
  );
  const weeklyVolume = computeWeeklyVolumeFromBuckets(aggregates.weeklyVolumeByWeek);
  const distribution = computeSportDistributionFromTotals(aggregates.sportTotals);
  const summary = buildAnalyticsSummary(pmc, aggregates);

  return {
    pmc,
    weeklyVolume,
    distribution,
    summary,
  };
}

export const CHART_COLORS: Record<ActivityType | 'ctl' | 'atl' | 'tsb', string> = {
  RUN: '#ea580c',
  BIKE: '#059669',
  SWIM: '#2563eb',
  STRENGTH: '#2f6b28',
  TRIATHLON: '#9f995b',
  HIKE: '#b45309',
  OTHER: '#666666',
  ctl: 'var(--signal-base)',
  atl: 'var(--signal-vo2)',
  tsb: 'var(--signal-tempo)',
};
