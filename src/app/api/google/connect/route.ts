import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  buildAuthorizeUrl,
  getGoogleRedirectUri,
  isGoogleConfigured,
} from '@/lib/integrations/google';

export const dynamic = 'force-dynamic';

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
};

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error: 'Google non configuré. Ajoute GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env',
      },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = getGoogleRedirectUri();
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, OAUTH_COOKIE_OPTS);
  cookieStore.set('google_oauth_redirect', redirectUri, OAUTH_COOKIE_OPTS);

  return NextResponse.redirect(buildAuthorizeUrl(state, redirectUri));
}
