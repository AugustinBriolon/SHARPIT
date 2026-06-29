import { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchActivityStreams } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/strava-sync";

/**
 * Backfill progressif des streams Strava.
 *
 * Les streams (séries seconde par seconde) ne sont récupérés qu'à l'ouverture
 * d'une activité. Pour que les records et la courbe de puissance/allure couvrent
 * tout l'historique, on récupère ici par lots les activités RUN/BIKE qui n'ont
 * pas encore de streams en cache.
 *
 * Strava limite les appels (≈100/15 min, 1000/jour pour une app récente) : on
 * traite un petit lot par exécution et on s'arrête proprement dès qu'un appel
 * échoue (rate-limit, token…), laissant le reste pour la prochaine fois.
 */

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

function hasSignal(arr: number[]): boolean {
  return arr.length > 0 && arr.some((v) => v != null && v !== 0);
}

export interface BackfillResult {
  processed: number; // activités traitées (stream créé, dispo ou non)
  withData: number; // activités avec données exploitables
  remaining: number; // activités RUN/BIKE encore sans stream après ce lot
  stopped: "done" | "rate_limited" | "batch_full";
  activityIdsWithData: string[];
}

/** Nombre d'activités RUN/BIKE avec source Strava et sans stream en cache. */
export async function countStreamBackfillCandidates(): Promise<number> {
  return prisma.activity.count({
    where: {
      stravaId: { not: null },
      type: { in: [ActivityType.RUN, ActivityType.BIKE] },
      stream: null,
    },
  });
}

export async function backfillActivityStreams(
  limit = 25,
): Promise<BackfillResult> {
  const candidates = await prisma.activity.findMany({
    where: {
      stravaId: { not: null },
      type: { in: [ActivityType.RUN, ActivityType.BIKE] },
      stream: null,
    },
    orderBy: { date: "desc" },
    take: limit,
    select: { id: true, stravaId: true },
  });

  const result: BackfillResult = {
    processed: 0,
    withData: 0,
    remaining: 0,
    stopped: "done",
    activityIdsWithData: [],
  };

  if (candidates.length === 0) {
    return result;
  }

  let token: string;
  try {
    token = await getValidAccessToken();
  } catch (error) {
    console.error("[stream-backfill] token", error);
    result.stopped = "rate_limited";
    result.remaining = await countStreamBackfillCandidates();
    return result;
  }

  for (const activity of candidates) {
    if (!activity.stravaId) continue;
    try {
      const set = await fetchActivityStreams(token, activity.stravaId);

      if (!set) {
        // 404 : aucune donnée détaillée, on cache l'absence définitivement.
        await prisma.activityStream.create({
          data: { activityId: activity.id, available: false },
        });
        result.processed += 1;
        continue;
      }

      const raw: RawStreams = {
        time: set.time?.data ?? [],
        distance: set.distance?.data ?? [],
        altitude: set.altitude?.data ?? [],
        heartrate: set.heartrate?.data ?? [],
        watts: set.watts?.data ?? [],
        cadence: set.cadence?.data ?? [],
        velocity: set.velocity_smooth?.data ?? [],
        latlng: set.latlng?.data ?? [],
      };
      const available =
        raw.latlng.length > 0 ||
        hasSignal(raw.heartrate) ||
        hasSignal(raw.watts) ||
        hasSignal(raw.altitude);

      await prisma.activityStream.create({
        data: {
          activityId: activity.id,
          available,
          data: raw as unknown as object,
        },
      });
      result.processed += 1;
      if (available) {
        result.withData += 1;
        result.activityIdsWithData.push(activity.id);
      }
    } catch (error) {
      // Échec transitoire (rate-limit, réseau) : on s'arrête sans cacher
      // l'absence, pour réessayer cette activité plus tard.
      console.error("[stream-backfill]", activity.id, error);
      result.stopped = "rate_limited";
      break;
    }
  }

  if (result.stopped === "done" && candidates.length === limit) {
    result.stopped = "batch_full";
  }
  result.remaining = await countStreamBackfillCandidates();
  return result;
}
