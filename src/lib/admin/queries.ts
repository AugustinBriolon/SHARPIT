import type { AccessTier } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type AdminAthleteRow = {
  id: string;
  clerkUserId: string;
  tier: AccessTier;
  createdAt: Date;
};

export async function listAthletesForAdmin(): Promise<AdminAthleteRow[]> {
  return prisma.athleteProfile.findMany({
    select: { id: true, clerkUserId: true, tier: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * The /admin toggle. Goes through a `manual` entitlement so the tier stays derived from
 * subscriptions (ADR-044): an Apple renewal can no longer undo it, nor it an Apple one.
 */
export async function setAthleteTier(athleteId: string, tier: AccessTier) {
  const { setManualTier } = await import('@/lib/billing/subscription-store');
  return setManualTier(athleteId, tier);
}
