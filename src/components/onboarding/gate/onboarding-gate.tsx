import { GateRedirect } from '@/components/navigation/gate-redirect';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { GARMIN_SSO_PAGE_PATH } from '@/lib/integrations/garmin/garmin-browser-sso-shared';
import { athleteNeedsOnboarding } from '@/lib/onboarding/status/status';

/**
 * Pages onboarding itself sends the athlete through: the Garmin sign-in lives under
 * `(app)` and returns to `/onboarding` once connected. Sending it back to `/onboarding`
 * restarted onboarding at step 1.
 */
const DURING_ONBOARDING = [GARMIN_SSO_PAGE_PATH];

/**
 * Sends incomplete first-login athletes into `/onboarding`.
 * Rendered inside `(app)` Suspense so Clerk/cookies stay off the prerender path.
 */
export async function OnboardingGate() {
  const athleteId = await getCurrentAthleteId();
  if (await athleteNeedsOnboarding(athleteId)) {
    return <GateRedirect exempt={DURING_ONBOARDING} href="/onboarding" />;
  }
  return null;
}
