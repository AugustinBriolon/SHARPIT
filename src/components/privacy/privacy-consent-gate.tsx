import { redirect } from 'next/navigation';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { CURRENT_PRIVACY_VERSION } from '@/lib/privacy/constants';
import { athleteNeedsLegalConsent, getAthleteConsentRow } from '@/lib/privacy/consent-store';
import {
  consentWallHrefAfterHealthWithdraw,
  resolveConsentWallReason,
} from '@/lib/privacy/consent-withdraw-ux';

/**
 * Soft wall: redirects athletes missing CGU/Privacy/health accept into `/consent`.
 * Soft-deleted accounts are signed out via redirect to sign-in after clear.
 * Health consent is required (art. 9 — sync + Twin processing), same as legal docs.
 */
export async function PrivacyConsentGate() {
  const athleteId = await getCurrentAthleteId();
  const profile = await getAthleteConsentRow(athleteId);
  if (profile?.deletedAt) {
    redirect('/sign-in');
  }
  if (!(await athleteNeedsLegalConsent(athleteId))) {
    return null;
  }

  const withdrawReason = profile
    ? resolveConsentWallReason({
        termsAcceptedAt: profile.termsAcceptedAt,
        privacyAcceptedAt: profile.privacyAcceptedAt,
        privacyVersion: profile.privacyVersion,
        healthDataConsentAt: profile.healthDataConsentAt,
        currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
      })
    : null;

  redirect(withdrawReason ? consentWallHrefAfterHealthWithdraw() : '/consent');
}
