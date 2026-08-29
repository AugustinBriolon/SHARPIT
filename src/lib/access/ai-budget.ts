import { startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { hasProAccess } from '@/lib/access/tier';
import { AI_BUDGET_WARNING_HEADER, aiBudgetWarningMessage } from '@/lib/access/ai-budget-shared';

/**
 * Global cost ceiling for the coach conversation surface (chat/plan/adapt),
 * distinct from the per-endpoint rate limiters in rate-limit.ts (those cap
 * request *frequency*; this caps daily *spend* in tokens). Scoped to the
 * 'coach' AiUsageEvent feature only — session-narrative analysis has its own,
 * separate, tighter gate (narrative-trial.ts: 1/day, post-signup activities
 * only) and must not eat into or be eaten into by this budget.
 *
 * A real limit, not a technical ceiling: sized to a legitimately engaged
 * FREE athlete's daily use (several chat exchanges, one plan/adapt run), not
 * to the rate limiters' raw maximum throughput. Pro has no real billing yet
 * either, so leaving it uncapped is a deliberate next step, not an oversight.
 */
const FREE_DAILY_TOKEN_BUDGET = 50_000;

/** Ratio of the daily budget at which a still-allowed FREE athlete gets a heads-up before the cutoff. */
const WARNING_THRESHOLD_RATIO = 0.8;

export type AiBudgetStatus = { allowed: boolean; isPro: boolean; warning: boolean };

/** Read-only check — never spends anything itself, the AiUsageEvent rows recordAiUsage already writes are the ledger. */
export async function ensureFreeAiBudget(athleteId: string): Promise<AiBudgetStatus> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { tier: true },
  });
  const isPro = hasProAccess(profile?.tier ?? 'FREE');
  if (isPro) {
    return { allowed: true, isPro: true, warning: false };
  }

  const since = startOfDay(new Date());
  const usage = await prisma.aiUsageEvent.aggregate({
    where: { athleteId, feature: 'coach', createdAt: { gte: since } },
    _sum: { totalTokens: true },
  });
  const usedToday = usage._sum.totalTokens ?? 0;
  const allowed = usedToday < FREE_DAILY_TOKEN_BUDGET;

  return {
    allowed,
    isPro: false,
    warning: allowed && usedToday >= FREE_DAILY_TOKEN_BUDGET * WARNING_THRESHOLD_RATIO,
  };
}

export function aiBudgetResponseBody(): { error: string } {
  return {
    error:
      "Tu as atteint ta limite d'échanges avec le coach pour aujourd'hui. Réessaie demain, ou passe Pro pour un usage illimité.",
  };
}

export { AI_BUDGET_WARNING_HEADER, aiBudgetWarningMessage };

/** Merges the warning header onto a coach route's response headers when the budget check flagged one. */
export function withAiBudgetWarningHeader<T extends Record<string, string>>(
  headers: T,
  warning: boolean,
): T | (T & Record<typeof AI_BUDGET_WARNING_HEADER, string>) {
  return warning ? { ...headers, [AI_BUDGET_WARNING_HEADER]: '1' } : headers;
}
