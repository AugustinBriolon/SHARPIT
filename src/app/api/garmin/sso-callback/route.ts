import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  GARMIN_SSO_STATE_COOKIE,
  isGarminSsoTicket,
  parseGarminSsoState,
} from '@/lib/integrations/garmin/garmin-browser-sso';
import { exchangeServiceTicketForDiTokens } from '@/lib/integrations/garmin/garmin-di-oauth';
import { importGarminDiTokenStore } from '@/lib/integrations/garmin/garmin-sync';
import { redirectAfterIntegrationConnect } from '@/lib/integrations/oauth-return';

export const maxDuration = 60;

const postBodySchema = z.object({
  ticket: z.string().min(1).max(500),
});

async function completeGarminSso(
  request: NextRequest,
  ticket: string | null,
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const rawState = cookieStore.get(GARMIN_SSO_STATE_COOKIE)?.value;
  cookieStore.delete(GARMIN_SSO_STATE_COOKIE);

  const state = parseGarminSsoState(rawState);
  if (!state) {
    console.info('[api/garmin/sso-callback]', { step: 'state', ok: false });
    return redirectAfterIntegrationConnect(request, 'garmin', 'invalid_state');
  }

  if (!isGarminSsoTicket(ticket)) {
    console.info('[api/garmin/sso-callback]', {
      step: 'ticket',
      ok: false,
      hasTicket: Boolean(ticket),
    });
    return redirectAfterIntegrationConnect(request, 'garmin', 'denied');
  }

  try {
    const athleteId = await getCurrentAthleteId();
    if (athleteId !== state.athleteId) {
      console.info('[api/garmin/sso-callback]', { step: 'athlete', ok: false });
      return redirectAfterIntegrationConnect(request, 'garmin', 'invalid_state');
    }

    // service_url MUST match the SSO `service` used when minting the ticket (embed).
    const di = await exchangeServiceTicketForDiTokens(ticket, state.service);
    await importGarminDiTokenStore(athleteId, {
      di_token: di.accessToken,
      di_refresh_token: di.refreshToken,
      di_client_id: di.diClientId,
    });

    console.info('[api/garmin/sso-callback]', {
      step: 'connected',
      ok: true,
      ticketPresent: true,
    });
    return redirectAfterIntegrationConnect(request, 'garmin', 'connected');
  } catch (error) {
    console.error('[api/garmin/sso-callback] exchange failed', {
      name: error instanceof Error ? error.name : 'Error',
      message: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    });
    return redirectAfterIntegrationConnect(request, 'garmin', 'error');
  }
}

/**
 * Legacy CAS redirect callback (third-party `service` URL). Kept for completeness;
 * primary UX posts the ticket from the embed iframe via POST (see below).
 */
export async function GET(request: NextRequest) {
  const ticket = request.nextUrl.searchParams.get('ticket');
  return completeGarminSso(request, ticket);
}

/**
 * Primary path: client received ST-… via postMessage from sso.garmin.com iframe,
 * then POSTs it here with the signed CSRF cookie. Never logs the ticket.
 */
export async function POST(request: NextRequest) {
  let ticket: string | null = null;
  try {
    const json = (await request.json()) as unknown;
    const parsed = postBodySchema.safeParse(json);
    if (parsed.success) {
      ticket = parsed.data.ticket;
    }
  } catch {
    ticket = null;
  }

  const result = await completeGarminSso(request, ticket);

  // Client expects JSON with a redirect URL (fetch cannot follow cross-origin
  // Location to HTML the way we want for SPA navigation).
  const location = result.headers.get('Location');
  if (location) {
    const status =
      location.includes('garmin=connected')
        ? 'connected'
        : location.includes('garmin=invalid_state')
          ? 'invalid_state'
          : location.includes('garmin=denied')
            ? 'denied'
            : 'error';
    return NextResponse.json(
      { ok: status === 'connected', status, redirectTo: location },
      { status: status === 'connected' ? 200 : 400 },
    );
  }

  return result;
}
