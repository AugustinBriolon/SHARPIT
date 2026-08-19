/**
 * Provider connection checks and auth-failure utilities.
 *
 * Each `is*Connected` guard checks that required credential fields are present
 * and non-null on a provider account row.
 */

// ---------------------------------------------------------------------------
// Auth error
// ---------------------------------------------------------------------------

export class ProviderAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderAuthError';
  }
}

export function isProviderAuthFailure(error: unknown): error is ProviderAuthError {
  return error instanceof ProviderAuthError;
}

// ---------------------------------------------------------------------------
// Per-provider connection predicates
// ---------------------------------------------------------------------------

type MaybeAccount = Record<string, unknown> | null | undefined;

export function isOAuthAccountConnected(account: MaybeAccount): boolean {
  if (!account) return false;
  return account.accessToken != null && account.refreshToken != null;
}

export function isGarminAccountConnected(account: MaybeAccount): boolean {
  if (!account) return false;
  return account.oauth1Token != null && account.oauth2Token != null;
}

export function isRenphoAccountConnected(account: MaybeAccount): boolean {
  if (!account) return false;
  return account.email != null && account.passwordEnc != null;
}

export function isMfpAccountConnected(account: MaybeAccount): boolean {
  if (!account) return false;
  return typeof account.sessionTokenEnc === 'string' && account.sessionTokenEnc.length > 0;
}

// ---------------------------------------------------------------------------
// Reconnect helpers
// ---------------------------------------------------------------------------

export const INTEGRATIONS_RECONNECT_HREF = '/settings/integrations';

interface ProviderAccounts {
  strava: MaybeAccount;
  garmin: MaybeAccount;
  withings: MaybeAccount;
  renpho: MaybeAccount;
  google: MaybeAccount;
  myfitnesspal?: MaybeAccount;
}

/**
 * Returns names of providers that have an account row but whose credentials are
 * no longer valid (need reconnection).
 */
export function reconnectProviderNames(accounts: ProviderAccounts): string[] {
  const names: string[] = [];
  if (accounts.strava && !isOAuthAccountConnected(accounts.strava)) names.push('Strava');
  if (accounts.garmin && !isGarminAccountConnected(accounts.garmin)) names.push('Garmin');
  if (accounts.withings && !isOAuthAccountConnected(accounts.withings)) names.push('Withings');
  if (accounts.renpho && !isRenphoAccountConnected(accounts.renpho)) names.push('Renpho');
  if (accounts.google && !accounts.google.refreshToken) names.push('Google');
  if (accounts.myfitnesspal && !isMfpAccountConnected(accounts.myfitnesspal))
    names.push('MyFitnessPal');
  return names;
}

export function reconnectProductMessage(names: string[]): string | null {
  if (names.length === 0) return null;
  const joined = names.join(', ');
  return names.length === 1
    ? `La connexion ${joined} a expiré. Reconnecte-la dans les paramètres.`
    : `Les connexions ${joined} ont expiré. Reconnecte-les dans les paramètres.`;
}
