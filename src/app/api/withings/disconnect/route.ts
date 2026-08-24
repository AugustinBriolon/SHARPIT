import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { disconnectWithings } from '@/lib/integrations/withings/withings-sync';

export async function POST() {
  const athleteId = await getCurrentAthleteId();
  await disconnectWithings(athleteId);
  return NextResponse.json({ ok: true });
}
