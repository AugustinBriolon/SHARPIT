import { Suspense } from 'react';
import { GateRedirect } from '@/components/navigation/gate-redirect';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { consentWallHref } from '@/lib/onboarding/entry';
import { athleteNeedsOnboarding } from '@/lib/onboarding/status/status';
import { OnboardingWizard } from '@/components/onboarding/wizard/onboarding-wizard';
import {
  loadConnectedIntegrationIds,
  loadResolvedSourcePrefs,
} from '@/lib/integrations/source-prefs-store';
import { awaitRequest } from '@/lib/next/await-request';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { getAthleteProfile } from '@/lib/queries';
import { getAthleteConsentRow } from '@/lib/privacy/consent-store';

export const metadata = {
  title: 'Bienvenue — SharpIt',
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingStepSkeleton />}>
      <OnboardingPageContent />
    </Suspense>
  );
}

/** The shape of a wizard step (progress, title, options) while the athlete loads. */
function OnboardingStepSkeleton() {
  return (
    <div aria-busy aria-label="Chargement de l’onboarding" className="space-y-6" role="status">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-3 w-8 rounded-md" />
        </div>
        <Skeleton className="h-1 w-full rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-7 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    </div>
  );
}

async function OnboardingPageContent() {
  await awaitRequest();
  const athleteId = await getCurrentAthleteId();
  // Consents come first; a finished athlete belongs on Today. Client-side redirects:
  // this runs inside a streamed Suspense boundary, where `redirect()` aborts the render.
  const consent = await consentWallHref(athleteId);
  if (consent) {
    return <GateRedirect href={consent} />;
  }
  if (!(await athleteNeedsOnboarding(athleteId))) {
    return <GateRedirect href="/" />;
  }

  const [connected, prefs, profile, consents] = await Promise.all([
    loadConnectedIntegrationIds(athleteId),
    loadResolvedSourcePrefs(athleteId),
    getAthleteProfile(athleteId).catch(() => null),
    getAthleteConsentRow(athleteId),
  ]);
  return (
    <OnboardingWizard
      initialEquipment={normalizeAthleteEquipment(profile?.equipment ?? null)}
      initiallyConnected={connected}
      initialPrefs={prefs}
      unofficialAcknowledged={Boolean(consents?.unofficialProvidersAckAt)}
    />
  );
}
