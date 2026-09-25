import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { redirectIfBindHost, setIntegrationReturnTo } from '@/lib/integrations/oauth-return';
import {
  buildAuthorizeUrl,
  getGoogleRedirectUri,
  isGoogleConfigured,
} from '@/lib/integrations/google/google';
import { gateProviderConnect } from '@/lib/privacy/gate-provider-connect';

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
  secure: process.env.NODE_ENV === 'production',
};

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

  const returnTo = request.nextUrl.searchParams.get('returnTo');
  const dataClass = request.nextUrl.searchParams.get('dataClass');
  await setIntegrationReturnTo(returnTo, dataClass);

  const state = randomBytes(16).toString('hex');
  const redirectUri = getGoogleRedirectUri();
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, OAUTH_COOKIE_OPTS);
  cookieStore.set('google_oauth_redirect', redirectUri, OAUTH_COOKIE_OPTS);

  return NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
}
