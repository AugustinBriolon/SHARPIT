/**
 * @deprecated Prefer `garmin-di-oauth` + `garmin-widget-auth`.
 *
 * Kept as a thin compatibility shim so older call sites / scripts that imported
 * mobile DI helpers keep compiling. Interactive connect no longer uses the
 * mobile clientId SSO path (rate-limited per email+clientId).
 */

import {
  exchangeServiceTicketForDiTokens,
  refreshDiAccessToken,
  GarminDiAuthError,
  type GarminDiTokens,
  LEGACY_MOBILE_SSO_CLIENT_ID,
  DI_TOKEN_URL,
  DI_GRANT_TYPE,
} from '@/lib/integrations/garmin/garmin-di-oauth';

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

export type GarminMobileTokens = GarminDiTokens;

const SSO_HOST = 'https://sso.garmin.com';
const CLIENT_ID = LEGACY_MOBILE_SSO_CLIENT_ID;
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

function toMobileError(error: unknown): never {
  if (error instanceof GarminDiAuthError) {
    throw new GarminMobileAuthError(error.message, error.kind);
  }
  throw error;
}

/**
 * @deprecated Rate-limited per email+clientId. Use `loginGarminWidget` instead.
 * Retained only for emergency local debugging — not wired into connect/cron.
 */
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
    throw new GarminMobileAuthError(
      'Mobile login rejected (bad credentials?)',
      'invalid_credentials',
    );
  }

  try {
    return await exchangeServiceTicketForDiTokens(data.serviceTicketId, SERVICE_URL);
  } catch (error) {
    toMobileError(error);
  }
}

export async function refreshGarminMobileToken(refreshToken: string): Promise<GarminMobileTokens> {
  try {
    return await refreshDiAccessToken({
      refreshToken,
      diClientId: CLIENT_ID,
    });
  } catch (error) {
    toMobileError(error);
  }
}

// Re-export constants used by older notes / scripts.
export { DI_TOKEN_URL, DI_GRANT_TYPE, CLIENT_ID as MOBILE_CLIENT_ID };
