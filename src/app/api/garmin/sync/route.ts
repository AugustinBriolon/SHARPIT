import { NextRequest, NextResponse } from 'next/server';
import { onProviderSyncCompleted } from '@/lib/athlete-state/orchestrator';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncGarminActivities } from '@/lib/integrations/garmin/garmin-activity-sync';
import { syncGarminHealth } from '@/lib/integrations/garmin/garmin-sync';
import { checkRateLimit, rateLimitResponseBody, rateLimiters } from '@/lib/rate-limit';
import { filterRecordChangesByActivities, updateRecordsForTypes } from '@/lib/training/records';

export const maxDuration = 300;

async function parseFullSyncFlag(request: NextRequest) {
  try {
    const body = await request.json();
    return Boolean(body?.full);
  } catch {
    return false;
  }
}

async function updateRecordChanges(
  athleteId: string,
  activities: Awaited<ReturnType<typeof syncGarminActivities>>,
) {
  if (activities.changedTypes.length === 0) {
    return [];
  }
  const allChanges = await updateRecordsForTypes(athleteId, activities.changedTypes);
  return filterRecordChangesByActivities(allChanges, activities.changedActivityIds);
}

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const rateLimit = await checkRateLimit(rateLimiters.providerSync, `${athleteId}:garmin`);
    if (!rateLimit.ok) {
      return NextResponse.json(rateLimitResponseBody(rateLimit.retryAfterSeconds), {
        status: 429,
      });
    }
    const full = await parseFullSyncFlag(request);
    const syncOptions = full ? { full: true as const } : {};

    const [health, activities] = await Promise.all([
      syncGarminHealth(athleteId, syncOptions),
      syncGarminActivities(athleteId, syncOptions),
    ]);

    const recordChanges = await updateRecordChanges(athleteId, activities);

    await onProviderSyncCompleted(
      athleteId,
      [
        {
          provider: 'garmin',
          imported: activities.imported,
          updated: activities.updated + activities.merged,
          observationCount: health.updated,
          activityIds: activities.importedActivityIds,
        },
      ],
      undefined,
      { skipRecordUpdate: activities.changedTypes.length > 0 },
    );
    return NextResponse.json({ ...health, activities, recordChanges });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
