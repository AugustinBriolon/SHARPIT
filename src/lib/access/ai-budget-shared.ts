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

/** "3 h" / "12 min" — shared so the server's error sentence and the client's blocked tag never drift apart. */
export function formatRetryDuration(retryAfterSeconds: number): string {
  if (retryAfterSeconds >= 3600) {
    return `${Math.ceil(retryAfterSeconds / 3600)} h`;
  }
  return `${Math.max(1, Math.ceil(retryAfterSeconds / 60))} min`;
}
