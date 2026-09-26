import { NextRequest, NextResponse } from 'next/server';
import {
  beginIntegrationConnect,
  connectNavigation,
  publicOriginFromRequest,
  redirectIfBindHost,
} from '@sharpit/server/lib/integrations/oauth-return';
import {
  buildWithingsAuthorizeUrl,
  getWithingsRedirectUri,
  isWithingsConfigured,
} from '@sharpit/server/lib/integrations/withings/withings';
import { gateProviderConnect } from '@sharpit/server/lib/privacy/gate-provider-connect';

export async function GET(request: NextRequest) {
  const bindRedirect = redirectIfBindHost(request);
  if (bindRedirect) {
    return bindRedirect;
  }

  if (!isWithingsConfigured()) {
    return NextResponse.json(
      {
        error:
          'Withings non configuré. Ajoute WITHINGS_CLIENT_ID et WITHINGS_CLIENT_SECRET dans .env',
      },
      { status: 400 },
    );
  }

  const consentBlock = await gateProviderConnect(request, 'withings', 'redirect');
  if (consentBlock) {
    return consentBlock;
  }

  const origin = publicOriginFromRequest(request);
  const state = await beginIntegrationConnect(request, 'withings', getWithingsRedirectUri(origin));
  return connectNavigation(request, buildWithingsAuthorizeUrl(state, origin));
}
