import { GateRedirect } from '@/components/navigation/gate-redirect';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { consentWallHref } from '@/lib/onboarding/entry';
import { getAthleteConsentRow } from '@/lib/privacy/consent-store';

/**
 * Soft wall: sends athletes missing CGU/Privacy/health accept into `/consent`.
 * Soft-deleted accounts are signed out via redirect to sign-in after clear.
 * Health consent is required (art. 9 — sync + Twin processing), same as legal docs.
 * Safety net only: sign-in / sign-up go through `/start`, which routes there directly.
 */
export async function PrivacyConsentGate() {
  const athleteId = await getCurrentAthleteId();
  const profile = await getAthleteConsentRow(athleteId);
  if (profile?.deletedAt) {
    return <GateRedirect href="/sign-in" />;
  }
  const wall = await consentWallHref(athleteId);
  return wall ? <GateRedirect href={wall} /> : null;
}
