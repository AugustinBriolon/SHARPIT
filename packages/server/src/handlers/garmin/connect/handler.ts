import { NextRequest, NextResponse } from 'next/server';
import {
  garminConnectErrorMessage,
  garminConnectSchema,
  SSO_DISABLED_MESSAGE,
} from '@sharpit/server/handlers/garmin/connect/connect-shared';
import { GARMIN_SSO_PAGE_PATH } from '@sharpit/server/lib/integrations/garmin/garmin-browser-sso-shared';
import { CONNECT_GARMIN_CALLBACK_PATH } from '@sharpit/server/lib/integrations/garmin/garmin-connect-handoff';
import {
  garminSsoPageUrl,
  startGarminHandoff,
} from '@sharpit/server/lib/integrations/garmin/garmin-sso-start';
import {
  connectNavigation,
  redirectIfBindHost,
  webOriginFor,
} from '@sharpit/server/lib/integrations/oauth-return';
import { gateProviderConnect } from '@sharpit/server/lib/privacy/gate-provider-connect';

/**
 * Start browser CAS SSO — opens the Sharpit page that embeds Garmin's SSO iframe (password
 * typed on Garmin, never on Sharpit), carrying the signed connect state. The native handoff
 * (return to `/connect/garmin/callback`) has its own exits, all on the callback URL.
 */
export async function GET(request: NextRequest) {
  const bindRedirect = redirectIfBindHost(request);
  if (bindRedirect) {
    return bindRedirect;
  }
  if (request.nextUrl.searchParams.get('returnTo') === CONNECT_GARMIN_CALLBACK_PATH) {
    return startGarminHandoff(request);
  }

  try {
    const consentBlock = await gateProviderConnect(request, 'garmin', 'redirect');
    if (consentBlock) {
      return consentBlock;
    }
    return connectNavigation(request, await garminSsoPageUrl(request, GARMIN_SSO_PAGE_PATH));
  } catch (error) {
    console.error('[api/garmin/connect] start SSO failed', {
      name: error instanceof Error ? error.name : 'Error',
    });
    return connectNavigation(
      request,
      new URL('/settings/integrations?garmin=error', webOriginFor(request)),
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
