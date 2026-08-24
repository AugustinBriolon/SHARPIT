import { ActivityType, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { findMatchingActivity, mergedSource } from '@/lib/activity/list/activity-dedup';
import { prisma } from '@/lib/prisma';
import { syncSinceFromLastSync } from '@/lib/integrations/shared/sync-since';
import {
  isOAuthAccountConnected,
  isProviderAuthFailure,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import {
  fetchActivities,
  mapStravaType,
  refreshAccessToken,
  type StravaActivity,
} from '@/lib/integrations/strava/strava';
import { observationEngine } from '@/lib/engines/observation-engine';
import { stravaActivityToSession } from '@/core/adapters/strava-adapter';
import { mapWithConcurrency } from '@/lib/async/map-with-concurrency';

const ATHLETE_ID = 'default';

/** Parallel DB upserts for Strava candidates within a page. */
export const STRAVA_ACTIVITY_CONCURRENCY = 6;

async function ingestStravaActivity(activity: StravaActivity): Promise<void> {
  try {
    const raw = stravaActivityToSession(activity, new Date());
    if (!raw) return;
    await observationEngine.ingest(ATHLETE_ID, raw);
  } catch (err) {
    console.error('[ObservationEngine] strava ingest failed:', err);
  }
}

const ACCOUNT_ID = 'default';

export async function getStravaAccount() {
  return prisma.stravaAccount.findUnique({ where: { athleteId: ACCOUNT_ID } });
}

export async function disconnectStrava() {
  await prisma.stravaAccount.deleteMany({ where: { athleteId: ACCOUNT_ID } });
}

/** Keeps the Strava profile row so the hub can ask for a reconnect. */
export async function revokeStravaCredentials() {
  const account = await getStravaAccount();
  if (!account) return;
  await prisma.stravaAccount.update({
    where: { athleteId: ACCOUNT_ID },
    data: {
      accessToken: '',
      refreshToken: '',
      expiresAt: new Date(0),
    },
  });
}

export async function getValidAccessToken() {
  const account = await getStravaAccount();
  if (!account) throw new Error('Compte Strava non connecté');
  if (!isOAuthAccountConnected(account)) {
    throw new ProviderAuthError('Session Strava expirée. Reconnecte Strava dans les paramètres.');
  }

  const expiresSoon = account.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) return account.accessToken;

  try {
    const refreshed = await refreshAccessToken(account.refreshToken);
    await prisma.stravaAccount.update({
      where: { athleteId: ACCOUNT_ID },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: new Date(refreshed.expires_at * 1000),
      },
    });
    return refreshed.access_token;
  } catch (error) {
    if (isProviderAuthFailure(error)) {
      await revokeStravaCredentials();
      throw new ProviderAuthError('Session Strava expirée. Reconnecte Strava dans les paramètres.');
    }
    throw error;
  }
}

function buildActivityData(strava: StravaActivity, type: ActivityType): Prisma.ActivityCreateInput {
  const base: Prisma.ActivityCreateInput = {
    type,
    date: new Date(strava.start_date),
    title: strava.name,
    duration: strava.moving_time || strava.elapsed_time || null,
    load: strava.suffer_score ?? null,
    source: 'strava',
    stravaId: String(strava.id),
  };

  const paceSecPerKm =
    strava.average_speed && strava.average_speed > 0 ? 1000 / strava.average_speed : null;

  switch (type) {
    case ActivityType.RUN:
      base.runMetrics = {
        create: {
          distanceM: strava.distance || null,
          elevationM: strava.total_elevation_gain || null,
          paceSecPerKm,
          avgHr: strava.average_heartrate ? Math.round(strava.average_heartrate) : null,
          avgPower: strava.average_watts ?? null,
          cadence: strava.average_cadence ? Math.round(strava.average_cadence * 2) : null,
        },
      };
      break;
    case ActivityType.BIKE:
      base.bikeMetrics = {
        create: {
          normalizedPower: strava.weighted_average_watts ?? null,
          avgPower: strava.average_watts ?? null,
          avgCadence: strava.average_cadence ? Math.round(strava.average_cadence) : null,
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
            strava.average_speed && strava.average_speed > 0 ? 100 / strava.average_speed : null,
        },
      };
      break;
    case ActivityType.STRENGTH:
      break;
  }

  return base;
}

