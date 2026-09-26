import 'server-only';

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  createGarminSsoState,
  GARMIN_SSO_STATE_COOKIE,
} from '@sharpit/server/lib/integrations/garmin/garmin-browser-sso';
import {
  publicOriginFromRequest,
  sanitizeIntegrationReturnTo,
  setIntegrationReturnTo,
} from '@sharpit/server/lib/integrations/oauth-return';

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
  secure: process.env.NODE_ENV === 'production',
};

/**
 * Arms a Garmin browser SSO: remembers where to land afterwards, sets the signed CSRF
 * state cookie bound to the athlete, then redirects to the page that embeds Garmin's
 * sign-in. `/api/garmin/sso-callback` checks that state before storing any token.
 */
export async function startGarminBrowserSso(
  request: NextRequest,
  options: { returnTo: string | null; dataClass: string | null; pagePath: string },
): Promise<NextResponse> {
  const athleteId = await getCurrentAthleteId();
  await setIntegrationReturnTo(options.returnTo, options.dataClass);

  const state = createGarminSsoState({ athleteId });
  const cookieStore = await cookies();
  cookieStore.set(GARMIN_SSO_STATE_COOKIE, state, OAUTH_COOKIE_OPTS);

  const target = new URL(options.pagePath, publicOriginFromRequest(request));
  target.searchParams.set('returnTo', sanitizeIntegrationReturnTo(options.returnTo));
  return NextResponse.redirect(target);
}
