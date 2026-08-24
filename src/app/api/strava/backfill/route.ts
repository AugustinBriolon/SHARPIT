import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { filterRecordChangesByActivities, recomputeRecordGroups } from '@/lib/training/records';
import { backfillActivityStreams } from '@/lib/streams/stream-backfill';
import { getStravaAccount } from '@/lib/integrations/strava/strava-sync';

export const maxDuration = 120;

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    const account = await getStravaAccount(athleteId);
    if (!account) {
      return NextResponse.json({ error: 'Compte Strava non connecté' }, { status: 400 });
    }
    const result = await backfillActivityStreams(athleteId, 40);
    let recordChanges: Awaited<ReturnType<typeof recomputeRecordGroups>> = [];

    if (result.withData > 0) {
      const allChanges = await recomputeRecordGroups(athleteId, new Set(['power', 'run-best']));
      recordChanges = filterRecordChangesByActivities(allChanges, result.activityIdsWithData);
    }

    return NextResponse.json({ ...result, recordChanges });
  } catch (error) {
    console.error('[api/strava/backfill]', error);
    const message = error instanceof Error ? error.message : 'Backfill échoué';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
