import type { DataProvider } from '@/core/athlete-state/events';
import { syncGarminActivities } from '@/lib/integrations/garmin-activity-sync';
import { getGarminAccount, syncGarminHealth } from '@/lib/integrations/garmin-sync';
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

export async function syncProviders(
  providers: readonly DataProvider[],
): Promise<ProviderSyncResult[]> {
  const results: ProviderSyncResult[] = [];

  for (const provider of providers) {
    try {
      const result = await syncSingleProvider(provider);
      if (result) results.push(result);
    } catch (error) {
      console.error(`[athlete-state/sync] ${provider} failed:`, error);
    }
  }

  return results;
}

async function syncSingleProvider(provider: DataProvider): Promise<ProviderSyncResult | null> {
  switch (provider) {
    case 'garmin': {
      const account = await getGarminAccount();
      if (!account) return null;
      await syncGarminHealth();
      const activities = await syncGarminActivities();
      return {
        provider,
        imported: activities.imported,
        updated: activities.updated + activities.merged,
        observationCount: await countRecentObservations(provider),
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
