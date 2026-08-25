import { redirect } from 'next/navigation';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { athleteNeedsOnboarding } from '@/lib/onboarding/status';

/**
 * Redirects incomplete first-login athletes into `/onboarding`.
 * Rendered inside `(app)` Suspense so Clerk/cookies stay off the prerender path.
 */
export async function OnboardingGate() {
  const athleteId = await getCurrentAthleteId();
  if (await athleteNeedsOnboarding(athleteId)) {
    redirect('/onboarding');
  }
  return null;
}
