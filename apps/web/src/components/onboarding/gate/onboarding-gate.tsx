import { GateRedirect } from '@/components/navigation/gate-redirect';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { GARMIN_SSO_PAGE_PATH } from '@/lib/integrations/garmin/garmin-browser-sso-shared';
import { consentWallHref } from '@/lib/onboarding/entry';
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
 *
 * Consents come first: while they are missing, `PrivacyConsentGate` (same layout)
 * owns the redirect. Both gates redirect client-side, so if this one also fired, the
 * last to run would win — and a brand-new account reached onboarding without ever
 * seeing `/consent`, then every provider connect was refused.
 */
export async function OnboardingGate() {
  const athleteId = await getCurrentAthleteId();
  if (await consentWallHref(athleteId)) {
    return null;
  }
  if (await athleteNeedsOnboarding(athleteId)) {
    return <GateRedirect exempt={DURING_ONBOARDING} href="/onboarding" />;
  }
  return null;
}
