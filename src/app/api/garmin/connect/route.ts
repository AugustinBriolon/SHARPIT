import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  garminConnectErrorMessage,
  garminConnectSchema,
  SSO_DISABLED_MESSAGE,
} from '@/app/api/garmin/connect/connect-shared';
import {
  createGarminSsoState,
  GARMIN_SSO_PAGE_PATH,
  GARMIN_SSO_STATE_COOKIE,
} from '@/lib/integrations/garmin/garmin-browser-sso';
import {
  publicOriginFromRequest,
  redirectIfBindHost,
  sanitizeIntegrationReturnTo,
  setIntegrationReturnTo,
} from '@/lib/integrations/oauth-return';

export const maxDuration = 60;

export {
  garminConnectErrorMessage,
  garminConnectSchema,
  SSO_DISABLED_MESSAGE,
} from '@/app/api/garmin/connect/connect-shared';

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
  secure: process.env.NODE_ENV === 'production',
};

/**
 * Start browser CAS SSO — sets CSRF state, then opens the Sharpit page that
 * embeds Garmin's SSO iframe (password typed on Garmin, never on Sharpit).
 */
export async function GET(request: NextRequest) {
  const bindRedirect = redirectIfBindHost(request);
  if (bindRedirect) {
    return bindRedirect;
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const returnTo = request.nextUrl.searchParams.get('returnTo');
    const dataClass = request.nextUrl.searchParams.get('dataClass');
    await setIntegrationReturnTo(returnTo, dataClass);

    const state = createGarminSsoState({ athleteId });
    const cookieStore = await cookies();
    cookieStore.set(GARMIN_SSO_STATE_COOKIE, state, OAUTH_COOKIE_OPTS);

    const target = new URL(GARMIN_SSO_PAGE_PATH, publicOriginFromRequest(request));
    target.searchParams.set('returnTo', sanitizeIntegrationReturnTo(returnTo));
    return NextResponse.redirect(target);
  } catch (error) {
    console.error('[api/garmin/connect] start SSO failed', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.redirect(
      new URL('/settings/integrations?garmin=error', publicOriginFromRequest(request)),
    );
  }
}

/** Password SSO via Node fetch is a dead end — honest 501 only. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = garminConnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    return NextResponse.json(
      { error: SSO_DISABLED_MESSAGE, code: 'garmin_sso_disabled' },
      { status: 501 },
    );
  } catch (error) {
    console.error('[api/garmin/connect]', error);
    return NextResponse.json({ error: garminConnectErrorMessage(error) }, { status: 401 });
  }
}
