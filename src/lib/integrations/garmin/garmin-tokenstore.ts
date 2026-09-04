/**
 * Maps cyberjunky/python-garminconnect ≥ 0.3 tokenstore JSON into Sharpit's
 * DI token shape (`diTokensToGarminTokens`).
 *
 * Library dump (`Garmin.dump` / `dumps`) writes:
 * `{ "di_token", "di_refresh_token", "di_client_id" }`
 */

import {
  decodeJwtPayload,
  extractDiClientIdFromJwt,
  type GarminDiTokens,
} from '@/lib/integrations/garmin/garmin-di-oauth';

export class GarminTokenStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GarminTokenStoreError';
  }
}

export interface PythonGarminconnectTokenStore {
  di_token: string;
  di_refresh_token: string;
  di_client_id?: string | null;
}

function parseJsonRecord(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    throw new GarminTokenStoreError('Tokenstore JSON invalide');
  }
  throw new GarminTokenStoreError(
    'Tokenstore attendu: objet JSON { di_token, di_refresh_token, … }',
  );
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    return parseJsonRecord(raw);
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  throw new GarminTokenStoreError(
    'Tokenstore attendu: objet JSON { di_token, di_refresh_token, … }',
  );
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function diClientIdFromMarker(marker: string, accessToken: string): string {
  if (marker.startsWith('__DI__:')) {
    return marker.slice('__DI__:'.length);
  }
  return extractDiClientIdFromJwt(accessToken) ?? 'GCM_ANDROID_DARK';
}

function readSharpitOauthFields(data: Record<string, unknown>): {
  oauth1: { oauth_token?: string; oauth_token_secret?: string };
  oauth2: { access_token?: string; refresh_token?: string; expires_at?: number };
} | null {
  if (!data.oauth1 || !data.oauth2 || typeof data.oauth2 !== 'object') {
    return null;
  }
  return {
    oauth1: data.oauth1 as { oauth_token?: string; oauth_token_secret?: string },
    oauth2: data.oauth2 as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    },
  };
}

function buildSharpitShapedTokens(
  oauth1: { oauth_token?: string; oauth_token_secret?: string },
  oauth2: { access_token?: string; refresh_token?: string; expires_at?: number },
  accessToken: string,
  refreshToken: string,
): GarminDiTokens {
  const marker = oauth1.oauth_token ?? '';
  const diClientId = diClientIdFromMarker(marker, accessToken) || 'GCM_ANDROID_DARK';
  const expiresAtSeconds = readFiniteNumber(oauth2.expires_at);
  const expiresAt = expiresAtSeconds ? expiresAtSeconds * 1000 : Date.now() + 3600_000;
  return {
    accessToken,
    refreshToken: refreshToken || oauth1.oauth_token_secret || '',
    expiresAt,
    diClientId,
  };
}

function mapSharpitShapedTokenStore(data: Record<string, unknown>): GarminDiTokens | null {
  const oauth = readSharpitOauthFields(data);
  if (!oauth) {
    return null;
  }
  const accessToken = readNonEmptyString(oauth.oauth2.access_token);
  const refreshToken = readNonEmptyString(oauth.oauth2.refresh_token);
  if (!accessToken || !refreshToken) {
    return null;
  }
  return buildSharpitShapedTokens(oauth.oauth1, oauth.oauth2, accessToken, refreshToken);
}

function assertPythonTokenField(value: unknown, fieldName: string, minLength: number): string {
  if (typeof value !== 'string' || value.length < minLength) {
    throw new GarminTokenStoreError(`Champ ${fieldName} manquant ou invalide`);
  }
  return value;
}

function resolvePythonDiClientId(data: Record<string, unknown>, accessToken: string): string {
  const fromField = readNonEmptyString(data.di_client_id);
  return fromField ?? extractDiClientIdFromJwt(accessToken) ?? 'GARMIN_CONNECT_MOBILE_ANDROID_DI';
}

function expiresAtFromJwt(accessToken: string): number {
  const payload = decodeJwtPayload(accessToken);
  const exp = readFiniteNumber(payload?.exp);
  return exp ? exp * 1000 : Date.now() + 3600_000;
}

function mapPythonNativeTokenStore(data: Record<string, unknown>): GarminDiTokens {
  const accessToken = assertPythonTokenField(data.di_token, 'di_token', 20);
  const refreshToken = assertPythonTokenField(data.di_refresh_token, 'di_refresh_token', 8);

  return {
    accessToken,
    refreshToken,
    expiresAt: expiresAtFromJwt(accessToken),
    diClientId: resolvePythonDiClientId(data, accessToken),
  };
}

/**
 * Accepts the python-garminconnect tokenstore object (or its JSON string).
 * Also accepts a Sharpit DI-marked export for convenience (oauth1/oauth2).
 */
export function mapPythonGarminconnectTokenStore(raw: unknown): GarminDiTokens {
  const data = asRecord(raw);
  return mapSharpitShapedTokenStore(data) ?? mapPythonNativeTokenStore(data);
}
