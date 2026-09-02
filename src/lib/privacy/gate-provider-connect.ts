import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import type { IntegrationId } from '@/lib/integrations/shared/client-sync';
import { requireProviderConnectConsent } from '@/lib/privacy/consent-store';

/**
 * Blocks provider connect when health / unofficial consents are missing.
 * OAuth GETs redirect to settings; credential POSTs get JSON 403.
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
  const dest = new URL('/settings/privacy', request.nextUrl.origin);
  dest.searchParams.set('error', 'provider_consent_required');
  dest.searchParams.set('provider', integrationId);
  return NextResponse.redirect(dest);
}
