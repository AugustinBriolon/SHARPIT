import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@/lib/integrations/clear-provider-prefs';
import { disconnectMfp } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    await disconnectMfp(athleteId);
    await clearProviderFromSourcePrefs(athleteId, 'myfitnesspal');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
