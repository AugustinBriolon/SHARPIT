import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonPill,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

function DrillDownHeroSkeleton({ withQuickRead = true }: { withQuickRead?: boolean }) {
  return (
    <SkeletonCard className="px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonEyebrow className="w-24" />
            <SkeletonTitle className="w-48 max-w-full" size="lg" />
            <SkeletonText widths={['62%', '44%']} />
          </div>
          <SkeletonPill className="w-28" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-32 rounded-full border-0" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-analysis border-analysis-border/60 border p-2">
                  <Skeleton className="h-2.5 w-12 rounded-full border-0" />
                  <Skeleton className="mt-2 h-6 w-10 rounded-full border-0" />
                </div>
              ))}
            </div>
          </div>
          {withQuickRead ? (
            <div className="rounded-analysis border-analysis-border/60 border p-4">
              <SkeletonEyebrow className="w-24" />
              <Skeleton className="mt-3 h-10 w-20 border-0" />
              <SkeletonText className="mt-2" widths={['100%', '72%']} />
            </div>
          ) : null}
        </div>
      </div>
    </SkeletonCard>
  );
}

function DrillDownNarrativeSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <SkeletonCard key={index}>
          <SkeletonEyebrow className="mb-3 w-20" />
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-full border-0" />
              <SkeletonText widths={['100%', '94%', '66%']} />
            </div>
          </div>
        </SkeletonCard>
      ))}
    </>
  );
}

function DrillDownStatsGridSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard key={index} className="space-y-3">
          <SkeletonEyebrow className="w-24" />
          <Skeleton className="h-8 w-20 border-0" />
          <SkeletonText widths={['68%', '52%']} />
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
    <SkeletonCard>
      <SkeletonEyebrow className={titleWidth} />
      <SkeletonText className="mt-4" widths={lines} />
    </SkeletonCard>
  );
}

export function MetricDrillDownSkeleton({
  title,
  backHref = '/',
  backLabel = "Aujourd'hui",
  variant = 'default',
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  variant?: 'sleep' | 'recovery' | 'effort' | 'adaptation' | 'default';
}) {
  return (
    <div className="space-y-4">
      <MobileDrillDownHeader backHref={backHref} backLabel={backLabel} title={title} />
      <div className="space-y-3">
        <DrillDownHeroSkeleton />
        {variant === 'sleep' ? <DrillDownStatsGridSkeleton items={4} /> : null}
        <DrillDownNarrativeSkeleton />
        {variant !== 'sleep' ? <DrillDownStatsGridSkeleton items={3} /> : null}
        <DrillDownSectionSkeleton />
        {variant === 'sleep' ? (
          <>
            <DrillDownSectionSkeleton lines={['100%', '88%', '76%']} titleWidth="w-28" />
            <DrillDownSectionSkeleton lines={['100%', '82%']} titleWidth="w-24" />
          </>
        ) : (
          <DrillDownSectionSkeleton lines={['100%', '92%', '84%', '62%']} titleWidth="w-36" />
        )}
      </div>
    </div>
  );
}
