import { ActivityType } from "@prisma/client";
import {
  eachDayOfInterval,
  format,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { fr } from "date-fns/locale";

export interface ActivityForAnalytics {
  date: Date;
  type: ActivityType;
  duration: number | null;
  load: number | null;
  bikeMetrics: { tss: number | null } | null;
}

const LOAD_FACTOR: Record<ActivityType, number> = {
  RUN: 1.0,
  BIKE: 0.85,
  SWIM: 1.1,
  STRENGTH: 0.7,
};

export function estimateActivityLoad(activity: ActivityForAnalytics): number {
  if (activity.load != null && activity.load > 0) return activity.load;
  if (activity.bikeMetrics?.tss != null && activity.bikeMetrics.tss > 0) {
    return activity.bikeMetrics.tss;
  }
  if (!activity.duration) return 0;
  const minutes = activity.duration / 60;
  return Math.round(minutes * LOAD_FACTOR[activity.type]);
}

export interface PmcPoint {
  date: string;
  label: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export function computePmcSeries(
  activities: ActivityForAnalytics[],
  days = 180,
): PmcPoint[] {
  const end = startOfDay(new Date());
  const start = subDays(end, days);

  const dailyTss = new Map<string, number>();
  for (const day of eachDayOfInterval({ start, end })) {
    dailyTss.set(format(day, "yyyy-MM-dd"), 0);
  }

  for (const activity of activities) {
    const key = format(startOfDay(activity.date), "yyyy-MM-dd");
    if (!dailyTss.has(key)) continue;
    dailyTss.set(key, (dailyTss.get(key) ?? 0) + estimateActivityLoad(activity));
  }

  let ctl = 0;
  let atl = 0;
  const series: PmcPoint[] = [];

  for (const [date, tss] of [...dailyTss.entries()].sort()) {
    ctl += (tss - ctl) / 42;
    atl += (tss - atl) / 7;
    series.push({
      date,
      label: format(new Date(date), "d MMM", { locale: fr }),
      tss,
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(ctl - atl),
    });
  }

  return series;
}

export interface WeeklyVolumePoint {
  week: string;
  label: string;
  total: number;
  RUN: number;
  BIKE: number;
  SWIM: number;
  STRENGTH: number;
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
    const key = format(weekStart, "yyyy-MM-dd");
    if (!buckets.has(key)) {
      buckets.set(key, {
        week: key,
        label: format(weekStart, "d MMM", { locale: fr }),
        total: 0,
        RUN: 0,
        BIKE: 0,
        SWIM: 0,
        STRENGTH: 0,
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
  };

  let totalHours = 0;
  for (const activity of filtered) {
    const hours = (activity.duration ?? 0) / 3600;
    totals[activity.type].hours += hours;
    totals[activity.type].count += 1;
    totalHours += hours;
  }

  const labels: Record<ActivityType, string> = {
    RUN: "Course",
    BIKE: "Vélo",
    SWIM: "Natation",
    STRENGTH: "Musculation",
  };

  return (Object.keys(totals) as ActivityType[])
    .map((type) => ({
      type,
      label: labels[type],
      hours: Number(totals[type].hours.toFixed(1)),
      count: totals[type].count,
      percent:
        totalHours > 0
          ? Math.round((totals[type].hours / totalHours) * 100)
          : 0,
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

export function computeAnalyticsSummary(
  activities: ActivityForAnalytics[],
  pmc: PmcPoint[],
): AnalyticsSummary {
  const latest = pmc[pmc.length - 1];
  const weekAgo = subDays(startOfDay(new Date()), 7);

  const weekActivities = activities.filter((a) => a.date >= weekAgo);
  const weeklyHours =
    weekActivities.reduce((s, a) => s + (a.duration ?? 0), 0) / 3600;
  const weeklyLoad = weekActivities.reduce(
    (s, a) => s + estimateActivityLoad(a),
    0,
  );

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

export const CHART_COLORS: Record<ActivityType | "ctl" | "atl" | "tsb", string> =
  {
    RUN: "#ea580c",
    BIKE: "#0891b2",
    SWIM: "#2563eb",
    STRENGTH: "#7c3aed",
    ctl: "#0891b2",
    atl: "#ea580c",
    tsb: "#7c3aed",
  };
