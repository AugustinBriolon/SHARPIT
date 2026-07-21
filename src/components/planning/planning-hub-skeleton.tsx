import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';

/** Route loading chrome for /training/planning — back + sticky + week grid. */
export function PlanningHubSkeleton() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/training" label="Entraînement" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Planning</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organisation du cycle, prochaines séances et ajustements du plan.
        </p>
      </StickyHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Skeleton className="size-9 rounded-lg" />
          <div className="min-w-44 text-center">
            <SkeletonDataValue heightClassName="h-4" widthClassName="w-32" />
            <div className="mt-1 flex justify-center">
              <SkeletonDataValue heightClassName="h-3" widthClassName="w-24" />
            </div>
          </div>
          <Skeleton className="size-9 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Skeleton className="h-4 w-10 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-4 w-28 rounded-full" />
      </div>

      <div className="analysis-panel divide-analysis-border rounded-analysis-lg divide-y overflow-hidden">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex gap-3 px-3 py-3 sm:gap-4 sm:px-4">
            <div className="w-11 shrink-0 text-center sm:w-12">
              <SkeletonDataValue heightClassName="h-2.5" widthClassName="w-8" />
              <div className="mt-1 flex justify-center">
                <SkeletonDataValue heightClassName="h-6" widthClassName="w-6" />
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2 py-1">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
