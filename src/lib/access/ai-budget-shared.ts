/**
 * Header name and copy shared between the coach routes (server) and the coach
 * hooks (client) that warn an athlete approaching their daily AI budget.
 *
 * Kept in its own prisma-free module: `ai-budget.ts` imports `@/lib/prisma`,
 * which must never end up in a client bundle. Client code imports only from
 * here.
 */

export const AI_BUDGET_WARNING_HEADER = 'X-Ai-Budget-Warning';

export function aiBudgetWarningMessage(): string {
  return "Tu approches de ta limite d'échanges avec le coach sur les dernières 24h.";
}
