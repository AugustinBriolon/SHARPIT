import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { isProviderConnectable } from '@sharpit/app/lib/integrations/provider-catalog';
import {
  filterRecordChangesByActivities,
  recomputeRecordGroups,
} from '@sharpit/server/lib/training/records/records';
import { backfillActivityStreams } from '@sharpit/server/lib/streams/stream-backfill';
import { getStravaAccount } from '@sharpit/server/lib/integrations/strava/strava-sync';

export async function POST() {
  try {
    if (!isProviderConnectable('strava')) {
      return NextResponse.json(
        { error: 'Strava est temporairement indisponible.' },
        { status: 503 },
      );
    }

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
