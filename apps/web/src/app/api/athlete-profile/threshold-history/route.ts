import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { awaitRequest } from '@/lib/next/await-request';
import { getThresholdSnapshots } from '@/lib/queries';

export async function GET() {
  // Outside try: Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const snapshots = await getThresholdSnapshots(athleteId);
    return NextResponse.json(snapshots);
  } catch (error) {
    console.error('[threshold-history]', error);
    return NextResponse.json({ error: "Impossible de charger l'historique" }, { status: 500 });
  }
}
