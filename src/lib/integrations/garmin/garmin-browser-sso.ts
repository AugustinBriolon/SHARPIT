/**
 * Server-only Garmin browser SSO state (signed cookie CSRF).
 *
 * Evidence (python-garminconnect #348, 2026-04): CAS silently rejects third-party
 * `service` URLs after login/MFA. Primary path = embed iframe + postMessage with
 * `service=https://sso.garmin.com/sso/embed`. Password never POSTs to Vercel.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  GARMIN_SSO_EMBED_SERVICE,
  GARMIN_SSO_PAGE_PATH,
  normalizeGarminSsoOrigin,
} from '@/lib/integrations/garmin/garmin-browser-sso-shared';

export {
  buildGarminBrowserSsoUrl,
  GARMIN_SSO_EMBED_SERVICE,
  GARMIN_SSO_MESSAGE_ORIGIN,
  GARMIN_SSO_PAGE_PATH,
  GARMIN_SSO_SIGNIN,
  isGarminSsoTicket,
  parseGarminSsoPostMessage,
} from '@/lib/integrations/garmin/garmin-browser-sso-shared';

export const GARMIN_SSO_STATE_COOKIE = 'garmin_sso_state';

export interface GarminSsoStatePayload {
  nonce: string;
  /** Must match DI exchange service_url (embed URL for browser SSO). */
  service: string;
  athleteId: string;
  /** unix seconds */
  exp: number;
}

function stateSecret(): string {
  return (
    process.env.SECRET_ENCRYPTION_KEY ||
    process.env.CRON_SECRET ||
    process.env.DATABASE_URL ||
    'dev-garmin-sso-state'
  );
}

export function getGarminSsoPageUrl(origin: string): string {
  return `${normalizeGarminSsoOrigin(origin)}${GARMIN_SSO_PAGE_PATH}`;
}

export function createGarminSsoState(
  input: Omit<GarminSsoStatePayload, 'nonce' | 'exp' | 'service'> & {
    service?: string;
    ttlSeconds?: number;
  },
): string {
  const payload: GarminSsoStatePayload = {
    nonce: randomBytes(16).toString('hex'),
    service: input.service ?? GARMIN_SSO_EMBED_SERVICE,
    athleteId: input.athleteId,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 600),
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', stateSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyGarminSsoStateSignature(body: string, sig: string): boolean {
  const expected = createHmac('sha256', stateSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isGarminSsoStatePayload(value: unknown): value is GarminSsoStatePayload {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const payload = value as GarminSsoStatePayload;
  return (
    typeof payload.nonce === 'string' &&
    typeof payload.service === 'string' &&
    typeof payload.athleteId === 'string' &&
    typeof payload.exp === 'number'
  );
}

function isValidGarminSsoStatePayload(payload: GarminSsoStatePayload): boolean {
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  return payload.service === GARMIN_SSO_EMBED_SERVICE;
}

function decodeGarminSsoStateBody(body: string): GarminSsoStatePayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!isGarminSsoStatePayload(parsed) || !isValidGarminSsoStatePayload(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function parseGarminSsoState(raw: string | undefined | null): GarminSsoStatePayload | null {
  if (!raw || !raw.includes('.')) {
    return null;
  }
  const [body, sig] = raw.split('.', 2);
  if (!body || !sig || !verifyGarminSsoStateSignature(body, sig)) {
    return null;
  }
  return decodeGarminSsoStateBody(body);
}
