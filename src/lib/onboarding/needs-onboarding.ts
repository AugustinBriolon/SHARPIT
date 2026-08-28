/**
 * Pure gate decision — kept free of Prisma/auth so unit tests stay offline.
 */
export function needsOnboardingFromProfile(input: {
  onboardingCompletedAt: Date | null;
  isDemo: boolean;
  isDevBypass: boolean;
}): boolean {
  if (input.isDevBypass || input.isDemo) {
    return false;
  }
  return (input.onboardingCompletedAt === undefined || input.onboardingCompletedAt === null);
}
