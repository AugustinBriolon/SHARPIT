import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@sharpit/server/lib/integrations/clear-provider-prefs';
import { revokeProviderAccess } from '@sharpit/server/lib/integrations/provider-revocation';
import { disconnectStrava } from '@sharpit/server/lib/integrations/strava/strava-sync';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    // Revoke at Strava while we still hold the grant, then forget it.
    await revokeProviderAccess(athleteId, 'strava');
    // Revoke at Strava while we still hold the grant, then forget it.
    await revokeProviderAccess(athleteId, 'strava');
    await disconnectStrava(athleteId);
    await clearProviderFromSourcePrefs(athleteId, 'strava');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
