import { NextResponse } from 'next/server';
import { onProviderSyncCompleted } from '@/lib/athlete-state/orchestrator';
import { filterRecordChangesByActivities, updateRecordsForTypes } from '@/lib/records';
import { syncStravaActivities } from '@/lib/integrations/strava-sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncStravaActivities();
    let recordChanges: Awaited<ReturnType<typeof updateRecordsForTypes>> = [];

    if (result.importedTypes.length > 0) {
      const allChanges = await updateRecordsForTypes(result.importedTypes);
      recordChanges = filterRecordChangesByActivities(allChanges, result.importedActivityIds);
    }

    await onProviderSyncCompleted([
      {
        provider: 'strava',
        imported: result.imported,
        updated: result.merged,
        observationCount: 0,
        activityIds: result.importedActivityIds,
      },
    ]);

    return NextResponse.json({ ...result, recordChanges });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
