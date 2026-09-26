import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  GARMIN_SSO_EMBED_SERVICE,
  isGarminSsoTicket,
} from '@sharpit/server/lib/integrations/garmin/garmin-browser-sso-shared';
import { exchangeServiceTicketForDiTokens } from '@sharpit/server/lib/integrations/garmin/garmin-di-oauth';
import { importGarminDiTokenStore } from '@sharpit/server/lib/integrations/garmin/garmin-sync';
import { redirectAfterIntegrationConnect } from '@sharpit/server/lib/integrations/oauth-return';
import { readConnectState } from '@sharpit/server/lib/integrations/oauth-state';

const postBodySchema = z.object({
  ticket: z.string().min(1).max(500),
  state: z.string().min(1).max(2000),
});

async function completeGarminSso(
  request: NextRequest,
  ticket: string | null,
  rawState: string | null,
): Promise<NextResponse> {
  const state = readConnectState(rawState, 'garmin');
  if (!state) {
    console.info('[api/garmin/sso-callback]', { step: 'state', ok: false });
    return redirectAfterIntegrationConnect(request, null, 'garmin', 'invalid_state');
  }

  if (!isGarminSsoTicket(ticket)) {
    console.info('[api/garmin/sso-callback]', {
      step: 'ticket',
      ok: false,
      hasTicket: Boolean(ticket),
    });
    return redirectAfterIntegrationConnect(request, state, 'garmin', 'denied');
  }

  try {
    const athleteId = await getCurrentAthleteId();
    if (athleteId !== state.athleteId) {
      console.info('[api/garmin/sso-callback]', { step: 'athlete', ok: false });
      return redirectAfterIntegrationConnect(request, state, 'garmin', 'invalid_state');
    }

    // service_url MUST match the SSO `service` used when minting the ticket (embed).
    const di = await exchangeServiceTicketForDiTokens(ticket, GARMIN_SSO_EMBED_SERVICE);
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
    return redirectAfterIntegrationConnect(request, state, 'garmin', 'connected');
  } catch (error) {
    console.error('[api/garmin/sso-callback] exchange failed', {
      name: error instanceof Error ? error.name : 'Error',
      message: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    });
    return redirectAfterIntegrationConnect(request, state, 'garmin', 'error');
  }
}

/**
 * Primary path: client received ST-… via postMessage from sso.garmin.com iframe,
 * then POSTs it here with the signed connect state its page URL carried. Never logs the ticket.
 */
export async function POST(request: NextRequest) {
  let ticket: string | null = null;
  let state: string | null = null;
  try {
    const json = (await request.json()) as unknown;
    const parsed = postBodySchema.safeParse(json);
    if (parsed.success) {
      ({ ticket, state } = parsed.data);
    }
  } catch {
    ticket = null;
  }

  const result = await completeGarminSso(request, ticket, state);

  // Client expects JSON with a redirect URL (fetch cannot follow cross-origin
  // Location to HTML the way we want for SPA navigation).
  const location = result.headers.get('Location');
  if (location) {
    let status: 'connected' | 'invalid_state' | 'denied' | 'error' = 'error';
    if (location.includes('garmin=connected')) {
      status = 'connected';
    } else if (location.includes('garmin=invalid_state')) {
      status = 'invalid_state';
    } else if (location.includes('garmin=denied')) {
      status = 'denied';
    }
    return NextResponse.json(
      { ok: status === 'connected', status, redirectTo: location },
      { status: status === 'connected' ? 200 : 400 },
    );
  }

  return result;
}
