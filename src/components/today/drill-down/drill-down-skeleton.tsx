'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonAnalysisPanelAlt,
  SkeletonCard,
  SkeletonDimensionRow,
  SkeletonEyebrow,
  SkeletonInsightSection,
  SkeletonStatsStrip,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

function DrillDownHeroSkeleton() {
  return (
    <SkeletonAnalysisPanelAlt>
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-36 rounded-full" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>
          <Skeleton className="h-3 w-16 rounded-full" />
        </div>

        <SkeletonEyebrow className="w-24" />
        <SkeletonTitle size="drill-hero" />
        <SkeletonText className="max-w-xl" widths={['100%', '72%']} />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
    </SkeletonAnalysisPanelAlt>
  );
}

function DrillDownWhySkeleton() {
  return (
    <div className="space-y-2 px-0.5">
      <div className="flex items-center justify-between gap-3">
        <SkeletonEyebrow className="w-32" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>
      <SkeletonText widths={['100%', '88%']} />
    </div>
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
        <DrillDownSectionSkeleton lines={['100%', '88%', '76%']} titleWidth="w-28" />
        <DrillDownSectionSkeleton lines={['100%', '82%']} titleWidth="w-24" />
      </>
    );
  }

  if (variant === 'effort' || variant === 'adaptation') {
    return (
      <>
        <DrillDownDimensionsSkeleton rows={3} />
        <DrillDownSectionSkeleton lines={['100%', '92%', '84%', '62%']} titleWidth="w-36" />
      </>
    );
  }

  return <DrillDownSectionSkeleton lines={['100%', '92%', '84%', '62%']} titleWidth="w-36" />;
}

export function MetricDrillDownSkeleton({
  variant = 'default',
}: {
  variant?: 'sleep' | 'recovery' | 'effort' | 'adaptation' | 'default';
}) {
  const chipCount = variant === 'adaptation' ? 0 : 3;

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
        {chipCount > 0 ? <SkeletonStatsStrip items={chipCount} /> : null}
        <DrillDownWhySkeleton />
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
