import { ConsentWallForm } from '@/components/privacy/consent-wall-form';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { mustGrantHealthConsent } from '@/lib/privacy/consent';
import { getAthleteConsentRow, getAthleteHealthExposure } from '@/lib/privacy/consent-store';

export default async function ConsentPage() {
  let healthExposure = false;
  try {
    const athleteId = await getCurrentAthleteId();
    const [profile, exposure] = await Promise.all([
      getAthleteConsentRow(athleteId),
      getAthleteHealthExposure(athleteId),
    ]);
    healthExposure = mustGrantHealthConsent({
      healthDataConsentAt: profile?.healthDataConsentAt ?? null,
      ...exposure,
    });
  } catch {
    // Unauthenticated edge — form still renders; gate handles redirects elsewhere.
  }

  return <ConsentWallForm healthExposure={healthExposure} />;
}
