/**
 * Garmin's native mobile-app auth flow (SSO ticket → DI OAuth2 bearer token).
 *
 * Primary interactive connect path for SHARPIT (works on localhost with platform
 * `fetch`). Ticket exchange uses the Android mobile client id + service URL —
 * the path that previously succeeded for this product before the widget-only
 * regression. Cron/API sync must never call this; they only refresh stored DI
 * tokens.
 */

import {
  refreshDiAccessToken,
  extractDiClientIdFromJwt,
  GarminDiAuthError,
  type GarminDiTokens,
  LEGACY_MOBILE_SSO_CLIENT_ID,
  DI_TOKEN_URL,
  DI_GRANT_TYPE,
} from '@/lib/integrations/garmin/garmin-di-oauth';

const SSO_HOST = 'https://sso.garmin.com';
const CLIENT_ID = LEGACY_MOBILE_SSO_CLIENT_ID; // GCM_ANDROID_DARK
const SERVICE_URL = 'https://mobile.integration.garmin.com/gcm/android';

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
  'invalid_credentials' | 'mfa_required' | 'rate_limited' | 'unknown';

export class GarminMobileAuthError extends Error {
  constructor(
    message: string,
    public readonly kind: GarminMobileAuthFailureKind,
  ) {
    super(message);
    this.name = 'GarminMobileAuthError';
  }
}

export type GarminMobileTokens = GarminDiTokens;

function basicAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${CLIENT_ID}:`).toString('base64');
}

/**
 * Exchange a mobile SSO service ticket for DI tokens using the Android client id.
 * Kept separate from widget DI_CLIENT_IDS rotation — that path is for embed tickets.
 */
async function exchangeMobileServiceTicket(ticket: string): Promise<GarminMobileTokens> {
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

  const diClientId = extractDiClientIdFromJwt(data.access_token) ?? CLIENT_ID;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    diClientId,
  };
}

/** Logs in via Garmin's mobile (Android) SSO surface. Primary interactive connect path. */
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
      'MFA is required on this account; the mobile path does not support it yet',
      'mfa_required',
    );
  }
  if (type !== 'SUCCESSFUL' || !data.serviceTicketId) {
    throw new GarminMobileAuthError(
      'Mobile login rejected (bad credentials?)',
      'invalid_credentials',
    );
  }

  return exchangeMobileServiceTicket(data.serviceTicketId);
}

export async function refreshGarminMobileToken(refreshToken: string): Promise<GarminMobileTokens> {
  try {
    return await refreshDiAccessToken({
      refreshToken,
      diClientId: CLIENT_ID,
    });
  } catch (error) {
    if (error instanceof GarminDiAuthError) {
      throw new GarminMobileAuthError(
        error.message,
        error.kind === 'rate_limited' ? 'rate_limited' : 'unknown',
      );
    }
    throw error;
  }
}

export {
  DI_TOKEN_URL,
  DI_GRANT_TYPE,
  CLIENT_ID as MOBILE_CLIENT_ID,
  SERVICE_URL as MOBILE_SERVICE_URL,
};
