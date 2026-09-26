import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { clearProviderFromSourcePrefs } from '@sharpit/server/lib/integrations/clear-provider-prefs';
import { revokeProviderAccess } from '@sharpit/server/lib/integrations/provider-revocation';
import { disconnectWithings } from '@sharpit/server/lib/integrations/withings/withings-sync';

export async function POST() {
  const athleteId = await getCurrentAthleteId();
  // Revoke at Withings while we still hold the grant, then forget it.
  await revokeProviderAccess(athleteId, 'withings');
  await disconnectWithings(athleteId);
  await clearProviderFromSourcePrefs(athleteId, 'withings');
  return NextResponse.json({ ok: true });
}
