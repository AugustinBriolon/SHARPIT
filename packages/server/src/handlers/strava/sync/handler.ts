import { NextResponse } from 'next/server';
import { onProviderSyncCompleted } from '@sharpit/server/lib/athlete-state/orchestrator';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { isProviderConnectable } from '@sharpit/server/lib/integrations/provider-catalog';
import {
  checkRateLimit,
  rateLimitJsonResponse,
  rateLimiters,
} from '@sharpit/server/lib/rate-limit';
import {
  filterRecordChangesByActivities,
  updateRecordsForTypes,
} from '@sharpit/server/lib/training/records/records';
import { syncStravaActivities } from '@sharpit/server/lib/integrations/strava/strava-sync';

export async function POST() {
  try {
    if (!isProviderConnectable('strava')) {
      return NextResponse.json(
        { error: 'Strava est temporairement indisponible.' },
        { status: 503 },
      );
    }

    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:strava`, {
      failClosed: true,
    });
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, {
        status: limited.status,
      });
    }
    const result = await syncStravaActivities(athleteId);
    let recordChanges: Awaited<ReturnType<typeof updateRecordsForTypes>> = [];

    if (result.importedTypes.length > 0) {
      const allChanges = await updateRecordsForTypes(athleteId, result.importedTypes);
      recordChanges = filterRecordChangesByActivities(allChanges, result.importedActivityIds);
    }

    await onProviderSyncCompleted(
      athleteId,
      [
        {
          provider: 'strava',
          imported: result.imported,
          updated: result.merged,
          observationCount: 0,
          activityIds: result.importedActivityIds,
        },
      ],
      undefined,
      { skipRecordUpdate: result.importedTypes.length > 0 },
    );

    return NextResponse.json({ ...result, recordChanges });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
