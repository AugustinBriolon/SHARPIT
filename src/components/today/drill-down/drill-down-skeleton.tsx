'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonAnalysisPanelAlt,
  SkeletonCard,
  SkeletonDimensionRow,
  SkeletonEyebrow,
  SkeletonInsightSection,
  SkeletonPhysioRail,
  SkeletonStatsStrip,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

function DrillDownHeroSkeleton({ withQuickRead = true }: { withQuickRead?: boolean }) {
  return (
    <SkeletonAnalysisPanelAlt>
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-36 rounded-full" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-28 rounded-full" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_14rem] lg:items-start">
          <div className="space-y-3">
            <SkeletonEyebrow className="w-24" />
            <SkeletonTitle size="drill-hero" />
            <div className="max-w-xl space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-24 rounded-full" />
                <Skeleton className="h-2.5 w-40 rounded-full" />
              </div>
              <SkeletonPhysioRail />
            </div>
          </div>
          {withQuickRead ? (
            <div className="analysis-panel rounded-analysis px-4 py-4">
              <SkeletonEyebrow className="w-24" />
              <Skeleton className="mt-2 h-9 w-16" />
              <SkeletonText className="mt-2" widths={['100%', '72%']} />
            </div>
          ) : null}
        </div>
      </div>
    </SkeletonAnalysisPanelAlt>
  );
}

function DrillDownGlobalDecisionSkeleton() {
  return (
    <SkeletonCard className="px-5 py-5">
      <SkeletonEyebrow className="w-40" />
      <Skeleton className="mt-3 h-7 w-48 max-w-full rounded-full" />
      <SkeletonText className="mt-2" widths={['100%', '86%']} />
      <Skeleton className="mt-3 h-3.5 w-24 rounded-full" />
    </SkeletonCard>
  );
}

function DrillDownDimensionsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <SkeletonCard className="px-5 py-5">
      <SkeletonEyebrow className="w-36" />
      <div className="mt-4 space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonDimensionRow key={index} />
        ))}
      </div>
    </SkeletonCard>
  );
}

function DrillDownStatsGridSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard key={index} className="space-y-3 px-5 py-5">
          <SkeletonEyebrow className="w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="rounded-analysis h-16 w-full" />
        </SkeletonCard>
      ))}
    </div>
  );
}

function DrillDownSectionSkeleton({
  titleWidth = 'w-32',
  lines = ['100%', '94%', '70%'],
}: {
  titleWidth?: string;
  lines?: string[];
}) {
  return (
    <SkeletonCard className="px-5 py-5">
      <SkeletonEyebrow className={titleWidth} />
      <SkeletonText className="mt-4" widths={lines} />
    </SkeletonCard>
  );
}

function DrillDownVariantTail({
  variant,
}: {
  variant: 'sleep' | 'recovery' | 'effort' | 'adaptation' | 'default';
}) {
  if (variant === 'sleep') {
    return (
      <>
        <DrillDownStatsGridSkeleton items={2} />
        <DrillDownSectionSkeleton lines={['100%', '88%', '76%']} titleWidth="w-28" />
        <DrillDownSectionSkeleton lines={['100%', '82%']} titleWidth="w-24" />
      </>
    );
  }

  if (variant === 'effort' || variant === 'adaptation') {
    return (
      <>
        <DrillDownDimensionsSkeleton rows={3} />
        <DrillDownStatsGridSkeleton items={3} />
        <DrillDownSectionSkeleton lines={['100%', '92%', '84%', '62%']} titleWidth="w-36" />
      </>
    );
  }

  return (
    <>
      <DrillDownStatsGridSkeleton items={3} />
      <DrillDownSectionSkeleton lines={['100%', '92%', '84%', '62%']} titleWidth="w-36" />
    </>
  );
}

export function MetricDrillDownSkeleton({
  variant = 'default',
}: {
  variant?: 'sleep' | 'recovery' | 'effort' | 'adaptation' | 'default';
}) {
  return (
    <div className="space-y-4">
      <header className="mb-3 space-y-2 lg:mb-4">
        <div className="inline-flex min-h-11 items-center gap-1">
          <Skeleton className="size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <Skeleton className="h-7 w-36 max-w-full rounded-full lg:h-8" />
      </header>

      <div className="mx-auto space-y-3 pb-8">
        <DrillDownHeroSkeleton />
        <DrillDownGlobalDecisionSkeleton />
        {variant === 'sleep' ? <SkeletonStatsStrip items={4} /> : <SkeletonStatsStrip items={3} />}
        <div className="space-y-3">
          <SkeletonInsightSection blocks={2} />
          <SkeletonInsightSection blocks={1} />
        </div>
        {variant === 'recovery' ? <DrillDownDimensionsSkeleton rows={4} /> : null}
        <DrillDownVariantTail variant={variant} />
        <Skeleton className="mx-auto h-3 w-56 rounded-full" />
      </div>
    </div>
  );
}
