import { NextRequest } from 'next/server';
import { startGarminHandoff } from '@sharpit/server/lib/integrations/garmin/garmin-sso-start';
import { redirectIfBindHost } from '@sharpit/server/lib/integrations/oauth-return';

/**
 * Native Garmin handoff, step 2 — arms the SSO state and opens the Garmin sign-in.
 * Every exit lands on the callback URL, so the iOS session always closes with an outcome.
 */
export async function GET(request: NextRequest) {
  return redirectIfBindHost(request) ?? startGarminHandoff(request);
}
