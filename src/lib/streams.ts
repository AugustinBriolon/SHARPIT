import { prisma } from '@/lib/prisma';
import {
  analyzeActivityStreams,
  resolveThresholds,
  type ActivityAnalysis,
} from '@/lib/activity-analysis';
import {
  fetchGarminActivityStreams,
  rawStreamsHaveSignal,
  type RawStreams,
} from '@/lib/integrations/garmin-streams';
import { getGarminClient } from '@/lib/integrations/garmin-sync';
import { getAthleteProfile } from '@/lib/queries';
import { fetchActivityStreams, type StravaStreamSet } from '@/lib/integrations/strava';
import { getValidAccessToken } from '@/lib/integrations/strava-sync';
import type { ActivityType } from '@prisma/client';
import {
  isMultisportLegArray,
  legKindToActivityType,
  sportLegsOnly,
  type MultisportLeg,
} from '@/lib/multisport';

export type { RawStreams };

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
    avgSpeed: number | null; // m/s
    totalDistance: number | null; // m
    totalAscent: number | null; // m
    minAlt: number | null;
    maxAlt: number | null;
  } | null;
  analysis: ActivityAnalysis | null;
}

const MAX_SAMPLES = 500;
const MAX_PATH_POINTS = 800;
/** Durée max stockée à 1 Hz (~8 h) — limite le transfert réseau Neon. */
const MAX_STORED_SECONDS = 28_800;

/**
 * Réduit les streams bruts avant persistance (1 Hz, latlng échantillonnée).
 * Les records et l'UI ré-échantillonnent déjà ; le stockage pleine résolution
 * multipliait inutilement le transfert réseau (~5–20×).
 */
export function compactRawStreamsForStorage(raw: RawStreams): RawStreams {
  const { time } = raw;
  if (!time.length) return raw;

  const maxT = Math.floor(time[time.length - 1] ?? 0);
  if (maxT <= 0) return raw;

  const cap = Math.min(maxT, MAX_STORED_SECONDS);
  const n = cap + 1;

  const resampleScalar = (values: number[]): number[] => {
    if (!values.length) return [];
    const grid = new Array<number>(n).fill(0);
    let idx = 0;
    for (let s = 0; s <= cap; s++) {
      while (idx < time.length - 1 && (time[idx + 1] ?? 0) <= s) idx++;
      grid[s] = values[idx] ?? 0;
    }
    return grid;
  };

  let latlng = raw.latlng ?? [];
  if (latlng.length > MAX_PATH_POINTS) {
    latlng = downsample(latlng, MAX_PATH_POINTS);
  }

  return {
    time: Array.from({ length: n }, (_, i) => i),
    distance: resampleScalar(raw.distance ?? []),
    altitude: resampleScalar(raw.altitude ?? []),
    heartrate: resampleScalar(raw.heartrate ?? []),
    watts: resampleScalar(raw.watts ?? []),
    cadence: resampleScalar(raw.cadence ?? []),
    velocity: resampleScalar(raw.velocity ?? []),
    latlng,
  };
}

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

function buildPayload(
  raw: RawStreams,
  activity: {
    type: ActivityType;
    duration: number | null;
    bikeMetrics: {
      normalizedPower: number | null;
      intensityFactor: number | null;
    } | null;
  },
  profile: Awaited<ReturnType<typeof getAthleteProfile>>,
): ActivityStreamPayload {
  const length = Math.max(raw.time.length, raw.distance.length, raw.latlng.length);

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

  const path = raw.latlng.length > 0 ? downsample(raw.latlng, MAX_PATH_POINTS) : null;

  const totalDistance = has.distance ? max(raw.distance) : null;
  const lastTime = raw.time.length ? max(raw.time) : null;
  let avgSpeed: number | null = null;
  if (has.speed) {
    avgSpeed = mean(raw.velocity);
  } else if (totalDistance && lastTime) {
    avgSpeed = totalDistance / lastTime;
  }

  const stats = {
    avgHr: has.hr ? Math.round(mean(raw.heartrate) ?? 0) || null : null,
    maxHr: has.hr ? max(raw.heartrate) : null,
    avgWatts: has.watts ? Math.round(mean(raw.watts) ?? 0) || null : null,
    maxWatts: has.watts ? max(raw.watts) : null,
    avgCadence: has.cadence ? Math.round(mean(raw.cadence) ?? 0) || null : null,
    maxSpeed: has.speed ? max(raw.velocity) : null,
    avgSpeed,
    totalDistance,
    totalAscent: has.altitude ? computeAscent(raw.altitude) : null,
    minAlt: has.altitude ? Math.round(Math.min(...raw.altitude)) : null,
    maxAlt: has.altitude ? Math.round(Math.max(...raw.altitude)) : null,
  };

  const analysisCtx = {
    type: activity.type,
    durationSec: activity.duration,
    bikeNormalizedPower: activity.bikeMetrics?.normalizedPower ?? null,
    bikeIntensityFactor: activity.bikeMetrics?.intensityFactor ?? null,
  };
  const thresholds = resolveThresholds(
    profile
      ? {
          ftpW: profile.ftpW,
          maxHr: profile.maxHr,
          lthr: profile.lthr,
          runThresholdPaceSecPerKm: profile.runThresholdPaceSecPerKm,
        }
      : null,
    raw,
    analysisCtx,
  );
  const analysis = analyzeActivityStreams(raw, thresholds, analysisCtx);

  return { available: true, path, samples, has, stats, analysis };
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
  analysis: null,
};

