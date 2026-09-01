import {
  isGarminAccountConnected,
  isMfpAccountConnected,
  isOAuthAccountConnected,
  isRenphoAccountConnected,
} from '@/lib/integrations/shared/connection-status';

type MaybeAccount = Record<string, unknown> | null | undefined;

export type CronSyncProvider =
  'strava' | 'garmin' | 'withings' | 'renpho' | 'google' | 'myfitnesspal';

function isGoogleCronConnected(account: MaybeAccount): boolean {
  return isOAuthAccountConnected(account) && Boolean(account?.targetCalendarId);
}

const CRON_CONNECTION_CHECKS: Record<CronSyncProvider, (account: MaybeAccount) => boolean> = {
  strava: isOAuthAccountConnected,
  withings: isOAuthAccountConnected,
  garmin: isGarminAccountConnected,
  renpho: isRenphoAccountConnected,
  google: isGoogleCronConnected,
  myfitnesspal: isMfpAccountConnected,
};

/**
 * Cron must gate on credential validity, not mere account-row presence.
 *
 * Revoked integrations keep the row (empty `*Enc` columns) so the hub can
 * prompt reconnect. Malformed placeholders (e.g. demo `"demo"`) also keep a
 * row. Syncing either path throws every run — empty tokens as
 * `ProviderAuthError`, short blobs as Node's `Invalid authentication tag
 * length: 0`. Skip both here.
 */
export function shouldCronSyncProvider(provider: CronSyncProvider, account: MaybeAccount): boolean {
  return CRON_CONNECTION_CHECKS[provider](account);
}
