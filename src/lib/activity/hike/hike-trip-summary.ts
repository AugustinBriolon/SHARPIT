import { formatDate, formatDayRange, formatDistance } from '@/lib/format';

export type HikeTripMemberInput = {
  date: Date | string;
  duration: number | null;
  load: number | null;
  observedLocationLabel: string | null;
  hikeMetrics: {
    distanceM: number | null;
    elevationM: number | null;
    elevationLossM: number | null;
  } | null;
};

export type HikeTripSummary = {
  memberCount: number;
  startAt: Date;
  endAt: Date;
  durationSec: number | null;
  distanceM: number | null;
  elevationM: number | null;
  elevationLossM: number | null;
  load: number | null;
  locationLabels: string[];
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Single date for a same-day trip, range otherwise. */
export function formatTripDateRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return formatDate(start);
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** “3 étapes” / “1 étape” — empty when the trip has no member. */
export function formatTripStepCount(memberCount: number): string | null {
  if (memberCount <= 0) {
    return null;
  }
  return `${memberCount} étape${memberCount > 1 ? 's' : ''}`;
}

/**
 * Chip meta shared by the trips list and the training hub preview.
 * Deliberately short — a 390px row only fits the span, the step count and the
 * distance; duration and D+ are one tap away on the trip itself.
 */
export function buildHikeTripListMeta(summary: HikeTripSummary): string[] {
  const meta = [formatDayRange(summary.startAt, summary.endAt)];

  const stepCount = formatTripStepCount(summary.memberCount);
  if (stepCount) {
    meta.push(stepCount);
  }
  if (summary.distanceM !== null) {
    meta.push(formatDistance(summary.distanceM));
  }

  return meta;
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (nums.length === 0) {
    return null;
  }
  return nums.reduce((a, b) => a + b, 0);
}

function computeTripEndAt(ordered: HikeTripMemberInput[], startAt: Date): Date {
  let endAt = startAt;
  for (const m of ordered) {
    const start = asDate(m.date);
    const end =
      m.duration !== null && m.duration > 0 ? new Date(start.getTime() + m.duration * 1000) : start;
    if (end.getTime() > endAt.getTime()) {
      endAt = end;
    }
  }
  return endAt;
}

function collectLocationLabels(ordered: HikeTripMemberInput[]): string[] {
  const locationLabels: string[] = [];
  for (const m of ordered) {
    const label = m.observedLocationLabel?.trim();
    if (label && !locationLabels.includes(label)) {
      locationLabels.push(label);
    }
  }
  return locationLabels;
}

export function buildHikeTripSummary(members: HikeTripMemberInput[]): HikeTripSummary {
  if (members.length === 0) {
    const now = new Date();
    return {
      memberCount: 0,
      startAt: now,
      endAt: now,
      durationSec: null,
      distanceM: null,
      elevationM: null,
      elevationLossM: null,
      load: null,
      locationLabels: [],
    };
  }

  const ordered = [...members].sort((x, y) => asDate(x.date).getTime() - asDate(y.date).getTime());
  const startAt = asDate(ordered[0].date);
  const endAt = computeTripEndAt(ordered, startAt);

  return {
    memberCount: ordered.length,
    startAt,
    endAt,
    durationSec: sumNullable(ordered.map((m) => m.duration)),
    distanceM: sumNullable(ordered.map((m) => m.hikeMetrics?.distanceM ?? null)),
    elevationM: sumNullable(ordered.map((m) => m.hikeMetrics?.elevationM ?? null)),
    elevationLossM: sumNullable(ordered.map((m) => m.hikeMetrics?.elevationLossM ?? null)),
    load: sumNullable(ordered.map((m) => m.load)),
    locationLabels: collectLocationLabels(ordered),
  };
}