/** Enrichit une activité Garmin existante avec les métriques Strava (streams via stravaId). */
function stravaEnrichmentUpdate(
  strava: StravaActivity,
  type: ActivityType,
  existingGarminId: string | null,
): Prisma.ActivityUpdateInput {
  const paceSecPerKm =
    strava.average_speed && strava.average_speed > 0 ? 1000 / strava.average_speed : null;

  const data: Prisma.ActivityUpdateInput = {
    stravaId: String(strava.id),
    source: mergedSource(Boolean(existingGarminId), true),
    title: strava.name,
    duration: strava.moving_time || strava.elapsed_time || undefined,
    load: strava.suffer_score ?? undefined,
  };

  switch (type) {
    case ActivityType.RUN:
      data.runMetrics = {
        upsert: {
          create: {
            distanceM: strava.distance || null,
            elevationM: strava.total_elevation_gain || null,
            paceSecPerKm,
            avgHr: strava.average_heartrate ? Math.round(strava.average_heartrate) : null,
            avgPower: strava.average_watts ?? null,
            cadence: strava.average_cadence ? Math.round(strava.average_cadence * 2) : null,
          },
          update: {
            distanceM: strava.distance || undefined,
            elevationM: strava.total_elevation_gain || undefined,
            paceSecPerKm: paceSecPerKm ?? undefined,
            avgHr: strava.average_heartrate ? Math.round(strava.average_heartrate) : undefined,
            avgPower: strava.average_watts ?? undefined,
            cadence: strava.average_cadence ? Math.round(strava.average_cadence * 2) : undefined,
          },
        },
      };
      break;
    case ActivityType.BIKE:
      data.bikeMetrics = {
        upsert: {
          create: {
            normalizedPower: strava.weighted_average_watts ?? null,
            avgPower: strava.average_watts ?? null,
            avgCadence: strava.average_cadence ? Math.round(strava.average_cadence) : null,
            elevationM: strava.total_elevation_gain || null,
            calories: strava.kilojoules ? Math.round(strava.kilojoules) : null,
            tss: strava.suffer_score ?? null,
          },
          update: {
            normalizedPower: strava.weighted_average_watts ?? undefined,
            avgPower: strava.average_watts ?? undefined,
            avgCadence: strava.average_cadence ? Math.round(strava.average_cadence) : undefined,
            elevationM: strava.total_elevation_gain || undefined,
            tss: strava.suffer_score ?? undefined,
          },
        },
      };
      break;
    case ActivityType.SWIM:
      data.swimMetrics = {
        upsert: {
          create: {
            distanceM: strava.distance || null,
            avgPaceSecPer100m:
              strava.average_speed && strava.average_speed > 0 ? 100 / strava.average_speed : null,
          },
          update: {
            distanceM: strava.distance || undefined,
            avgPaceSecPer100m:
              strava.average_speed && strava.average_speed > 0
                ? 100 / strava.average_speed
                : undefined,
          },
        },
      };
      break;
    case ActivityType.STRENGTH:
      break;
  }

  return data;
}

export interface SyncResult {
  fetched: number;
  imported: number;
  merged: number;
  skipped: number;
  importedTypes: ActivityType[];
  importedActivityIds: string[];
}

export async function syncStravaActivities(): Promise<SyncResult> {
  const [accessToken, account] = await Promise.all([getValidAccessToken(), getStravaAccount()]);

  const after = Math.floor(syncSinceFromLastSync(account?.lastSyncAt, 90).getTime() / 1000);

  let page = 1;
  let imported = 0;
  let merged = 0;
  let skipped = 0;
  let fetched = 0;
  const seenStravaIds = new Set<string>();
  const importedTypes = new Set<ActivityType>();
  const importedActivityIds: string[] = [];

  while (page <= 10) {
    const activities = await fetchActivities(accessToken, { after, page });
    if (!activities.length) break;
    fetched += activities.length;

    // 1) Dédoublonnage intra-sync + mapping de type.
    const candidates: { stravaId: string; type: ActivityType; strava: StravaActivity }[] = [];
    for (const strava of activities) {
      const stravaId = String(strava.id);
      if (seenStravaIds.has(stravaId)) {
        skipped += 1;
        continue;
      }
      seenStravaIds.add(stravaId);

      const type = mapStravaType(strava.sport_type ?? strava.type);
      if (!type) {
        skipped += 1;
        continue;
      }
      candidates.push({ stravaId, type, strava });
    }

    // 2) Un seul SELECT pour savoir lesquels existent déjà (évite le N+1).
    const existingIds = new Set(
      (
        await prisma.activity.findMany({
          where: { stravaId: { in: candidates.map((c) => c.stravaId) } },
          select: { stravaId: true },
        })
      ).map((r) => r.stravaId),
    );

    // 3) Création ou fusion avec une activité Garmin existante (parallel within page).
    const pending = candidates.filter((c) => !existingIds.has(c.stravaId));
    skipped += candidates.length - pending.length;

    const outcomes = await mapWithConcurrency(
      pending,
      STRAVA_ACTIVITY_CONCURRENCY,
      async ({ stravaId, type, strava }) => {
        const date = new Date(strava.start_date);
        const duration = strava.moving_time || strava.elapsed_time || null;
        const match = await findMatchingActivity({
          type,
          date,
          duration,
          stravaId,
        });

        if (match) {
          if (match.stravaId && match.stravaId !== stravaId) {
            return { kind: 'skipped' as const };
          }
          try {
            await prisma.activity.update({
              where: { id: match.id },
              data: stravaEnrichmentUpdate(strava, type, match.garminId),
            });
            if (!match.garminId) {
              await ingestStravaActivity(strava);
            }
            return {
              kind: 'merged' as const,
              type,
              activityId: match.id,
            };
          } catch (error) {
            if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
              return { kind: 'skipped' as const };
            }
            throw error;
          }
        }

        try {
          const created = await prisma.activity.create({
            data: buildActivityData(strava, type),
          });
          await ingestStravaActivity(strava);
          return {
            kind: 'imported' as const,
            type,
            activityId: created.id,
          };
        } catch (error) {
          if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
            return { kind: 'skipped' as const };
          }
          throw error;
        }
      },
    );

    for (const outcome of outcomes) {
      if (outcome.kind === 'skipped') {
        skipped += 1;
        continue;
      }
      importedTypes.add(outcome.type);
      importedActivityIds.push(outcome.activityId);
      if (outcome.kind === 'merged') merged += 1;
      else imported += 1;
    }

    if (activities.length < 100) break;
    page += 1;
  }

  await prisma.stravaAccount.update({
    where: { athleteId: ACCOUNT_ID },
    data: { lastSyncAt: new Date() },
  });

  return {
    fetched,
    imported,
    merged,
    skipped,
    importedTypes: [...importedTypes],
    importedActivityIds,
  };
}
