/**
 * Client-safe Garmin browser SSO helpers (no Node crypto).
 * Embed widget + postMessage — see garmin-browser-sso.ts for signed state.
 */

export const GARMIN_SSO_SIGNIN = 'https://sso.garmin.com/sso/signin';
export const GARMIN_SSO_EMBED_SERVICE = 'https://sso.garmin.com/sso/embed';
export const GARMIN_SSO_MESSAGE_ORIGIN = 'https://sso.garmin.com';
export const GARMIN_SSO_PAGE_PATH = '/settings/integrations/garmin-sso';

export function normalizeGarminSsoOrigin(origin: string): string {
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

/**
 * Embed-widget CAS sign-in URL for an iframe on Sharpit.
 * `source` must be the Sharpit origin so casEmbedSuccess can postMessage back.
 */
export function buildGarminBrowserSsoUrl(sourceOrigin: string): string {
  const origin = normalizeGarminSsoOrigin(sourceOrigin);
  const params = new URLSearchParams({
    id: 'gauth-widget',
    embedWidget: 'true',
    gauthHost: 'https://sso.garmin.com/sso',
    service: GARMIN_SSO_EMBED_SERVICE,
    source: origin,
    consumeServiceTicket: 'false',
    locale: 'fr_FR',
  });
  return `${GARMIN_SSO_SIGNIN}?${params.toString()}`;
}

export function isGarminSsoTicket(ticket: string | null | undefined): ticket is string {
  return typeof ticket === 'string' && /^ST-[A-Za-z0-9._-]+$/.test(ticket);
}

/** Parse postMessage payload from Garmin casEmbedSuccess (stringified JSON). */
export function parseGarminSsoPostMessage(data: unknown): string | null {
  let raw: unknown = data;
  if (typeof data === 'string') {
    try {
      raw = JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const ticket =
    (raw as { serviceTicket?: unknown }).serviceTicket ??
    (raw as { ticket?: unknown }).ticket;
  if (typeof ticket !== 'string' || !isGarminSsoTicket(ticket)) {
    return null;
  }
  return ticket;
}
