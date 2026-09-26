import 'server-only';

import type { NextRequest } from 'next/server';
import type { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  CONNECT_GARMIN_AUTHORIZE_PATH,
  CONNECT_GARMIN_CALLBACK_PATH,
  type GarminHandoffStatus,
  garminHandoffCallbackPath,
} from '@sharpit/app/lib/integrations/garmin/garmin-connect-handoff';
import { getGarminAccount } from '@sharpit/server/lib/integrations/garmin/garmin-sync';
import {
  beginIntegrationConnect,
  connectNavigation,
  sanitizeIntegrationReturnTo,
  webOriginFor,
} from '@sharpit/server/lib/integrations/oauth-return';
import { athleteCanConnectProvider } from '@sharpit/server/lib/privacy/consent-store';

/**
 * Arms a Garmin browser SSO: the page that embeds Garmin's sign-in, on the web origin the
 * athlete started from, carrying the signed connect `state` (athlete, return path). The page
 * posts it back with the ticket; `/api/garmin/sso-callback` checks it before storing any token.
 */
export async function garminSsoPageUrl(
  request: NextRequest,
  pagePath: string,
  returnTo = request.nextUrl.searchParams.get('returnTo'),
): Promise<URL> {
  const state = await beginIntegrationConnect(request, 'garmin', null, returnTo);
  const target = new URL(pagePath, webOriginFor(request));
  target.searchParams.set('returnTo', sanitizeIntegrationReturnTo(returnTo));
  target.searchParams.set('state', state);
  return target;
}

/**
 * Native Garmin handoff (ADR-040/047): arms the SSO for the in-app authentication session.
 * Every exit lands on the callback URL, so the iOS session always closes with an outcome.
 */
export async function startGarminHandoff(request: NextRequest): Promise<NextResponse> {
  const leave = (status: GarminHandoffStatus) =>
    connectNavigation(request, new URL(garminHandoffCallbackPath(status), webOriginFor(request)));
  try {
    const athleteId = await getCurrentAthleteId();
    if (await getGarminAccount(athleteId)) {
      return leave('already_connected');
    }
    if (!(await athleteCanConnectProvider(athleteId, 'garmin'))) {
      return leave('consent_required');
    }
    return connectNavigation(
      request,
      await garminSsoPageUrl(request, CONNECT_GARMIN_AUTHORIZE_PATH, CONNECT_GARMIN_CALLBACK_PATH),
    );
  } catch (error) {
    console.error('[garmin/handoff] start SSO failed', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return leave('error');
  }
}
