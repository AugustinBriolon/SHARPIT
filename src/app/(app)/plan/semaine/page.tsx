import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { PlanningEmbeddedSkeleton } from '@/components/planning/view/planning-embedded-skeleton';
import { PlanningView } from '@/components/planning/view/planning-view';

export default function PlanSemainePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink fallbackHref="/plan" fallbackLabel="Plan" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Plan</p>
        <h1 className="text-page-title mt-1">La semaine</h1>
      </StickyHeader>

      {/* Suspense for `useSearchParams` (?planned= deep-link) — header above is static. */}
      <Suspense fallback={<PlanningEmbeddedSkeleton />}>
        <PlanningView embedded showCoachMenu />
      </Suspense>
    </div>
  );
}
