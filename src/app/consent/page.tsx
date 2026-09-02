import { Suspense } from 'react';
import { ConsentWallForm } from '@/components/privacy/consent-wall-form';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { mustGrantHealthConsent } from '@/lib/privacy/consent';
import { getAthleteConsentRow, getAthleteHealthExposure } from '@/lib/privacy/consent-store';
import { awaitRequest } from '@/lib/next/await-request';

export default function ConsentPage() {
  return (
    <Suspense fallback={<ConsentWallForm />}>
      <ConsentPageContent />
    </Suspense>
  );
}

async function ConsentPageContent() {
  await awaitRequest();

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
