import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@/lib/integrations/clear-provider-prefs';
import { disconnectWithings } from '@/lib/integrations/withings/withings-sync';

export async function POST() {
  const athleteId = await getCurrentAthleteId();
  await disconnectWithings(athleteId);
  await clearProviderFromSourcePrefs(athleteId, 'withings');
  return NextResponse.json({ ok: true });
}
