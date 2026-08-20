import type { GarminConnect } from '@flow-js/garmin-connect';

type GCClient = InstanceType<typeof GarminConnect>;

const GARMIN_ACTIVITY_BASE = 'https://connectapi.garmin.com/activity-service/activity';

/** Séries brutes alignées sur le format Strava / streams.ts */
export interface RawStreams {
  time: number[];
  distance: number[];
  altitude: number[];
  heartrate: number[];
  watts: number[];
  cadence: number[];
  velocity: number[];
  latlng: [number, number][];
}

interface MetricDescriptor {
  key?: string;
  metricsIndex?: number;
}

interface ActivityDetailRow {
  metrics?: Array<number | null>;
}

interface PolylinePoint {
  lat?: number | null;
  lng?: number | null;
  lon?: number | null;
  elevation?: number | null;
  time?: number | null;
  distance?: number | null;
  heartRate?: number | null;
  speed?: number | null;
}

interface GarminDetailsBody {
  metricDescriptors?: MetricDescriptor[];
  activityDetailMetrics?: ActivityDetailRow[];
  geoPolylineDTO?: {
    polyline?: PolylinePoint[];
  };
  detailsAvailable?: boolean;
}

function unwrapGarminDetails(raw: unknown): GarminDetailsBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (Array.isArray(obj.activityDetailMetrics) || Array.isArray(obj.metricDescriptors)) {
    return obj as GarminDetailsBody;
  }
  for (const value of Object.values(obj)) {
    if (!value || typeof value !== 'object') continue;
    const nested = value as GarminDetailsBody;
    if (Array.isArray(nested.activityDetailMetrics) || Array.isArray(nested.metricDescriptors)) {
      return nested;
    }
  }
  return null;
}

function metricIndexMap(descriptors: MetricDescriptor[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of descriptors) {
    if (d.key != null && d.metricsIndex != null) map.set(d.key, d.metricsIndex);
  }
  return map;
}

function numAt(metrics: Array<number | null>, idx: number | undefined): number | null {
  if (idx == null || idx < 0 || idx >= metrics.length) return null;
  const v = metrics[idx];
  return v != null && Number.isFinite(v) ? v : null;
}

function buildFromPolyline(polyline: PolylinePoint[]): RawStreams {
  const time: number[] = [];
  const distance: number[] = [];
  const altitude: number[] = [];
  const heartrate: number[] = [];
  const velocity: number[] = [];
  const latlng: [number, number][] = [];

  let t0: number | null = null;
  for (const p of polyline) {
    const { lat } = p;
    const lon = p.lng ?? p.lon;
    if (lat == null || lon == null) continue;

    latlng.push([lat, lon]);

    if (p.time != null) {
      if (t0 == null) t0 = p.time;
      const sec = p.time > 1_000_000_000_000 ? (p.time - t0) / 1000 : p.time - t0;
      time.push(Math.max(0, sec));
    } else {
      time.push(time.length > 0 ? time[time.length - 1] + 1 : 0);
    }

    distance.push(p.distance ?? (distance.length ? distance[distance.length - 1] : 0));
    altitude.push(p.elevation ?? 0);
    heartrate.push(p.heartRate ?? 0);
    velocity.push(p.speed ?? 0);
  }

  return {
    time,
    distance,
    altitude,
    heartrate,
    watts: [],
    cadence: [],
    velocity,
    latlng,
  };
}

/**
 * Convertit la réponse `/activity/{id}/details` Garmin en séries brutes
 * compatibles avec activity-analysis (même format que Strava).
 */
