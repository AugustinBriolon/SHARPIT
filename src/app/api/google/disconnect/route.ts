import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@/lib/integrations/clear-provider-prefs';
import { revokeProviderAccess } from '@/lib/integrations/provider-revocation';
import { disconnectGoogle } from '@/lib/integrations/google/google-sync';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    // Revoke at Google while we still hold the grant, then forget it.
    await revokeProviderAccess(athleteId, 'google');
    // Revoke at Google while we still hold the grant, then forget it.
    await revokeProviderAccess(athleteId, 'google');
    await disconnectGoogle(athleteId);
    await clearProviderFromSourcePrefs(athleteId, 'google');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Déconnexion échouée' }, { status: 500 });
  }
}
