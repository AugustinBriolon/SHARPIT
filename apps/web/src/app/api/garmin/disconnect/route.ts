import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@/lib/integrations/clear-provider-prefs';
import { disconnectGarmin } from '@/lib/integrations/garmin/garmin-sync';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    await disconnectGarmin(athleteId);
    await clearProviderFromSourcePrefs(athleteId, 'garmin');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
