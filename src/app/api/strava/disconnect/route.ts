import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@/lib/integrations/clear-provider-prefs';
import { disconnectStrava } from '@/lib/integrations/strava/strava-sync';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    await disconnectStrava(athleteId);
    await clearProviderFromSourcePrefs(athleteId, 'strava');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
