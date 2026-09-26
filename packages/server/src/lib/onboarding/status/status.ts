import { prisma } from '@sharpit/db/client';
import { DEMO_CLERK_USER_ID, isDemoSession } from '@sharpit/app/lib/demo/demo-session';
import { isDevClerkBypass } from '@sharpit/app/lib/dev/dev-auth';
import { needsOnboardingFromProfile } from '@sharpit/server/lib/onboarding/status/needs-onboarding';

/** True when the athlete must finish `/onboarding` before using the app. */
export async function athleteNeedsOnboarding(athleteId: string): Promise<boolean> {
  // Demo is always skip — even if the demo profile flag is null.
  if (await isDemoSession()) {
    return false;
  }
  if (isDevClerkBypass()) {
    return false;
  }

  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { onboardingCompletedAt: true, clerkUserId: true },
  });
  if (!profile) {
    return false;
  }
  if (profile.clerkUserId === DEMO_CLERK_USER_ID) {
    return false;
  }

  return needsOnboardingFromProfile({
    onboardingCompletedAt: profile.onboardingCompletedAt,
    isDemo: false,
    isDevBypass: false,
  });
}

export async function markOnboardingComplete(athleteId: string): Promise<void> {
  await prisma.athleteProfile.update({
    where: { id: athleteId },
    data: { onboardingCompletedAt: new Date() },
  });
}
