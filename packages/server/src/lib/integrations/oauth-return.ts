import 'server-only';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  enableProviderForAllCoveredClasses,
  enableProviderForClass,
} from '@sharpit/app/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@sharpit/server/lib/integrations/source-prefs-store';
import {
  DEFAULT_INTEGRATION_RETURN_PATH,
  sanitizeDataClass,
  sanitizeIntegrationReturnTo,
  webOriginFor,
} from '@sharpit/app/lib/integrations/oauth-public-origin';
import {
  type ConnectState,
  createConnectState,
} from '@sharpit/server/lib/integrations/oauth-state';
import type { IntegrationId } from '@sharpit/app/lib/integrations/shared/client-sync';

export {
  connectNavigation,
  DEFAULT_INTEGRATION_RETURN_PATH,
  normalizeOAuthPublicOrigin,
  publicOriginFromRequest,
  redirectIfBindHost,
  sanitizeDataClass,
  sanitizeIntegrationReturnTo,
  webOriginFor,
} from '@sharpit/app/lib/integrations/oauth-public-origin';

/**
 * Starts a provider connect for the signed-in athlete: the signed `state` that carries the
 * athlete, the return path and the web origin through the provider's sign-in.
 */
export async function beginIntegrationConnect(
  request: NextRequest,
  provider: IntegrationId,
  redirectUri: string | null,
  returnTo = request.nextUrl.searchParams.get('returnTo'),
): Promise<string> {
  const { searchParams } = request.nextUrl;
  return createConnectState({
    provider,
    athleteId: await getCurrentAthleteId(),
    returnTo: sanitizeIntegrationReturnTo(returnTo),
    dataClass: sanitizeDataClass(searchParams.get('dataClass')),
    webOrigin: webOriginFor(request),
    redirectUri,
  });
}

async function enableConnectedProvider(state: ConnectState): Promise<void> {
  try {
    await persistSourcePrefsMutation(state.athleteId, (prefs) =>
      state.dataClass
        ? enableProviderForClass(prefs, state.dataClass, state.provider)
        : enableProviderForAllCoveredClasses(prefs, state.provider),
    );
  } catch (err) {
    console.error('[oauth-return] failed to apply data-class prefs:', err);
  }
}

/**
 * After a provider callback: enable the class that started the connect (if any), then send
 * the athlete back where they started, on the web. With no trustworthy state (forged,
 * expired), they land on the integrations settings of the web.
 */
export async function redirectAfterIntegrationConnect(
  request: NextRequest,
  state: ConnectState | null,
  provider: IntegrationId,
  status: string,
  extra?: Record<string, string>,
): Promise<NextResponse> {
  if (status === 'connected' && state) {
    await enableConnectedProvider(state);
  }
  const returnTo = state?.returnTo ?? DEFAULT_INTEGRATION_RETURN_PATH;
  const target = new URL(returnTo, state?.webOrigin ?? webOriginFor(request));
  target.searchParams.set(provider, status);
  if (state?.dataClass) {
    target.searchParams.set('dataClass', state.dataClass);
  }
  for (const [key, value] of Object.entries(extra ?? {})) {
    target.searchParams.set(key, value);
  }
  if (returnTo === '/onboarding') {
    target.searchParams.set('step', 'providers');
  }
  return NextResponse.redirect(target);
}
