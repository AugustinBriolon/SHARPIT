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

export async function setAthleteTier(athleteId: string, tier: AccessTier) {
  return prisma.athleteProfile.update({
    where: { id: athleteId },
    data: { tier },
    select: { id: true, tier: true },
  });
}
