import { Suspense } from 'react';
import { GateRedirect } from '@/components/navigation/gate-redirect';
import { Skeleton } from '@/components/ui/skeleton';
import { OnboardingWizard } from '@/components/onboarding/wizard/onboarding-wizard';
import { awaitRequest } from '@sharpit/server/lib/next/await-request';
import type { OnboardingPayload } from '@sharpit/server/lib/web/onboarding';
import { cachedServerApiJson } from '@/server/api-client';
import { getViewer } from '@/server/viewer';

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
    <div aria-label="Chargement de l’onboarding" className="space-y-6" role="status" aria-busy>
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
  // Consents come first; a finished athlete belongs on Today. Client-side redirects:
  // this runs inside a streamed Suspense boundary, where `redirect()` aborts the render.
  const viewer = await getViewer();
  if (viewer.consentWallHref) {
    return <GateRedirect href={viewer.consentWallHref} />;
  }
  if (!viewer.needsOnboarding) {
    return <GateRedirect href="/" />;
  }
  const onboarding = await cachedServerApiJson<OnboardingPayload>('/api/web/onboarding');
  if (!onboarding) {
    throw new Error('api. has no onboarding for this session');
  }
  return <OnboardingWizard {...onboarding} />;
}
