import 'server-only';

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { DataClassId } from '@/lib/integrations/provider-catalog';
import {
  INTEGRATION_DATA_CLASS_COOKIE,
  INTEGRATION_RETURN_COOKIE,
  publicOriginFromRequest,
  sanitizeDataClass,
  sanitizeIntegrationReturnTo,
} from '@/lib/integrations/oauth-public-origin';
import { catalogIntegrationIds } from '@/lib/integrations/source-prefs';

export {
  DEFAULT_INTEGRATION_RETURN_PATH,
  INTEGRATION_DATA_CLASS_COOKIE,
  INTEGRATION_RETURN_COOKIE,
  normalizeOAuthPublicOrigin,
  publicOriginFromRequest,
  redirectIfBindHost,
  sanitizeDataClass,
  sanitizeIntegrationReturnTo,
} from '@/lib/integrations/oauth-public-origin';

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
};

export async function setIntegrationReturnTo(
  returnTo: string | null | undefined,
  dataClass?: string | null,
): Promise<void> {
  const store = await cookies();
  store.set(INTEGRATION_RETURN_COOKIE, sanitizeIntegrationReturnTo(returnTo), OAUTH_COOKIE_OPTS);
  const cls = sanitizeDataClass(dataClass);
  if (cls) {
    store.set(INTEGRATION_DATA_CLASS_COOKIE, cls, OAUTH_COOKIE_OPTS);
  } else {
    store.delete(INTEGRATION_DATA_CLASS_COOKIE);
  }
}

export async function consumeIntegrationReturnTo(): Promise<string> {
  const store = await cookies();
  const value = store.get(INTEGRATION_RETURN_COOKIE)?.value;
  store.delete(INTEGRATION_RETURN_COOKIE);
  return sanitizeIntegrationReturnTo(value);
}

export async function consumeIntegrationDataClass(): Promise<DataClassId | null> {
  const store = await cookies();
  const value = store.get(INTEGRATION_DATA_CLASS_COOKIE)?.value;
  store.delete(INTEGRATION_DATA_CLASS_COOKIE);
  return sanitizeDataClass(value);
}

/**
 * After a provider OAuth callback: enable the class that started the connect
 * (if any), then redirect to onboarding or settings.
 */
export async function redirectAfterIntegrationConnect(
  request: NextRequest,
  provider: string,
  status: string,
  extra?: Record<string, string>,
): Promise<NextResponse> {
  const returnTo = await consumeIntegrationReturnTo();
  const dataClass = await consumeIntegrationDataClass();

  if (status === 'connected' && isIntegrationId(provider)) {
    try {
      const { getCurrentAthleteId } = await import('@/lib/auth/current-athlete');
      const { enableProviderForAllCoveredClasses, enableProviderForClass } =
        await import('@/lib/integrations/source-prefs');
      const { persistSourcePrefsMutation } = await import('@/lib/integrations/source-prefs-store');
      const athleteId = await getCurrentAthleteId();
      await persistSourcePrefsMutation(athleteId, (prefs) =>
        dataClass
          ? enableProviderForClass(prefs, dataClass, provider)
          : enableProviderForAllCoveredClasses(prefs, provider),
      );
    } catch (err) {
      console.error('[oauth-return] failed to apply data-class prefs:', err);
    }
  }

  const target = new URL(returnTo, publicOriginFromRequest(request));
  target.searchParams.set(provider, status);
  if (dataClass) target.searchParams.set('dataClass', dataClass);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      target.searchParams.set(key, value);
    }
  }
  if (returnTo === '/onboarding') {
    target.searchParams.set('step', 'providers');
  }
  return NextResponse.redirect(target);
}

const INTEGRATION_IDS = new Set<string>(catalogIntegrationIds());

function isIntegrationId(
  value: string,
): value is import('@/lib/integrations/shared/client-sync').IntegrationId {
  return INTEGRATION_IDS.has(value);
}
