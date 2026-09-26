import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { connectNavigation, webOriginFor } from '@sharpit/app/lib/integrations/oauth-public-origin';
import type { IntegrationId } from '@sharpit/app/lib/integrations/shared/client-sync';
import { requireProviderConnectConsent } from '@sharpit/server/lib/privacy/consent-store';

/**
 * Blocks provider connect when health / unofficial consents are missing.
 * OAuth connects send the athlete to the consent settings of the web; credential POSTs get
 * JSON 403.
 * Kept free of `server-only` oauth-return so schema-only route tests stay importable.
 */
export async function gateProviderConnect(
  request: NextRequest,
  integrationId: IntegrationId,
  mode: 'redirect' | 'json' = 'json',
): Promise<NextResponse | null> {
  const athleteId = await getCurrentAthleteId();
  const blocked = await requireProviderConnectConsent(athleteId, integrationId);
  if (!blocked) {
    return null;
  }
  if (mode === 'json') {
    return blocked;
  }
  const dest = new URL('/settings/account', webOriginFor(request));
  dest.searchParams.set('error', 'provider_consent_required');
  dest.searchParams.set('provider', integrationId);
  dest.hash = 'confidentialite';
  return connectNavigation(request, dest);
}
