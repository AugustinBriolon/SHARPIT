import { NextRequest, NextResponse } from 'next/server';
import { onProviderSyncCompleted } from '@/lib/athlete-state/orchestrator';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { syncGarminActivities } from '@/lib/integrations/garmin/garmin-activity-sync';
import { syncGarminHealth } from '@/lib/integrations/garmin/garmin-sync';
import { filterRecordChangesByActivities, updateRecordsForTypes } from '@/lib/training/records';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    let full = false;
    try {
      const body = await request.json();
      if (body?.full) full = true;
    } catch {
      // pas de body → sync incrémentale depuis dernière sync
    }

    const [health, activities] = await Promise.all([
      syncGarminHealth(athleteId, full ? { full: true } : {}),
      syncGarminActivities(athleteId, full ? { full: true } : {}),
    ]);

    let recordChanges: Awaited<ReturnType<typeof updateRecordsForTypes>> = [];
    if (activities.changedTypes.length > 0) {
      const allChanges = await updateRecordsForTypes(athleteId, activities.changedTypes);
      recordChanges = filterRecordChangesByActivities(allChanges, activities.changedActivityIds);
    }

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