export function parseGarminDetailsToRawStreams(details: GarminDetailsBody): RawStreams | null {
  const rows = details.activityDetailMetrics ?? [];
  const descriptors = details.metricDescriptors ?? [];
  const idx = metricIndexMap(descriptors);

  const tsIdx = idx.get('directTimestamp');
  const distIdx = idx.get('sumDistance');
  const hrIdx = idx.get('directHeartRate');
  const wattsIdx = idx.get('directPower');
  const speedIdx = idx.get('directSpeed');
  const altIdx = idx.get('directElevation');
  const bikeCadIdx = idx.get('directBikeCadence');
  const runCadIdx =
    idx.get('directRunCadence') ?? idx.get('directDoubleCadence') ?? idx.get('directCadence');
  const latIdx = idx.get('directLatitude');
  const lonIdx = idx.get('directLongitude');

  if (rows.length === 0) {
    const poly = details.geoPolylineDTO?.polyline ?? [];
    if (poly.length > 1) return buildFromPolyline(poly);
    return null;
  }

  const time: number[] = [];
  const distance: number[] = [];
  const altitude: number[] = [];
  const heartrate: number[] = [];
  const watts: number[] = [];
  const cadence: number[] = [];
  const velocity: number[] = [];
  const latlng: [number, number][] = [];

  let t0: number | null = null;

  for (const row of rows) {
    const m = row.metrics ?? [];

    const ts = numAt(m, tsIdx);
    if (ts != null) {
      if (t0 == null) t0 = ts;
      const sec = ts > 1_000_000_000_000 ? (ts - t0) / 1000 : ts - (t0 ?? 0);
      time.push(Math.max(0, Math.round(sec)));
    } else {
      time.push(time.length > 0 ? time[time.length - 1] + 1 : 0);
    }

    distance.push(numAt(m, distIdx) ?? (distance.length ? distance[distance.length - 1] : 0));
    altitude.push(numAt(m, altIdx) ?? 0);
    heartrate.push(numAt(m, hrIdx) ?? 0);
    watts.push(numAt(m, wattsIdx) ?? 0);

    const cad = numAt(m, bikeCadIdx) ?? numAt(m, runCadIdx);
    cadence.push(cad ?? 0);

    velocity.push(numAt(m, speedIdx) ?? 0);

    const lat = numAt(m, latIdx);
    const lon = numAt(m, lonIdx);
    if (lat != null && lon != null) latlng.push([lat, lon]);
  }

  if (latlng.length === 0) {
    const poly = details.geoPolylineDTO?.polyline ?? [];
    for (const p of poly) {
      const { lat } = p;
      const lon = p.lng ?? p.lon;
      if (lat != null && lon != null) latlng.push([lat, lon]);
    }
  }

  return { time, distance, altitude, heartrate, watts, cadence, velocity, latlng };
}

export function rawStreamsHaveSignal(raw: RawStreams): boolean {
  const has = (arr: number[]) => arr.length > 0 && arr.some((v) => v != null && v !== 0);
  return (
    raw.latlng.length > 0 ||
    has(raw.heartrate) ||
    has(raw.watts) ||
    has(raw.altitude) ||
    has(raw.velocity) ||
    has(raw.distance)
  );
}

/** Récupère les séries temporelles + trace GPS depuis Garmin Connect. */
export async function fetchGarminActivityStreams(
  client: GCClient,
  garminActivityId: string | number,
): Promise<RawStreams | null> {
  const id = String(garminActivityId);
  try {
    const raw = await client.get<unknown>(`${GARMIN_ACTIVITY_BASE}/${id}/details`, {
      params: { maxChartSize: '2000', maxPolylineSize: '4000' },
    });
    const details = unwrapGarminDetails(raw);
    if (!details) return null;
    if (details.detailsAvailable === false) return null;
    return parseGarminDetailsToRawStreams(details);
  } catch {
    return null;
  }
}

/** Météo Garmin pour une activité (optionnel, enrichit Activity.weather). */
export async function fetchGarminActivityWeather(
  client: GCClient,
  garminActivityId: string | number,
): Promise<string | null> {
  try {
    const raw = (await client.get(
      `${GARMIN_ACTIVITY_BASE}/${String(garminActivityId)}/weather`,
    )) as {
      weatherTypeDTO?: { desc?: string };
      temp?: number;
      windSpeed?: number;
    };
    const parts: string[] = [];
    if (raw.weatherTypeDTO?.desc) parts.push(raw.weatherTypeDTO.desc);
    if (raw.temp != null) parts.push(`${Math.round(raw.temp)}°C`);
    if (raw.windSpeed != null) parts.push(`vent ${Math.round(raw.windSpeed)} km/h`);
    return parts.length ? parts.join(' · ') : null;
  } catch {
    return null;
  }
}
