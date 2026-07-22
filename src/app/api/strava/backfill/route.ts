import { NextResponse } from 'next/server';
import { filterRecordChangesByActivities, recomputeRecordGroups } from '@/lib/training/records';
import { backfillActivityStreams } from '@/lib/streams/stream-backfill';
import { getStravaAccount } from '@/lib/integrations/strava-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  try {
    const account = await getStravaAccount();
    if (!account) {
      return NextResponse.json({ error: 'Compte Strava non connecté' }, { status: 400 });
    }
    const result = await backfillActivityStreams(40);
    let recordChanges: Awaited<ReturnType<typeof recomputeRecordGroups>> = [];

    if (result.withData > 0) {
      const allChanges = await recomputeRecordGroups(new Set(['power', 'run-best']));
      recordChanges = filterRecordChangesByActivities(allChanges, result.activityIdsWithData);
    }

    return NextResponse.json({ ...result, recordChanges });
  } catch (error) {
    console.error('[api/strava/backfill]', error);
    const message = error instanceof Error ? error.message : 'Backfill échoué';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
