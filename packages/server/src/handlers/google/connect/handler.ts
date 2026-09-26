import { NextRequest, NextResponse } from 'next/server';
import {
  beginIntegrationConnect,
  connectNavigation,
  redirectIfBindHost,
} from '@sharpit/server/lib/integrations/oauth-return';
import {
  buildAuthorizeUrl,
  getGoogleRedirectUri,
  isGoogleConfigured,
} from '@sharpit/server/lib/integrations/google/google';
import { gateProviderConnect } from '@sharpit/server/lib/privacy/gate-provider-connect';

export async function GET(request: NextRequest) {
  const bindRedirect = redirectIfBindHost(request);
  if (bindRedirect) {
    return bindRedirect;
  }

  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error: 'Google non configuré. Ajoute GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env',
      },
      { status: 400 },
    );
  }

  const consentBlock = await gateProviderConnect(request, 'google', 'redirect');
  if (consentBlock) {
    return consentBlock;
  }

  const redirectUri = getGoogleRedirectUri();
  const state = await beginIntegrationConnect(request, 'google', redirectUri);
  return connectNavigation(request, buildAuthorizeUrl(state, redirectUri));
}
