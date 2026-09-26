import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  publicOriginFromRequest,
  redirectIfBindHost,
  setIntegrationReturnTo,
} from '@sharpit/server/lib/integrations/oauth-return';
import { isProviderConnectable } from '@sharpit/server/lib/integrations/provider-catalog';
import {
  buildAuthorizeUrl,
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

  const returnTo = request.nextUrl.searchParams.get('returnTo');
  const dataClass = request.nextUrl.searchParams.get('dataClass');
  await setIntegrationReturnTo(returnTo, dataClass);

  const state = randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('strava_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  });

  const origin = publicOriginFromRequest(request);
  return NextResponse.redirect(buildAuthorizeUrl(state, origin));
}
