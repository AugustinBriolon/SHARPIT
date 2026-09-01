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

function asRecord(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      throw new GarminTokenStoreError('Tokenstore JSON invalide');
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  throw new GarminTokenStoreError('Tokenstore attendu: objet JSON { di_token, di_refresh_token, … }');
}

/**
 * Accepts the python-garminconnect tokenstore object (or its JSON string).
 * Also accepts a Sharpit DI-marked export for convenience (oauth1/oauth2).
 */
export function mapPythonGarminconnectTokenStore(raw: unknown): GarminDiTokens {
  const data = asRecord(raw);

  // Already Sharpit-shaped (manual export / round-trip).
  if (data.oauth1 && data.oauth2 && typeof data.oauth2 === 'object') {
    const oauth1 = data.oauth1 as { oauth_token?: string; oauth_token_secret?: string };
    const oauth2 = data.oauth2 as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
    if (
      typeof oauth2.access_token === 'string' &&
      oauth2.access_token.length > 0 &&
      typeof oauth2.refresh_token === 'string' &&
      oauth2.refresh_token.length > 0
    ) {
      const marker = oauth1.oauth_token ?? '';
      const diClientId = marker.startsWith('__DI__:')
        ? marker.slice('__DI__:'.length)
        : extractDiClientIdFromJwt(oauth2.access_token) ?? 'GCM_ANDROID_DARK';
      const expiresAt =
        typeof oauth2.expires_at === 'number' && Number.isFinite(oauth2.expires_at)
          ? oauth2.expires_at * 1000
          : Date.now() + 3600_000;
      return {
        accessToken: oauth2.access_token,
        refreshToken: oauth2.refresh_token || oauth1.oauth_token_secret || '',
        expiresAt,
        diClientId: diClientId || 'GCM_ANDROID_DARK',
      };
    }
  }

  const accessToken = data.di_token;
  const refreshToken = data.di_refresh_token;
  if (typeof accessToken !== 'string' || accessToken.length < 20) {
    throw new GarminTokenStoreError('Champ di_token manquant ou invalide');
  }
  if (typeof refreshToken !== 'string' || refreshToken.length < 8) {
    throw new GarminTokenStoreError('Champ di_refresh_token manquant ou invalide');
  }

  const fromField =
    typeof data.di_client_id === 'string' && data.di_client_id.length > 0
      ? data.di_client_id
      : null;
  const diClientId =
    fromField ?? extractDiClientIdFromJwt(accessToken) ?? 'GARMIN_CONNECT_MOBILE_ANDROID_DI';

  const payload = decodeJwtPayload(accessToken);
  const exp = payload?.exp;
  const expiresAt =
    typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : Date.now() + 3600_000;

  return {
    accessToken,
    refreshToken,
    expiresAt,
    diClientId,
  };
}
