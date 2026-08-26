import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonEyebrow } from '@/components/ui/skeleton-patterns';

function RaceCardSkeleton() {
  return (
    <SkeletonCard className="rounded-analysis gap-0 overflow-hidden p-0">
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-48 border-0" />
            <Skeleton className="h-3 w-20 border-0" />
            <Skeleton className="h-5 w-2/3 border-0" />
            <Skeleton className="h-3 w-40 border-0" />
          </div>
          <Skeleton className="h-9 w-14 shrink-0 border-0" />
        </div>
        <Skeleton className="h-12 w-full border-0" />
      </div>
      <div className="border-analysis-border bg-analysis-surface-alt/70 flex items-center justify-between border-t px-4 py-3">
        <Skeleton className="h-8 w-20 border-0" />
        <Skeleton className="size-9 border-0" />
      </div>
    </SkeletonCard>
  );
}

function MetricCardSkeleton() {
  return (
    <SkeletonCard className="rounded-analysis gap-0 overflow-hidden p-0">
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-1/2 border-0" />
        <Skeleton className="h-3 w-1/3 border-0" />
        <Skeleton className="h-1 w-full border-0" />
        <div className="flex justify-between gap-3">
          <Skeleton className="h-3 w-24 border-0" />
          <Skeleton className="h-3 w-20 border-0" />
        </div>
      </div>
      <div className="border-analysis-border bg-analysis-surface-alt/70 flex items-center justify-between border-t px-4 py-3">
        <Skeleton className="h-8 w-20 border-0" />
        <Skeleton className="size-9 border-0" />
      </div>
    </SkeletonCard>
  );
}

export function GoalsViewSkeleton({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <div className="space-y-8">
      {embedded ? null : (
        <>
          <MobileBackLink href="/progress?tab=goals" label="Progression" showOnDesktop />
          <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-label">Progression</p>
              <h1 className="text-page-title mt-1">Objectifs</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Des courses aux objectifs hebdomadaires — toute la hiérarchie.
              </p>
            </div>
            <Skeleton className="h-9 w-36 rounded-lg" />
          </StickyHeader>
        </>
      )}

      <section className="space-y-4">
        <SkeletonEyebrow className="w-32" />
        <div className="space-y-3">
          <RaceCardSkeleton />
          <RaceCardSkeleton />
        </div>
      </section>

      <section className="space-y-6">
        <SkeletonEyebrow className="w-36" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-24 border-0" />
          <div className="grid gap-3 md:grid-cols-2">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </div>
      </section>
    </div>
  );
}
