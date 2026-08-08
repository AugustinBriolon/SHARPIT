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

function sumNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0);
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
  let endAt = startAt;
  for (const m of ordered) {
    const start = asDate(m.date);
    const end =
      m.duration != null && m.duration > 0 ? new Date(start.getTime() + m.duration * 1000) : start;
    if (end.getTime() > endAt.getTime()) endAt = end;
  }

  const locationLabels: string[] = [];
  for (const m of ordered) {
    const label = m.observedLocationLabel?.trim();
    if (label && !locationLabels.includes(label)) locationLabels.push(label);
  }

  return {
    memberCount: ordered.length,
    startAt,
    endAt,
    durationSec: sumNullable(ordered.map((m) => m.duration)),
    distanceM: sumNullable(ordered.map((m) => m.hikeMetrics?.distanceM ?? null)),
    elevationM: sumNullable(ordered.map((m) => m.hikeMetrics?.elevationM ?? null)),
    elevationLossM: sumNullable(ordered.map((m) => m.hikeMetrics?.elevationLossM ?? null)),
    load: sumNullable(ordered.map((m) => m.load)),
    locationLabels,
  };
}
