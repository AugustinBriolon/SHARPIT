import type { DataProvider } from '@/core/athlete-state/events';
import { syncGarminActivities } from '@/lib/integrations/garmin-activity-sync';
import {
  GARMIN_HEALTH_OPEN_PATH_FALLBACK_DAYS,
  getGarminAccount,
  syncGarminHealth,
} from '@/lib/integrations/garmin-sync';
import { getGoogleAccount, syncFromGoogle } from '@/lib/integrations/google-sync';
import { getRenphoAccount, syncRenphoHealth } from '@/lib/integrations/renpho-sync';
import { getStravaAccount, syncStravaActivities } from '@/lib/integrations/strava-sync';
import { getWithingsAccount, syncWithingsHealth } from '@/lib/integrations/withings-sync';

export type ProviderSyncResult = {
  provider: DataProvider;
  imported: number;
  updated: number;
  observationCount: number;
  activityIds: string[];
};

async function countRecentObservations(_provider: DataProvider): Promise<number> {
  return 0;
}

/**
 * Sync requested providers in parallel (failures isolated per provider).
 * Matches cron / manual Garmin parallelism for open-path latency.
 */
export async function syncProviders(
  providers: readonly DataProvider[],
): Promise<ProviderSyncResult[]> {
  if (providers.length === 0) return [];

  const settled = await Promise.all(
    providers.map(async (provider) => {
      try {
        return await syncSingleProvider(provider);
      } catch (error) {
        console.error(`[athlete-state/sync] ${provider} failed:`, error);
        return null;
      }
    }),
  );

  return settled.filter((r): r is ProviderSyncResult => r != null);
}

async function syncSingleProvider(provider: DataProvider): Promise<ProviderSyncResult | null> {
  switch (provider) {
    case 'garmin': {
      const account = await getGarminAccount();
      if (!account) return null;
      // Health ∥ activities — open path uses a short health fallback window;
      // cron / manual keep the wider default (60d / full).
      const [health, activities] = await Promise.all([
        syncGarminHealth({ days: GARMIN_HEALTH_OPEN_PATH_FALLBACK_DAYS }),
        syncGarminActivities(),
      ]);
      return {
        provider,
        imported: activities.imported,
        updated: activities.updated + activities.merged,
        observationCount: health.updated,
        activityIds: activities.importedActivityIds,
      };
    }
    case 'strava': {
      const account = await getStravaAccount();
      if (!account) return null;
      const strava = await syncStravaActivities();
      return {
        provider,
        imported: strava.imported,
        updated: strava.merged,
        observationCount: await countRecentObservations(provider),
        activityIds: strava.importedActivityIds,
      };
    }
    case 'renpho': {
      const account = await getRenphoAccount();
      if (!account) return null;
      const renpho = await syncRenphoHealth();
      return {
        provider,
        imported: renpho.imported,
        updated: renpho.updated,
        observationCount: renpho.imported + renpho.updated,
        activityIds: [],
      };
    }
    case 'withings': {
      const account = await getWithingsAccount();
      if (!account) return null;
      const withings = await syncWithingsHealth();
      return {
        provider,
        imported: withings.imported,
        updated: withings.updated,
        observationCount: withings.imported + withings.updated,
        activityIds: [],
      };
    }
    case 'google': {
      const account = await getGoogleAccount();
      if (!account?.targetCalendarId) return null;
      const google = await syncFromGoogle();
      return {
        provider,
        imported: google.pushed,
        updated: google.updated,
        observationCount: 0,
        activityIds: [],
      };
    }
    default:
      return null;
  }
}

export async function listConnectedProviders(): Promise<DataProvider[]> {
  const [strava, garmin, renpho, withings, google] = await Promise.all([
    getStravaAccount(),
    getGarminAccount(),
    getRenphoAccount(),
    getWithingsAccount(),
    getGoogleAccount(),
  ]);

  const connected: DataProvider[] = [];
  if (garmin) connected.push('garmin');
  if (strava) connected.push('strava');
  if (renpho) connected.push('renpho');
  if (withings) connected.push('withings');
  if (google?.targetCalendarId) connected.push('google');
  return connected;
}
