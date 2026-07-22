import { NextRequest, NextResponse } from 'next/server';
import { onProviderSyncCompleted } from '@/lib/athlete-state/orchestrator';
import { syncGarminActivities } from '@/lib/integrations/garmin-activity-sync';
import { syncGarminHealth } from '@/lib/integrations/garmin-sync';
import { filterRecordChangesByActivities, updateRecordsForTypes } from '@/lib/training/records';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    let full = false;
    try {
      const body = await request.json();
      if (body?.full) full = true;
    } catch {
      // pas de body → sync incrémentale depuis dernière sync
    }

    const health = await syncGarminHealth(full ? { full: true } : {});
    const activities = await syncGarminActivities(full ? { full: true } : {});

    let recordChanges: Awaited<ReturnType<typeof updateRecordsForTypes>> = [];
    if (activities.changedTypes.length > 0) {
      const allChanges = await updateRecordsForTypes(activities.changedTypes);
      recordChanges = filterRecordChangesByActivities(allChanges, activities.changedActivityIds);
    }

    await onProviderSyncCompleted(
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
