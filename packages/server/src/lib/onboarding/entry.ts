import { athleteNeedsOnboarding } from '@sharpit/server/lib/onboarding/status/status';
import { CURRENT_PRIVACY_VERSION } from '@sharpit/app/lib/privacy/constants';
import {
  athleteNeedsLegalConsent,
  getAthleteConsentRow,
} from '@sharpit/server/lib/privacy/consent-store';
import {
  consentWallHrefAfterHealthWithdraw,
  resolveConsentWallReason,
} from '@sharpit/app/lib/privacy/consent-withdraw-ux';

export { ENTRY_PATH } from '@sharpit/app/lib/onboarding/entry-path';

/** The consent wall this athlete must pass, or null when their consents are current. */
export async function consentWallHref(athleteId: string): Promise<string | null> {
  if (!(await athleteNeedsLegalConsent(athleteId))) {
    return null;
  }
  const profile = await getAthleteConsentRow(athleteId);
  const withdrawReason = profile
    ? resolveConsentWallReason({
        termsAcceptedAt: profile.termsAcceptedAt,
        privacyAcceptedAt: profile.privacyAcceptedAt,
        privacyVersion: profile.privacyVersion,
        healthDataConsentAt: profile.healthDataConsentAt,
        currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
      })
    : null;
  return withdrawReason ? consentWallHrefAfterHealthWithdraw() : '/consent';
}

/** The athlete's next screen: consents, then onboarding, then Today. */
export async function athleteEntryPath(athleteId: string): Promise<string> {
  const consent = await consentWallHref(athleteId);
  if (consent) {
    return consent;
  }
  return (await athleteNeedsOnboarding(athleteId)) ? '/onboarding' : '/';
}
