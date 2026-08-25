import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { DataClassId } from '@/lib/integrations/provider-catalog';
import { DATA_CLASSES } from '@/lib/integrations/provider-catalog';
import { catalogIntegrationIds } from '@/lib/integrations/source-prefs';

/** Cookie set before OAuth start; consumed when the provider callback finishes. */
export const INTEGRATION_RETURN_COOKIE = 'integration_return_to';
/** Optional data-class context for enabling that class after connect (ADR-027). */
export const INTEGRATION_DATA_CLASS_COOKIE = 'integration_data_class';

const OAUTH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 600,
};

const ALLOWED_RETURN_PATHS = new Set(['/onboarding', '/settings/integrations', '/settings']);
const DATA_CLASS_IDS = new Set<string>(DATA_CLASSES.map((c) => c.id));

export const DEFAULT_INTEGRATION_RETURN_PATH = '/settings/integrations';

export function sanitizeDataClass(raw: string | null | undefined): DataClassId | null {
  if (!raw || !DATA_CLASS_IDS.has(raw)) return null;
  return raw as DataClassId;
}
/**
 * OAuth providers reject bind addresses like `0.0.0.0` as redirect_uri.
 * Map them to localhost while preserving scheme + port.
 */
export function normalizeOAuthPublicOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname === '0.0.0.0' || url.hostname === '::' || url.hostname === '[::]') {
      url.hostname = 'localhost';
    }
    return url.origin;
  } catch {
    return origin;
  }
}

function hostHeaderHostname(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end >= 0 ? host.slice(1, end) : host;
  }
  return host.split(':')[0] ?? '';
}

/**
 * Bounce only when the *browser* asked for the bind address (Host header).
 * Do not use `nextUrl.hostname` — with `next dev -H 0.0.0.0` it stays `0.0.0.0`
 * even when the athlete opened `localhost`, which caused an infinite redirect.
 */
export function redirectIfBindHost(request: NextRequest): NextResponse | null {
  const hostName = hostHeaderHostname(request);
  if (hostName !== '0.0.0.0' && hostName !== '::') {
    return null;
  }
  const url = request.nextUrl.clone();
  url.hostname = 'localhost';
  return NextResponse.redirect(url);
}

/** Public origin for OAuth: prefer Host header, then fall back to request URL. */
export function publicOriginFromRequest(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto =
    request.headers.get('x-forwarded-proto') ??
    (request.nextUrl.protocol === 'https:' ? 'https' : 'http');
  if (host) {
    return normalizeOAuthPublicOrigin(`${proto}://${host}`);
  }
  return normalizeOAuthPublicOrigin(request.nextUrl.origin);
}

/** Sanitize a returnTo query value to an allow-listed in-app path. */
export function sanitizeIntegrationReturnTo(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_INTEGRATION_RETURN_PATH;
  try {
    const path = raw.startsWith('http') ? new URL(raw).pathname : raw.split('?')[0];
    if (ALLOWED_RETURN_PATHS.has(path)) return path;
  } catch {
    // ignore
  }
  return DEFAULT_INTEGRATION_RETURN_PATH;
}

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
