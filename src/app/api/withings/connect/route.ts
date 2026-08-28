import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  publicOriginFromRequest,
  redirectIfBindHost,
  setIntegrationReturnTo,
} from '@/lib/integrations/oauth-return';
import {
  buildWithingsAuthorizeUrl,
  getWithingsRedirectUri,
  isWithingsConfigured,
} from '@/lib/integrations/withings/withings';

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

  const returnTo = request.nextUrl.searchParams.get('returnTo');
  const dataClass = request.nextUrl.searchParams.get('dataClass');
  await setIntegrationReturnTo(returnTo, dataClass);

  const state = randomBytes(16).toString('hex');
  const origin = publicOriginFromRequest(request);
  const redirectUri = getWithingsRedirectUri(origin);

  const cookieStore = await cookies();
  cookieStore.set('withings_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  });
  cookieStore.set('withings_oauth_redirect', redirectUri, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
    secure: process.env.NODE_ENV === 'production',
  });

  return NextResponse.redirect(buildWithingsAuthorizeUrl(state, origin));
}
