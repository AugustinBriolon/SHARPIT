import { format } from 'date-fns';

/**
 * Header name and copy shared between the coach routes (server) and the coach
 * hooks (client) that warn an athlete approaching their daily AI budget.
 *
 * Kept in its own prisma-free module: `ai-budget.ts` imports `@/lib/prisma`,
 * which must never end up in a client bundle. Client code imports only from
 * here.
 */

export const AI_BUDGET_WARNING_HEADER = 'X-Ai-Budget-Warning';

/** Standard HTTP header — set on the 402 with the real wait, in seconds, until the rolling window frees enough budget. */
export const RETRY_AFTER_HEADER = 'Retry-After';

export function aiBudgetWarningMessage(): string {
  return "Tu approches de ta limite d'échanges avec le coach sur les dernières 24h.";
}

/** "3 h" / "12 min" — used for the server's error sentence, which has no reliable way to know the athlete's timezone. */
export function formatRetryDuration(retryAfterSeconds: number): string {
  if (retryAfterSeconds >= 3600) {
    return `${Math.ceil(retryAfterSeconds / 3600)} h`;
  }
  return `${Math.max(1, Math.ceil(retryAfterSeconds / 60))} min`;
}

/**
 * "dans 12 min" / "à 18:45" — for the client-side blocked chip, which has no
 * live countdown. A relative duration goes silently stale the moment the
 * athlete leaves the tab open without a fresh response — "dans 3h" still
 * reads "dans 3h" 45 minutes later. An absolute clock time doesn't have that
 * problem, so it takes over past the one-hour mark, where staleness would
 * otherwise be most misleading. Computed client-side (not reused from the
 * server) so it lands in the athlete's own local time, not the server's.
 */
export function formatBudgetRetryEta(retryAfterSeconds: number): string {
  if (retryAfterSeconds < 3600) {
    return `dans ${Math.max(1, Math.ceil(retryAfterSeconds / 60))} min`;
  }
  return `à ${format(new Date(Date.now() + retryAfterSeconds * 1000), 'HH:mm')}`;
}
