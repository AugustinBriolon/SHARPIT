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

/**
 * The columns each predicate reads, as Prisma selects.
 *
 * They live beside the predicates because a caller that selects less than the
 * check needs gets `undefined`, and `undefined != null` is false — so the account
 * reads as disconnected with no error anywhere. Every provider was reported
 * disconnected for exactly that reason, which silently disabled provider sync
 * across the whole app.
 *
 * Spread these rather than listing columns by hand, and the two cannot drift.
 */
export const OAUTH_CONNECTION_SELECT = { accessToken: true, refreshToken: true } as const;
export const GARMIN_CONNECTION_SELECT = { oauth1Token: true, oauth2Token: true } as const;
export const RENPHO_CONNECTION_SELECT = { email: true, passwordEnc: true } as const;
export const MFP_CONNECTION_SELECT = { sessionTokenEnc: true } as const;

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
