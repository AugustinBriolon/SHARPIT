import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  CONNECT_GARMIN_AUTHORIZE_PATH,
  CONNECT_GARMIN_CALLBACK_PATH,
  garminHandoffCallbackPath,
} from '@/lib/integrations/garmin/garmin-connect-handoff';
import { startGarminBrowserSso } from '@/lib/integrations/garmin/garmin-sso-start';
import { getGarminAccount } from '@/lib/integrations/garmin/garmin-sync';
import { publicOriginFromRequest, redirectIfBindHost } from '@/lib/integrations/oauth-return';
import { athleteCanConnectProvider } from '@/lib/privacy/consent-store';

/**
 * Native Garmin handoff, step 2 — arms the SSO state and opens the Garmin sign-in.
 * Every exit lands on the callback URL, so the iOS session always closes with an outcome.
 */
export async function GET(request: NextRequest) {
  const bindRedirect = redirectIfBindHost(request);
  if (bindRedirect) {
    return bindRedirect;
  }
  const origin = publicOriginFromRequest(request);

  try {
    const athleteId = await getCurrentAthleteId();
    // Server redirects only: the iOS session notices the callback on a real page load.
    if (await getGarminAccount(athleteId)) {
      return NextResponse.redirect(new URL(garminHandoffCallbackPath('already_connected'), origin));
    }
    if (!(await athleteCanConnectProvider(athleteId, 'garmin'))) {
      return NextResponse.redirect(new URL(garminHandoffCallbackPath('consent_required'), origin));
    }
    return await startGarminBrowserSso(request, {
      returnTo: CONNECT_GARMIN_CALLBACK_PATH,
      dataClass: null,
      pagePath: CONNECT_GARMIN_AUTHORIZE_PATH,
    });
  } catch (error) {
    console.error('[connect/garmin/start]', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return NextResponse.redirect(new URL(garminHandoffCallbackPath('error'), origin));
  }
}
