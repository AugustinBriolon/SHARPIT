import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { disconnectRenpho } from '@/lib/integrations/renpho/renpho-sync';

export async function POST() {
  const athleteId = await getCurrentAthleteId();
  await disconnectRenpho(athleteId);
  return NextResponse.json({ success: true });
}
