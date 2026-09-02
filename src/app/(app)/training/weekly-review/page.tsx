import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { WeeklyReviewGate } from '@/components/training/weekly-review/weekly-review-gate';

function WeeklyReviewPageSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <Skeleton className="rounded-analysis-lg h-48 w-full border-0" />
    </div>
  );
}

export default function WeeklyReviewPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/plan" label="Plan" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Coach</p>
        <h1 className="text-page-title mt-1">Bilan de la semaine</h1>
      </StickyHeader>

      {/* Header above is static and prerenders; only the tier check + review wait. */}
      <Suspense fallback={<WeeklyReviewPageSkeleton />}>
        <WeeklyReviewGate />
      </Suspense>
    </div>
  );
}
