/**
 * Garmin device-identity (DI) OAuth2 — ticket exchange + refresh.
 *
 * Modelled on cyberjunky/python-garminconnect ≥ 0.3: exchange a CAS service
 * ticket for DI bearer tokens, then refresh forever without re-running SSO.
 * Native TLS impersonation is intentionally not used (Vercel serverless).
 */

export const DI_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token';
export const DI_GRANT_TYPE =
  'https://connectapi.garmin.com/di-oauth2-service/oauth/grant/service_ticket';

/** Client IDs tried in order for ticket → DI exchange (python-garminconnect 0.3). */
export const DI_CLIENT_IDS = [
  'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
  'GARMIN_CONNECT_MOBILE_ANDROID_DI_2024Q4',
  'GARMIN_CONNECT_MOBILE_ANDROID_DI',
  'GARMIN_CONNECT_MOBILE_IOS_DI',
] as const;

/** Legacy mobile SSO client id — only for refreshing tokens minted before DI_CLIENT_IDS. */
export const LEGACY_MOBILE_SSO_CLIENT_ID = 'GCM_ANDROID_DARK';

const NATIVE_HEADERS: Record<string, string> = {
  'User-Agent': 'GCM-Android-5.23',
  'X-Garmin-User-Agent':
    'com.garmin.android.apps.connectmobile/5.23; ; Google/sdk_gphone64_arm64/google; Android/33; Dalvik/2.1.0',
  Accept: 'application/json,text/html;q=0.9,*/*;q=0.8',
  'Content-Type': 'application/x-www-form-urlencoded',
  'Cache-Control': 'no-cache',
};

export type GarminDiAuthFailureKind =
  'invalid_credentials' | 'mfa_required' | 'rate_limited' | 'unknown';

export class GarminDiAuthError extends Error {
  constructor(
    message: string,
    public readonly kind: GarminDiAuthFailureKind,
  ) {
    super(message);
    this.name = 'GarminDiAuthError';
  }
}

export interface GarminDiTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  diClientId: string;
}

export type GarminDiOauthFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface GarminDiOauthDeps {
  fetch: GarminDiOauthFetch;
  now: () => number;
}

const defaultDeps: GarminDiOauthDeps = {
  fetch: globalThis.fetch.bind(globalThis),
  now: () => Date.now(),
};

function basicAuthHeader(clientId: string): string {
  return 'Basic ' + Buffer.from(`${clientId}:`).toString('base64');
}

/** Decode an unverified JWT payload (server-controlled claims only — never trust for authZ). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) {
    return null;
  }
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(json) as unknown;
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function extractDiClientIdFromJwt(token: string): string | null {
  const payload = decodeJwtPayload(token);
  const value = payload?.client_id;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function parseTokenResponse(
  data: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  },
  fallbackClientId: string,
  nowMs: number,
  previousRefresh?: string,
): GarminDiTokens {
  if (!data.access_token) {
    throw new GarminDiAuthError('DI token response returned no access_token', 'unknown');
  }
  const diClientId = extractDiClientIdFromJwt(data.access_token) ?? fallbackClientId;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? previousRefresh ?? '',
    expiresAt: nowMs + (data.expires_in ?? 3600) * 1000,
    diClientId,
  };
}

/**
 * Exchange a CAS service ticket for DI OAuth2 tokens.
 * `serviceUrl` must match the SSO `service` used when the ticket was minted.
 */
export async function exchangeServiceTicketForDiTokens(
  ticket: string,
  serviceUrl: string,
  deps: Partial<GarminDiOauthDeps> = {},
): Promise<GarminDiTokens> {
  const { fetch: doFetch, now } = { ...defaultDeps, ...deps };
  let lastStatus = 0;
  let lastBody = '';

  for (const clientId of DI_CLIENT_IDS) {
    const res = await doFetch(DI_TOKEN_URL, {
      method: 'POST',
      headers: {
        ...NATIVE_HEADERS,
        Authorization: basicAuthHeader(clientId),
      },
      body: new URLSearchParams({
        client_id: clientId,
        service_ticket: ticket,
        grant_type: DI_GRANT_TYPE,
        service_url: serviceUrl,
      }),
    });

    if (res.status === 429) {
      throw new GarminDiAuthError('DI token exchange rate limited (429)', 'rate_limited');
    }

    if (!res.ok) {
      lastStatus = res.status;
      lastBody = await res.text().catch(() => '');
      continue;
    }

    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    try {
      return parseTokenResponse(data, clientId, now());
    } catch {
      continue;
    }
  }

  throw new GarminDiAuthError(
    `DI token exchange failed for all client IDs (last HTTP ${lastStatus} ${lastBody.slice(0, 200)})`,
    lastStatus === 401 ? 'unknown' : 'unknown',
  );
}

function resolveDiRefreshClientId(input: {
  diClientId: string | null;
  accessToken?: string;
}): string {
  return (
    input.diClientId ||
    (input.accessToken ? extractDiClientIdFromJwt(input.accessToken) : null) ||
    LEGACY_MOBILE_SSO_CLIENT_ID
  );
}

function refreshFailureKind(status: number): GarminDiAuthFailureKind {
  return status === 401 || status === 400 ? 'invalid_credentials' : 'unknown';
}

async function assertDiRefreshResponseOk(res: Response): Promise<void> {
  if (res.status === 429) {
    throw new GarminDiAuthError('DI token refresh rate limited (429)', 'rate_limited');
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GarminDiAuthError(
      `DI token refresh failed: HTTP ${res.status} ${body.slice(0, 300)}`,
      refreshFailureKind(res.status),
    );
  }
}

/**
 * Refresh DI access token. Never performs SSO / email+password login.
 */
export async function refreshDiAccessToken(
  input: { refreshToken: string; diClientId: string | null; accessToken?: string },
  deps: Partial<GarminDiOauthDeps> = {},
): Promise<GarminDiTokens> {
  const { fetch: doFetch, now } = { ...defaultDeps, ...deps };
  if (!input.refreshToken) {
    throw new GarminDiAuthError('No DI refresh token available', 'unknown');
  }

  const clientId = resolveDiRefreshClientId(input);
  const res = await doFetch(DI_TOKEN_URL, {
    method: 'POST',
    headers: {
      ...NATIVE_HEADERS,
      Authorization: basicAuthHeader(clientId),
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: input.refreshToken,
    }),
  });

  await assertDiRefreshResponseOk(res);

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  return parseTokenResponse(data, clientId, now(), input.refreshToken);
}
