import { ConsentWallForm } from '@/components/privacy/consent-wall-form';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { CURRENT_PRIVACY_VERSION } from '@/lib/privacy/constants';
import { getAthleteConsentRow } from '@/lib/privacy/consent-store';
import {
  parseConsentWallReason,
  resolveConsentWallReason,
} from '@/lib/privacy/consent-withdraw-ux';

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const fromQuery = parseConsentWallReason(params.reason);

  let reason = fromQuery;
  if (!reason) {
    try {
      const athleteId = await getCurrentAthleteId();
      const row = await getAthleteConsentRow(athleteId);
      if (row) {
        reason = resolveConsentWallReason({
          termsAcceptedAt: row.termsAcceptedAt,
          privacyAcceptedAt: row.privacyAcceptedAt,
          privacyVersion: row.privacyVersion,
          healthDataConsentAt: row.healthDataConsentAt,
          currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
        });
      }
    } catch {
      // Signed-out / demo edge: keep default first-time wall copy.
    }
  }

  return <ConsentWallForm reason={reason} />;
}
