import { startOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { hasProAccess } from '@/lib/access/tier';

/**
 * Global cost ceiling, distinct from the per-endpoint rate limiters in
 * rate-limit.ts (those cap request *frequency*; this caps daily *spend* per
 * athlete, in tokens, across every AI feature combined). FREE only for now —
 * Pro has no real billing yet either, so leaving it uncapped is a deliberate
 * next step, not an oversight.
 */
const FREE_DAILY_TOKEN_BUDGET = 100_000;

export type AiBudgetStatus = { allowed: boolean; isPro: boolean };

/** Read-only check — never spends anything itself, the AiUsageEvent rows recordAiUsage already writes are the ledger. */
export async function ensureFreeAiBudget(athleteId: string): Promise<AiBudgetStatus> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { tier: true },
  });
  const isPro = hasProAccess(profile?.tier ?? 'FREE');
  if (isPro) {
    return { allowed: true, isPro: true };
  }

  const since = startOfDay(new Date());
  const usage = await prisma.aiUsageEvent.aggregate({
    where: { athleteId, createdAt: { gte: since } },
    _sum: { totalTokens: true },
  });
  const usedToday = usage._sum.totalTokens ?? 0;

  return { allowed: usedToday < FREE_DAILY_TOKEN_BUDGET, isPro: false };
}
