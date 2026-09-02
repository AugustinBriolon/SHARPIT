import { redirect } from 'next/navigation';
import { auth, currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { isDevClerkBypass } from '@/lib/dev/dev-auth';
import { isDemoSession } from '@/lib/demo/demo-session';
import { INVITE_COOKIE, canProvisionNewAthlete, isSignupGateEnabled } from '@/lib/auth/signup-gate';

async function hasExistingAthleteProfile(userId: string): Promise<boolean> {
  const existing = await prisma.athleteProfile.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });
  return !!existing;
}

async function isProvisionAllowedForCurrentUser(): Promise<boolean> {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const store = await cookies();
  const inviteCode = store.get(INVITE_COOKIE)?.value ?? null;
  return canProvisionNewAthlete({ email, inviteCode });
}

async function shouldBlockUnauthorizedSignup(): Promise<boolean> {
  if (isDevClerkBypass() || !isSignupGateEnabled() || (await isDemoSession())) {
    return false;
  }

  const { userId } = await auth();
  if (!userId || (await hasExistingAthleteProfile(userId))) {
    return false;
  }

  return !(await isProvisionAllowedForCurrentUser());
}

/**
 * Redirects unauthorized brand-new Clerk sessions to `/access-denied`
 * before OnboardingGate / app data resolution tries to provision them.
 */
export async function SignupAccessGate() {
  if (await shouldBlockUnauthorizedSignup()) {
    redirect('/access-denied');
  }
  return null;
}
