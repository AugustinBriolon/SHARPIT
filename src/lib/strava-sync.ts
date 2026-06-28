import { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchActivities,
  mapStravaType,
  refreshAccessToken,
  type StravaActivity,
} from "@/lib/strava";

const ACCOUNT_ID = "default";

export async function getStravaAccount() {
  return prisma.stravaAccount.findUnique({ where: { id: ACCOUNT_ID } });
}

export async function disconnectStrava() {
  await prisma.stravaAccount.deleteMany({ where: { id: ACCOUNT_ID } });
}

export async function getValidAccessToken() {
  const account = await getStravaAccount();
  if (!account) throw new Error("Compte Strava non connecté");

  const expiresSoon = account.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return account.accessToken;

  const refreshed = await refreshAccessToken(account.refreshToken);
  await prisma.stravaAccount.update({
    where: { id: ACCOUNT_ID },
    data: {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: new Date(refreshed.expires_at * 1000),
    },
  });
  return refreshed.access_token;
}

function buildActivityData(
  strava: StravaActivity,
  type: ActivityType,
): Prisma.ActivityCreateInput {
  const base: Prisma.ActivityCreateInput = {
    type,
    date: new Date(strava.start_date),
    title: strava.name,
    duration: strava.moving_time || strava.elapsed_time || null,
    load: strava.suffer_score ?? null,
    source: "strava",
    stravaId: String(strava.id),
  };

  const paceSecPerKm =
    strava.average_speed && strava.average_speed > 0
      ? 1000 / strava.average_speed
      : null;

  switch (type) {
    case ActivityType.RUN:
      base.runMetrics = {
        create: {
          distanceM: strava.distance || null,
          elevationM: strava.total_elevation_gain || null,
          paceSecPerKm,
          avgHr: strava.average_heartrate
            ? Math.round(strava.average_heartrate)
            : null,
          avgPower: strava.average_watts ?? null,
          cadence: strava.average_cadence
            ? Math.round(strava.average_cadence * 2)
            : null,
        },
      };
      break;
    case ActivityType.BIKE:
      base.bikeMetrics = {
        create: {
          normalizedPower: strava.weighted_average_watts ?? null,
          avgPower: strava.average_watts ?? null,
          avgCadence: strava.average_cadence
            ? Math.round(strava.average_cadence)
            : null,
          elevationM: strava.total_elevation_gain || null,
          calories: strava.kilojoules ? Math.round(strava.kilojoules) : null,
          tss: strava.suffer_score ?? null,
        },
      };
      break;
    case ActivityType.SWIM:
      base.swimMetrics = {
        create: {
          distanceM: strava.distance || null,
          avgPaceSecPer100m:
            strava.average_speed && strava.average_speed > 0
              ? 100 / strava.average_speed
              : null,
        },
      };
      break;
    case ActivityType.STRENGTH:
      break;
  }

  return base;
}

export interface SyncResult {
  fetched: number;
  imported: number;
  skipped: number;
}

export async function syncStravaActivities(): Promise<SyncResult> {
  const accessToken = await getValidAccessToken();
  const account = await getStravaAccount();

  const after = account?.lastSyncAt
    ? Math.floor(account.lastSyncAt.getTime() / 1000)
    : undefined;

  let page = 1;
  let imported = 0;
  let skipped = 0;
  let fetched = 0;

  while (page <= 10) {
    const activities = await fetchActivities(accessToken, { after, page });
    if (!activities.length) break;
    fetched += activities.length;

    for (const strava of activities) {
      const type = mapStravaType(strava.sport_type ?? strava.type);
      if (!type) {
        skipped += 1;
        continue;
      }

      const existing = await prisma.activity.findUnique({
        where: { stravaId: String(strava.id) },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      await prisma.activity.create({ data: buildActivityData(strava, type) });
      imported += 1;
    }

    if (activities.length < 100) break;
    page += 1;
  }

  await prisma.stravaAccount.update({
    where: { id: ACCOUNT_ID },
    data: { lastSyncAt: new Date() },
  });

  return { fetched, imported, skipped };
}
