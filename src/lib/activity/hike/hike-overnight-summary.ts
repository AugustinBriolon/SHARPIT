// Single-session overnight/day window. Multi-session: `buildHikeTripSummary`.

const OVERNIGHT_DURATION_SEC = 8 * 3600;

export type HikeOvernightSummary = {
  variant: 'overnight' | 'day';
  startAt: Date;
  endAt: Date;
  durationSec: number | null;
  locationLabel: string | null;
  weather: string | null;
  load: number | null;
  distanceM: number | null;
  elevationM: number | null;
  elevationLossM: number | null;
  endPoint: { lat: number; lng: number } | null;
  endLocationFallback: string | null;
};

export type HikeOvernightInput = {
  date: Date | string;
  duration: number | null;
  weather: string | null;
  load: number | null;
  observedLocationLabel: string | null;
  hikeMetrics: {
    distanceM: number | null;
    elevationM: number | null;
    elevationLossM: number | null;
  } | null;
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function crossesLocalMidnight(start: Date, end: Date): boolean {
  return (
    start.getFullYear() !== end.getFullYear() ||
    start.getMonth() !== end.getMonth() ||
    start.getDate() !== end.getDate()
  );
}

export function buildHikeOvernightSummary(
  activity: HikeOvernightInput,
  opts?: {
    path?: [number, number][] | null;
    streamElevationLossM?: number | null;
  },
): HikeOvernightSummary {
  const startAt = asDate(activity.date);
  const durationSec = activity.duration != null && activity.duration > 0 ? activity.duration : null;
  const endAt =
    durationSec != null ? new Date(startAt.getTime() + durationSec * 1000) : new Date(startAt);

  const variant: 'overnight' | 'day' =
    (durationSec != null && durationSec >= OVERNIGHT_DURATION_SEC) ||
    (durationSec != null && crossesLocalMidnight(startAt, endAt))
      ? 'overnight'
      : 'day';

  const path = opts?.path;
  const last = path && path.length > 0 ? path[path.length - 1] : null;
  // path is [lat, lng] — matches ActivityStreamPayload.path (Leaflet order)
  const endPoint = last ? { lat: last[0], lng: last[1] } : null;

  const metrics = activity.hikeMetrics;
  return {
    variant,
    startAt,
    endAt,
    durationSec,
    locationLabel: activity.observedLocationLabel,
    weather: activity.weather,
    load: activity.load,
    distanceM: metrics?.distanceM ?? null,
    elevationM: metrics?.elevationM ?? null,
    elevationLossM: metrics?.elevationLossM ?? opts?.streamElevationLossM ?? null,
    endPoint,
    endLocationFallback: activity.observedLocationLabel,
  };
}
