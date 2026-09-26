import { NextRequest, NextResponse } from 'next/server';
import {
  beginIntegrationConnect,
  connectNavigation,
  publicOriginFromRequest,
  redirectIfBindHost,
} from '@sharpit/server/lib/integrations/oauth-return';
import { isProviderConnectable } from '@sharpit/app/lib/integrations/provider-catalog';
import {
  buildAuthorizeUrl,
  getStravaRedirectUri,
  isStravaConfigured,
} from '@sharpit/server/lib/integrations/strava/strava';
import { gateProviderConnect } from '@sharpit/server/lib/privacy/gate-provider-connect';

export async function GET(request: NextRequest) {
  const bindRedirect = redirectIfBindHost(request);
  if (bindRedirect) {
    return bindRedirect;
  }

  if (!isProviderConnectable('strava')) {
    return NextResponse.json({ error: 'Strava est temporairement indisponible.' }, { status: 503 });
  }

  if (!isStravaConfigured()) {
    return NextResponse.json(
      {
        error: 'Strava non configuré. Ajoute STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET dans .env',
      },
      { status: 400 },
    );
  }

  const consentBlock = await gateProviderConnect(request, 'strava', 'redirect');
  if (consentBlock) {
    return consentBlock;
  }

  const origin = publicOriginFromRequest(request);
  const state = await beginIntegrationConnect(request, 'strava', getStravaRedirectUri(origin));
  return connectNavigation(request, buildAuthorizeUrl(state, origin));
}
