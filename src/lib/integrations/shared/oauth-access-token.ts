import {
  isCredentialFailure,
  isDecryptMalformedSoftFailure,
  isOAuthAccountConnected,
  ProviderAuthError,
} from '@/lib/integrations/shared/connection-status';
import {
  decryptSecret,
  isEncryptedSecret,
  isSecretAuthenticityFailure,
  isSecretDecryptFailure,
} from '@/lib/secret-box';

async function tryDecryptAccessToken(accessTokenEnc: string): Promise<string | null> {
  if (!isEncryptedSecret(accessTokenEnc)) {
    return null;
  }
  try {
    return decryptSecret(accessTokenEnc);
  } catch (error) {
    if (!isSecretDecryptFailure(error)) {
      throw error;
    }
    return null;
  }
}

async function refreshOrThrow<TRefresh>(input: {
  athleteId: string;
  refreshTokenEnc: string;
  refresh: (refreshToken: string) => Promise<TRefresh>;
  persist: (refreshed: TRefresh) => Promise<void>;
  revoke: (athleteId: string) => Promise<void>;
  reconnectMessage: string;
  extractAccessToken: (refreshed: TRefresh) => string;
}): Promise<string> {
  try {
    if (!isEncryptedSecret(input.refreshTokenEnc)) {
      await input.revoke(input.athleteId);
      throw new ProviderAuthError(input.reconnectMessage);
    }
    const refreshed = await input.refresh(decryptSecret(input.refreshTokenEnc));
    await input.persist(refreshed);
    return input.extractAccessToken(refreshed);
  } catch (error) {
    if (isSecretAuthenticityFailure(error)) {
      throw error;
    }
    if (isDecryptMalformedSoftFailure(error) || isCredentialFailure(error)) {
      await input.revoke(input.athleteId);
      throw new ProviderAuthError(input.reconnectMessage, { cause: error });
    }
    throw error;
  }
}

/**
 * Shared OAuth access-token resolution for Strava / Withings-style accounts.
 *
 * Prefer decrypting a fresh access token. On access decrypt failure, try refresh
 * before giving up. AES-GCM authenticity failures on the refresh token are
 * rethrown without wiping — a wrong encryption key is a fleet incident.
 */
export async function resolveOAuthAccessToken<TRefresh>(input: {
  athleteId: string;
  account: {
    accessTokenEnc: string;
    refreshTokenEnc: string;
    expiresAt: Date;
  };
  refresh: (refreshToken: string) => Promise<TRefresh>;
  persist: (refreshed: TRefresh) => Promise<void>;
  revoke: (athleteId: string) => Promise<void>;
  reconnectMessage: string;
  extractAccessToken: (refreshed: TRefresh) => string;
}): Promise<string> {
  if (!isOAuthAccountConnected(input.account)) {
    throw new ProviderAuthError(input.reconnectMessage);
  }

  const expiresSoon = input.account.expiresAt.getTime() - Date.now() < 60_000;
  if (!expiresSoon) {
    const access = await tryDecryptAccessToken(input.account.accessTokenEnc);
    if (access !== null) {
      return access;
    }
  }

  return refreshOrThrow({
    athleteId: input.athleteId,
    refreshTokenEnc: input.account.refreshTokenEnc,
    refresh: input.refresh,
    persist: input.persist,
    revoke: input.revoke,
    reconnectMessage: input.reconnectMessage,
    extractAccessToken: input.extractAccessToken,
  });
}
