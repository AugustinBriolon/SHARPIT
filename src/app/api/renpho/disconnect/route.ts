import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@/lib/integrations/clear-provider-prefs';
import { disconnectRenpho } from '@/lib/integrations/renpho/renpho-sync';

export async function POST() {
  const athleteId = await getCurrentAthleteId();
  await disconnectRenpho(athleteId);
  await clearProviderFromSourcePrefs(athleteId, 'renpho');
  return NextResponse.json({ success: true });
}
