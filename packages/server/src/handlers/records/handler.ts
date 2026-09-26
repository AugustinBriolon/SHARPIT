import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { awaitRequest } from '@sharpit/app/lib/next/await-request';
import { getStoredRecords } from '@sharpit/server/lib/training/records/records';

export async function GET() {
  // Outside try: Cache Components prerender interrupt must not be swallowed.
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const records = await getStoredRecords(athleteId);
    return NextResponse.json(records);
  } catch (error) {
    console.error('[api/records]', error);
    return NextResponse.json({ error: 'Impossible de charger les records' }, { status: 500 });
  }
}
