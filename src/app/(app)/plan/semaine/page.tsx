import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanningEmbeddedSkeleton } from '@/components/planning/planning-embedded-skeleton';
import { PlanningView } from '@/components/planning/planning-view';

export default function PlanSemainePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink fallbackHref="/plan" fallbackLabel="Plan" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Plan</p>
        <h1 className="text-page-title mt-1">La semaine</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organisation du cycle, prochaines séances et ajustements du plan.
        </p>
      </StickyHeader>

      {/* Suspense for `useSearchParams` (?planned= deep-link) — header above is static. */}
      <Suspense fallback={<PlanningEmbeddedSkeleton />}>
        <PlanningView embedded showCoachMenu />
      </Suspense>
    </div>
  );
}
