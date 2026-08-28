import { prisma } from '@/lib/prisma';
import { hasProAccess } from '@/lib/access/tier';

/**
 * FREE athletes get a small number of on-demand session-analysis credits so
 * they can try the Pro-gated narrative before paying. Credits are spent only
 * by the athlete's own deliberate "Générer" tap (the API route) — never by
 * the passive background sync that auto-generates narratives when the coach
 * is configured (see runActivityNarrativeForIds in athlete-state/background.ts).
 */
export const FREE_NARRATIVE_TRIAL_LIMIT = 3;

export function narrativeTrialCreditsLeft(freeNarrativeCreditsUsed: number): number {
  return Math.max(0, FREE_NARRATIVE_TRIAL_LIMIT - freeNarrativeCreditsUsed);
}

export type NarrativeAccessStatus = { isPro: boolean; trialCreditsLeft: number };

/** Read-only status for UI/route pre-checks — never spends a credit. */
export async function getNarrativeAccessStatus(athleteId: string): Promise<NarrativeAccessStatus> {
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { tier: true, freeNarrativeCreditsUsed: true },
  });
  const isPro = hasProAccess(profile?.tier ?? 'FREE');
  return {
    isPro,
    trialCreditsLeft: isPro ? 0 : narrativeTrialCreditsLeft(profile?.freeNarrativeCreditsUsed ?? 0),
  };
}
