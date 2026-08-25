import { cache } from 'react';
import { auth } from '@clerk/nextjs/server';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import { DEMO_CLERK_USER_ID, isDemoSession } from '@/lib/demo/demo-session';

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
  // When Clerk's backend is unreachable (corporate proxy / SSL inspection),
  // the proxy skips auth.protect() entirely — there is no session to resolve.
  // Single-athlete dev fallback: the one existing profile row.
  if (isDevClerkBypass()) {
    const athlete = await prisma.athleteProfile.findFirstOrThrow();
    return athlete.id;
  }

  // Public read-only demo: isDemoSession() already confirms there is no real
  // Clerk session, so a signed-in athlete with a stray demo cookie still
  // resolves to their own profile below, not the demo tenant.
  if (await isDemoSession()) {
    const demoAthlete = await prisma.athleteProfile.findUniqueOrThrow({
      where: { clerkUserId: DEMO_CLERK_USER_ID },
      select: { id: true },
    });
    return demoAthlete.id;
  }

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
