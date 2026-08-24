import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { getStoredRecords } from '@/lib/training/records';

export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const records = await getStoredRecords(athleteId);
    return NextResponse.json(records);
  } catch (error) {
    console.error('[api/records]', error);
    return NextResponse.json({ error: 'Impossible de charger les records' }, { status: 500 });
  }
}