export interface MultisportLegStream {
  leg: MultisportLeg;
  type: ActivityType;
  stream: ActivityStreamPayload;
}

export interface MultisportStreamsPayload {
  legs: MultisportLegStream[];
}

async function fetchGarminLegRaw(garminId: string): Promise<RawStreams | null> {
  try {
    const client = await getGarminClient();
    const garmin = await fetchGarminActivityStreams(client, garminId);
    if (garmin && rawStreamsHaveSignal(garmin)) return garmin;
  } catch (error) {
    console.error('fetchGarminLegRaw', garminId, error);
  }
  return null;
}

function buildLegStreamPayload(
  raw: RawStreams,
  type: ActivityType,
  durationSec: number | null,
  profile: Awaited<ReturnType<typeof getAthleteProfile>>,
): ActivityStreamPayload {
  return buildPayload(raw, { type, duration: durationSec, bikeMetrics: null }, profile);
}

/** Streams Garmin par jambe sportive d'un triathlon (natation, vélo, course). */
export async function getMultisportLegStreams(
  activityId: string,
): Promise<MultisportStreamsPayload | null> {
  const [activity, profile] = await Promise.all([
    prisma.activity.findUnique({
      where: { id: activityId },
      select: { multisportLegs: true, garminId: true },
    }),
    getAthleteProfile(),
  ]);

  if (!activity?.multisportLegs || !isMultisportLegArray(activity.multisportLegs)) {
    return null;
  }

  const sportLegs = sportLegsOnly(activity.multisportLegs);
  const results: MultisportLegStream[] = [];

  for (const leg of sportLegs) {
    const type = legKindToActivityType(leg.kind);
    if (!type || !leg.garminActivityId) continue;

    const raw = await fetchGarminLegRaw(leg.garminActivityId);
    if (!raw) continue;

    results.push({
      leg,
      type,
      stream: buildLegStreamPayload(raw, type, leg.durationSec, profile),
    });
  }

  return results.length > 0 ? { legs: results } : null;
}

async function fetchRawStreams(activity: {
  garminId: string | null;
  stravaId: string | null;
}): Promise<RawStreams | null> {
  // Garmin en priorité (ressenti + source de vérité), Strava en complément streams.
  if (activity.garminId) {
    try {
      const client = await getGarminClient();
      const garmin = await fetchGarminActivityStreams(client, activity.garminId);
      if (garmin && rawStreamsHaveSignal(garmin)) return garmin;
    } catch (error) {
      console.error('fetchRawStreams garmin', error);
    }
  }

  if (activity.stravaId) {
    try {
      const token = await getValidAccessToken();
      const set = await fetchActivityStreams(token, activity.stravaId);
      if (set) return normalizeStravaStreams(set);
    } catch (error) {
      console.error('fetchRawStreams strava', error);
      throw error;
    }
  }

  return null;
}

async function persistStream(activityId: string, raw: RawStreams | null): Promise<boolean> {
  const available = raw != null && rawStreamsHaveSignal(raw);
  const stored = available && raw ? compactRawStreamsForStorage(raw) : null;
  await prisma.activityStream.create({
    data: {
      activityId,
      available,
      data: stored ? (stored as unknown as object) : undefined,
    },
  });
  return available;
}

/**
 * Renvoie les streams d'une activité (carte + graphes), en les récupérant
 * depuis Garmin ou Strava à la première demande puis en les mettant en cache.
 * Les erreurs transitoires renvoient `null` sans cacher, pour autoriser une retry.
 */
export async function getActivityStreams(
  activityId: string,
): Promise<ActivityStreamPayload | null> {
  const [activity, profile] = await Promise.all([
    prisma.activity.findUnique({
      where: { id: activityId },
      include: { stream: true, bikeMetrics: true },
    }),
    getAthleteProfile(),
  ]);
  if (!activity) return null;

  const activityCtx = {
    type: activity.type,
    duration: activity.duration,
    bikeMetrics: activity.bikeMetrics,
  };

  if (activity.stream) {
    if (activity.stream.available && activity.stream.data) {
      return buildPayload(activity.stream.data as unknown as RawStreams, activityCtx, profile);
    }
    // Cache « indisponible » avant liaison Garmin : retenter le fetch.
    if (activity.garminId) {
      await prisma.activityStream.delete({ where: { id: activity.stream.id } });
    } else {
      return UNAVAILABLE;
    }
  }

  if (!activity.garminId && !activity.stravaId) {
    await prisma.activityStream.create({
      data: { activityId, available: false },
    });
    return UNAVAILABLE;
  }

  try {
    const raw = await fetchRawStreams(activity);
    const available = await persistStream(activityId, raw);
    return available && raw ? buildPayload(raw, activityCtx, profile) : UNAVAILABLE;
  } catch (error) {
    console.error('getActivityStreams', error);
    return null;
  }
}

/** Utilitaire backfill : récupère et persiste les streams d'une activité. */
export async function fetchAndCacheActivityStreams(
  activityId: string,
  sources: { garminId: string | null; stravaId: string | null },
): Promise<{ available: boolean; raw: RawStreams | null }> {
  const raw = await fetchRawStreams(sources);
  const available = await persistStream(activityId, raw);
  return { available, raw };
}
