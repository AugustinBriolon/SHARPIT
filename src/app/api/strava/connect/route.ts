import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  publicOriginFromRequest,
  redirectIfBindHost,
  setIntegrationReturnTo,
} from '@/lib/integrations/oauth-return';
import { buildAuthorizeUrl, isStravaConfigured } from '@/lib/integrations/strava/strava';

export async function GET(request: NextRequest) {
  const bindRedirect = redirectIfBindHost(request);
  if (bindRedirect) return bindRedirect;

  if (!isStravaConfigured()) {
    return NextResponse.json(
      {
        error: 'Strava non configuré. Ajoute STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET dans .env',
      },
      { status: 400 },
    );
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
  });

  const origin = publicOriginFromRequest(request);
  return NextResponse.redirect(buildAuthorizeUrl(state, origin));
}
