import { NextRequest, NextResponse } from 'next/server';
import {
  garminConnectErrorMessage,
  garminConnectSchema,
  SSO_DISABLED_MESSAGE,
} from '@/app/api/garmin/connect/connect-shared';
import { GARMIN_SSO_PAGE_PATH } from '@sharpit/server/lib/integrations/garmin/garmin-browser-sso';
import { startGarminBrowserSso } from '@sharpit/server/lib/integrations/garmin/garmin-sso-start';
import {
  publicOriginFromRequest,
  redirectIfBindHost,
} from '@sharpit/server/lib/integrations/oauth-return';
import { gateProviderConnect } from '@sharpit/server/lib/privacy/gate-provider-connect';

export const maxDuration = 60;

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
    const consentBlock = await gateProviderConnect(request, 'garmin', 'redirect');
    if (consentBlock) {
      return consentBlock;
    }

    return await startGarminBrowserSso(request, {
      returnTo: request.nextUrl.searchParams.get('returnTo'),
      dataClass: request.nextUrl.searchParams.get('dataClass'),
      pagePath: GARMIN_SSO_PAGE_PATH,
    });
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
