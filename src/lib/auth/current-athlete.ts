import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';

/**
 * Resolves the signed-in Clerk user to their `AthleteProfile.id` (ADR-025).
 *
 * Lazily provisions a fresh, empty profile on a brand-new Clerk user's first
 * authenticated request — there is no `user.created` webhook, so this is the
 * substitute. `findUnique` before `create` avoids bumping `updatedAt` on
 * every request for an athlete who already has a profile.
 *
 * `cache()`-wrapped like `getAthleteProfile` (`src/lib/queries/index.ts`) —
 * deduped within one request/render tree, not across requests.
 */
export const getCurrentAthleteId = cache(async (): Promise<string> => {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('getCurrentAthleteId called without an authenticated session');
  }

  const existing = await prisma.athleteProfile.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.athleteProfile.create({ data: { clerkUserId: userId } });
    return created.id;
  } catch (error) {
    // Two concurrent first-requests from the same brand-new user raced the
    // create — the loser reads back what the winner just inserted.
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await prisma.athleteProfile.findUniqueOrThrow({
        where: { clerkUserId: userId },
        select: { id: true },
      });
      return raced.id;
    }
    throw error;
  }
});
