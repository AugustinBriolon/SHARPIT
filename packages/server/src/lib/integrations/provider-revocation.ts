import { decryptSecret, isEncryptedSecret } from '@sharpit/server/lib/secret-box';
import { revokeGoogleToken } from '@sharpit/server/lib/integrations/google/google';
import { getGoogleAccount } from '@sharpit/server/lib/integrations/google/google-sync';
import { deauthorizeStrava } from '@sharpit/server/lib/integrations/strava/strava';
import {
  getStravaAccount,
  getValidAccessToken,
} from '@sharpit/server/lib/integrations/strava/strava-sync';
import { revokeWithingsAuthorization } from '@sharpit/server/lib/integrations/withings/withings';
import { getWithingsAccount } from '@sharpit/server/lib/integrations/withings/withings-sync';
import type { IntegrationId } from '@sharpit/app/lib/integrations/shared/client-sync';
import { logSafeError } from '@sharpit/server/lib/privacy/safe-log';

/**
 * - `revoked`: the provider confirmed SHARPIT's access is gone on its side.
 * - `not_connected`: nothing to revoke.
 * - `unsupported`: no revocation API (Garmin and MyFitnessPal are unofficial sessions,
 *   Renpho a stored password) — deleting our copy is the whole of it.
 * - `failed`: the provider refused or was unreachable; logged, never thrown.
 */
export type RevocationOutcome = 'revoked' | 'not_connected' | 'unsupported' | 'failed';

async function revokeStrava(athleteId: string): Promise<RevocationOutcome> {
  const account = await getStravaAccount(athleteId);
  if (!account || !isEncryptedSecret(account.refreshTokenEnc)) {
    return 'not_connected';
  }
  // Refreshes first when the access token expired — deauthorize needs a live one.
  await deauthorizeStrava(await getValidAccessToken(athleteId));
  return 'revoked';
}

async function revokeGoogle(athleteId: string): Promise<RevocationOutcome> {
  const account = await getGoogleAccount(athleteId);
  if (!account || !isEncryptedSecret(account.refreshTokenEnc)) {
    return 'not_connected';
  }
  await revokeGoogleToken(decryptSecret(account.refreshTokenEnc));
  return 'revoked';
}

async function revokeWithings(athleteId: string): Promise<RevocationOutcome> {
  const account = await getWithingsAccount(athleteId);
  if (!account?.withingsUserId) {
    return 'not_connected';
  }
  await revokeWithingsAuthorization(account.withingsUserId);
  return 'revoked';
}

const REVOKERS: Partial<Record<IntegrationId, (athleteId: string) => Promise<RevocationOutcome>>> =
  {
    strava: revokeStrava,
    google: revokeGoogle,
    withings: revokeWithings,
  };

/**
 * Ends SHARPIT's access at the provider before our credentials are deleted — on a
 * source disconnect and on account deletion. Best effort: the caller deletes its copy
 * whatever the outcome, so a provider outage never keeps data around.
 */
export async function revokeProviderAccess(
  athleteId: string,
  provider: IntegrationId,
): Promise<RevocationOutcome> {
  const revoke = REVOKERS[provider];
  if (!revoke) {
    return 'unsupported';
  }
  try {
    return await revoke(athleteId);
  } catch (error) {
    logSafeError(`integrations/revoke-${provider}`, error, { athleteId });
    return 'failed';
  }
}

export async function revokeAllProviderAccess(
  athleteId: string,
): Promise<Partial<Record<IntegrationId, RevocationOutcome>>> {
  const providers = Object.keys(REVOKERS) as IntegrationId[];
  const outcomes = await Promise.all(
    providers.map(async (provider) => [provider, await revokeProviderAccess(athleteId, provider)]),
  );
  return Object.fromEntries(outcomes);
}
