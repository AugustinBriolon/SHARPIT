/**
 * Garmin's "native mobile app" auth flow (SSO ticket → DI OAuth2 bearer token).
 *
 * SHARPIT's normal Garmin login goes through `@flow-js/garmin-connect`'s web/widget
 * SSO scrape, whose ticket-exchange endpoint shares a rate-limit bucket keyed on
 * (clientId=GarminConnect, account email) with every other unofficial web client.
 * Once that bucket trips it can stay 429'd for 48h+, independent of credentials.
 * The official Android app authenticates through a separate endpoint under its own
 * clientId (GCM_ANDROID_DARK) with its own bucket — this module replicates that
 * flow as a fallback when the web path is blocked. Endpoint/field names verified
 * against the equivalent, currently-working Python implementation (no JS reference
 * existed to copy from), not against a live Garmin account.
 */

const SSO_HOST = 'https://sso.garmin.com';
const DI_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
const CLIENT_ID = 'GCM_ANDROID_DARK';
const SERVICE_URL = 'https://mobile.integration.garmin.com/gcm/android';
const DI_GRANT_TYPE = 'https://connectapi.garmin.com/di-oauth2-service/oauth/grant/service_ticket';

const NATIVE_HEADERS: Record<string, string> = {
  'User-Agent': 'GCM-Android-5.23',
  'X-Garmin-User-Agent':
    'com.garmin.android.apps.connectmobile/5.23; ; Google/sdk_gphone64_arm64/google; Android/33; Dalvik/2.1.0',
  'X-Garmin-Paired-App-Version': '10861',
  'X-Garmin-Client-Platform': 'Android',
  'X-App-Ver': '10861',
  'X-Lang': 'en',
  'X-GCExperience': 'GC5',
  'Accept-Language': 'en-US,en;q=0.9',
};

export type GarminMobileAuthFailureKind =
  | 'invalid_credentials'
  | 'mfa_required'
  | 'rate_limited'
  | 'unknown';

export class GarminMobileAuthError extends Error {
  constructor(
    message: string,
    public readonly kind: GarminMobileAuthFailureKind,
  ) {
    super(message);
    this.name = 'GarminMobileAuthError';
  }
}

export interface GarminMobileTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${CLIENT_ID}:`).toString('base64');
}

async function exchangeServiceTicket(ticket: string): Promise<GarminMobileTokens> {
  const res = await fetch(DI_TOKEN_URL, {
    method: 'POST',
    headers: {
      ...NATIVE_HEADERS,
      Authorization: basicAuthHeader(),
      Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      service_ticket: ticket,
      grant_type: DI_GRANT_TYPE,
      service_url: SERVICE_URL,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GarminMobileAuthError(
      `DI token exchange failed: HTTP ${res.status} ${body.slice(0, 300)}`,
      'unknown',
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new GarminMobileAuthError('DI token exchange returned no access_token', 'unknown');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

/** Logs in via Garmin's mobile (Android) SSO surface. MFA accounts are rejected explicitly rather than silently mishandled — this path isn't wired up. */
export async function loginGarminMobile(
  username: string,
  password: string,
): Promise<GarminMobileTokens> {
  const query = new URLSearchParams({ clientId: CLIENT_ID, locale: 'en-US', service: SERVICE_URL });
  const res = await fetch(`${SSO_HOST}/mobile/api/login?${query.toString()}`, {
    method: 'POST',
    headers: {
      ...NATIVE_HEADERS,
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: SSO_HOST,
    },
    body: JSON.stringify({ username, password, rememberMe: true, captchaToken: '' }),
  });

  if (res.status === 429) {
    throw new GarminMobileAuthError('Mobile login rate limited (429)', 'rate_limited');
  }

  const data = (await res.json().catch(() => ({}))) as {
    responseStatus?: { type?: string };
    serviceTicketId?: string;
  };

  const type = data.responseStatus?.type;
  if (type === 'MFA_REQUIRED') {
    throw new GarminMobileAuthError(
      'MFA is required on this account; the mobile fallback does not support it yet',
      'mfa_required',
    );
  }
  if (type !== 'SUCCESSFUL' || !data.serviceTicketId) {
    throw new GarminMobileAuthError('Mobile login rejected (bad credentials?)', 'invalid_credentials');
  }

  return exchangeServiceTicket(data.serviceTicketId);
}

export async function refreshGarminMobileToken(refreshToken: string): Promise<GarminMobileTokens> {
  if (!refreshToken) {
    throw new GarminMobileAuthError('No refresh token available for the mobile session', 'unknown');
  }
  const res = await fetch(DI_TOKEN_URL, {
    method: 'POST',
    headers: {
      ...NATIVE_HEADERS,
      Authorization: basicAuthHeader(),
      Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GarminMobileAuthError(
      `DI token refresh failed: HTTP ${res.status} ${body.slice(0, 300)}`,
      'unknown',
    );
  }

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new GarminMobileAuthError('DI token refresh returned no access_token', 'unknown');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}
