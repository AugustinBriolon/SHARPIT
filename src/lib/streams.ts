import { prisma } from "@/lib/prisma";
import { fetchActivityStreams, type StravaStreamSet } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/strava-sync";

/** Séries brutes stockées en base (résolution complète). */
interface RawStreams {
  time: number[];
  distance: number[];
  altitude: number[];
  heartrate: number[];
  watts: number[];
  cadence: number[];
  velocity: number[];
  latlng: [number, number][];
}

export interface StreamSample {
  t: number; // temps (s)
  d: number; // distance cumulée (m)
  alt: number | null;
  hr: number | null;
  watts: number | null;
  cadence: number | null;
  speed: number | null; // m/s
}

export interface ActivityStreamPayload {
  available: boolean;
  path: [number, number][] | null;
  samples: StreamSample[];
  has: {
    distance: boolean;
    altitude: boolean;
    hr: boolean;
    watts: boolean;
    cadence: boolean;
    speed: boolean;
  };
  stats: {
    avgHr: number | null;
    maxHr: number | null;
    avgWatts: number | null;
    maxWatts: number | null;
    avgCadence: number | null;
    maxSpeed: number | null; // m/s
    totalAscent: number | null; // m
    minAlt: number | null;
    maxAlt: number | null;
  } | null;
}

const MAX_SAMPLES = 500;
const MAX_PATH_POINTS = 2000;

function normalizeStravaStreams(set: StravaStreamSet): RawStreams {
  return {
    time: set.time?.data ?? [],
    distance: set.distance?.data ?? [],
    altitude: set.altitude?.data ?? [],
    heartrate: set.heartrate?.data ?? [],
    watts: set.watts?.data ?? [],
    cadence: set.cadence?.data ?? [],
    velocity: set.velocity_smooth?.data ?? [],
    latlng: set.latlng?.data ?? [],
  };
}

function hasSignal(arr: number[]): boolean {
  return arr.length > 0 && arr.some((v) => v != null && v !== 0);
}

/** Échantillonnage régulier en conservant le dernier point. */
function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

function mean(arr: number[]): number | null {
  const valid = arr.filter((v) => v != null && !Number.isNaN(v));
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function max(arr: number[]): number | null {
  const valid = arr.filter((v) => v != null && !Number.isNaN(v));
  if (!valid.length) return null;
  return Math.max(...valid);
}

function computeAscent(alt: number[]): number | null {
  if (alt.length < 2) return null;
  let gain = 0;
  for (let i = 1; i < alt.length; i++) {
    const diff = alt[i] - alt[i - 1];
    if (diff > 0) gain += diff;
  }
  return Math.round(gain);
}

function buildPayload(raw: RawStreams): ActivityStreamPayload {
  const length = Math.max(
    raw.time.length,
    raw.distance.length,
    raw.latlng.length,
  );

  const has = {
    distance: hasSignal(raw.distance),
    altitude: hasSignal(raw.altitude),
    hr: hasSignal(raw.heartrate),
    watts: hasSignal(raw.watts),
    cadence: hasSignal(raw.cadence),
    speed: hasSignal(raw.velocity),
  };

  const indices = downsample(
    Array.from({ length }, (_, i) => i),
    MAX_SAMPLES,
  );

  const samples: StreamSample[] = indices.map((i) => ({
    t: raw.time[i] ?? 0,
    d: raw.distance[i] ?? 0,
    alt: has.altitude ? (raw.altitude[i] ?? null) : null,
    hr: has.hr ? (raw.heartrate[i] ?? null) : null,
    watts: has.watts ? (raw.watts[i] ?? null) : null,
    cadence: has.cadence ? (raw.cadence[i] ?? null) : null,
    speed: has.speed ? (raw.velocity[i] ?? null) : null,
  }));

  const path =
    raw.latlng.length > 0 ? downsample(raw.latlng, MAX_PATH_POINTS) : null;

  const stats = {
    avgHr: has.hr ? Math.round(mean(raw.heartrate) ?? 0) || null : null,
    maxHr: has.hr ? max(raw.heartrate) : null,
    avgWatts: has.watts ? Math.round(mean(raw.watts) ?? 0) || null : null,
    maxWatts: has.watts ? max(raw.watts) : null,
    avgCadence: has.cadence ? Math.round(mean(raw.cadence) ?? 0) || null : null,
    maxSpeed: has.speed ? max(raw.velocity) : null,
    totalAscent: has.altitude ? computeAscent(raw.altitude) : null,
    minAlt: has.altitude ? Math.round(Math.min(...raw.altitude)) : null,
    maxAlt: has.altitude ? Math.round(Math.max(...raw.altitude)) : null,
  };

  return { available: true, path, samples, has, stats };
}

const UNAVAILABLE: ActivityStreamPayload = {
  available: false,
  path: null,
  samples: [],
  has: {
    distance: false,
    altitude: false,
    hr: false,
    watts: false,
    cadence: false,
    speed: false,
  },
  stats: null,
};

/**
 * Renvoie les streams d'une activité (carte + graphes), en les récupérant
 * depuis Strava à la première demande puis en les mettant en cache en base.
 * Les erreurs transitoires (réseau, rate-limit, token) renvoient `null` sans
 * cacher, pour autoriser une nouvelle tentative plus tard.
 */
export async function getActivityStreams(
  activityId: string,
): Promise<ActivityStreamPayload | null> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { stream: true },
  });
  if (!activity) return null;

  if (activity.stream) {
    if (!activity.stream.available || !activity.stream.data) return UNAVAILABLE;
    return buildPayload(activity.stream.data as unknown as RawStreams);
  }

  // Pas de source Strava : aucune donnée détaillée possible, on cache l'absence.
  if (!activity.stravaId) {
    await prisma.activityStream.create({
      data: { activityId, available: false },
    });
    return UNAVAILABLE;
  }

  try {
    const token = await getValidAccessToken();
    const set = await fetchActivityStreams(token, activity.stravaId);

    if (!set) {
      await prisma.activityStream.create({
        data: { activityId, available: false },
      });
      return UNAVAILABLE;
    }

    const raw = normalizeStravaStreams(set);
    const available =
      raw.latlng.length > 0 ||
      hasSignal(raw.heartrate) ||
      hasSignal(raw.watts) ||
      hasSignal(raw.altitude);

    await prisma.activityStream.create({
      data: {
        activityId,
        available,
        data: raw as unknown as object,
      },
    });

    return available ? buildPayload(raw) : UNAVAILABLE;
  } catch (error) {
    console.error("getActivityStreams", error);
    return null;
  }
}
