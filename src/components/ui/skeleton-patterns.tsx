import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SkeletonEyebrow({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3 w-20 rounded-full border-0', className)} />;
}

export function SkeletonTitle({
  className,
  size = 'lg',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}) {
  const heights = {
    sm: 'h-5 w-32',
    md: 'h-7 w-48',
    lg: 'h-8 w-64',
    hero: 'h-7 w-56 max-w-full sm:h-[1.55rem]',
  };
  return <Skeleton className={cn(heights[size], 'border-0', className)} />;
}

export function SkeletonText({
  widths = ['100%', '92%', '68%'],
  lineClassName,
  className,
}: {
  widths?: string[];
  lineClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {widths.map((width, index) => (
        <Skeleton
          key={`${width}-${index}`}
          className={cn('h-3.5 rounded-full border-0', lineClassName)}
          style={{ width }}
        />
      ))}
    </div>
  );
}

export function SkeletonPill({ className }: { className?: string }) {
  return <Skeleton className={cn('h-8 w-24 rounded-full', className)} />;
}

export function SkeletonCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('analysis-panel rounded-analysis-lg p-4 sm:p-5', className)}>{children}</div>
  );
}

export function SkeletonAnalysisPanelAlt({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn('analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6 sm:py-6', className)}
    >
      {children}
    </section>
  );
}

/** Matches PhysioRail track height (h-2.5). */
export function SkeletonPhysioRail({
  showCaption = false,
  className,
}: {
  showCaption?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Skeleton className="h-2.5 w-full rounded-full border-0" />
      {showCaption ? <Skeleton className="h-2.5 w-28 rounded-full border-0" /> : null}
    </div>
  );
}

/** Matches RadialScoreCard: label + reading + value + PhysioRail. */
export function SkeletonRadialScoreCard({ className }: { className?: string }) {
  return (
    <div className={cn('analysis-panel rounded-analysis flex flex-col gap-3 px-4 py-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-16 rounded-full border-0" />
          <Skeleton className="h-4 w-28 max-w-full rounded-full border-0" />
        </div>
        <Skeleton className="h-8 w-12 shrink-0 rounded-lg border-0" />
      </div>
      <div className="space-y-2">
        <SkeletonPhysioRail />
        <Skeleton className="h-3 w-36 rounded-full border-0" />
      </div>
    </div>
  );
}

/** Matches DrillDownDimensionRow: label + description + score + h-1.5 bar. */
export function SkeletonDimensionRow({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-4 w-32 max-w-full rounded-full border-0" />
          <Skeleton className="h-2.5 w-24 rounded-full border-0" />
        </div>
        <Skeleton className="h-4 w-7 shrink-0 rounded-full border-0" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full border-0" />
    </div>
  );
}

/** Matches DrillDownStatsStrip / MetricCell strip layout. */
export function SkeletonStatsStrip({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'analysis-panel rounded-analysis-lg grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4',
        className,
      )}
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-4 text-center"
        >
          <Skeleton className="h-2.5 w-14 rounded-full border-0" />
          <Skeleton className="mt-2 h-5 w-12 rounded-lg border-0" />
          <Skeleton className="mt-1 h-2.5 w-10 rounded-full border-0" />
        </div>
      ))}
    </section>
  );
}

/** Matches InsightNarrative section cards. */
export function SkeletonInsightSection({
  blocks = 1,
  className,
}: {
  blocks?: number;
  className?: string;
}) {
  return (
    <section className={cn('analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6', className)}>
      <Skeleton className="mb-3 h-3 w-28 rounded-full border-0" />
      <div className="space-y-4">
        {Array.from({ length: blocks }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-40 max-w-full rounded-full border-0" />
            <SkeletonText widths={['100%', '94%', '72%']} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** @deprecated Prefer SkeletonRadialScoreCard — kept for gradual migration. */
export function SkeletonMetricRail({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonRadialScoreCard key={index} />
      ))}
    </div>
  );
}

export function SkeletonHeroSplit({
  rightCard = true,
  className,
}: {
  rightCard?: boolean;
  className?: string;
}) {
  return (
    <SkeletonAnalysisPanelAlt className={className}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_18rem] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <SkeletonEyebrow />
              <SkeletonTitle size="hero" />
            </div>
            <SkeletonPill className="h-6 w-24 rounded-full" />
          </div>
          <SkeletonText lineClassName="h-4" widths={['88%', '72%']} />
          <div className="max-w-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-24 rounded-full border-0" />
              <Skeleton className="h-2.5 w-36 rounded-full border-0" />
            </div>
            <SkeletonPhysioRail />
          </div>
        </div>
        {rightCard ? (
          <div className="analysis-panel rounded-analysis px-4 py-4">
            <SkeletonEyebrow className="w-28" />
            <Skeleton className="mt-2 h-9 w-16 border-0" />
            <SkeletonText className="mt-2" widths={['100%', '78%']} />
          </div>
        ) : null}
      </div>
    </SkeletonAnalysisPanelAlt>
  );
}
