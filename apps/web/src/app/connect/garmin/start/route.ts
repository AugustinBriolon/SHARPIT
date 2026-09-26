import { NextRequest, NextResponse } from 'next/server';
import {
  CONNECT_GARMIN_CALLBACK_PATH,
  garminHandoffCallbackPath,
} from '@sharpit/server/lib/integrations/garmin/garmin-connect-handoff';
import { serverApiFetch } from '@/server/api-client';

/**
 * Native Garmin handoff, step 2 (ADR-047) — `api.` arms the SSO state and names the Garmin
 * sign-in page; this apex URL only follows it. Every exit lands on the callback URL, so the
 * iOS session always closes with an outcome.
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  try {
    const response = await serverApiFetch(
      `/api/garmin/connect?returnTo=${encodeURIComponent(CONNECT_GARMIN_CALLBACK_PATH)}`,
      { headers: { Accept: 'application/json' }, origin },
    );
    const body = (await response.json().catch(() => null)) as { url?: string } | null;
    if (response.ok && body?.url) {
      return NextResponse.redirect(body.url);
    }
    console.error('[connect/garmin/start]', { status: response.status });
  } catch (error) {
    console.error('[connect/garmin/start]', {
      name: error instanceof Error ? error.name : 'Error',
    });
  }
  return NextResponse.redirect(new URL(garminHandoffCallbackPath('error'), origin));
}
