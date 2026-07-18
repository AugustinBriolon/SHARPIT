import { PhysioRail } from '@/components/ui/physio-rail';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SkeletonEyebrow({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3 w-20 rounded-full', className)} />;
}

export function SkeletonTitle({
  className,
  size = 'lg',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero' | 'drill-hero';
}) {
  const heights = {
    sm: 'h-5 w-32',
    md: 'h-7 w-48',
    lg: 'h-8 w-64',
    /* text-verdict: 1.25rem × 1.35 = 27px · sm 1.4rem × 1.35 = 30.2px */
    hero: 'h-[1.69rem] w-56 max-w-full sm:h-[1.89rem]',
    /* drill-down hero: text-xl × leading-snug = 27.5px · sm 1.55rem × 1.375 = 34.1px */
    'drill-hero': 'h-[1.72rem] w-56 max-w-full sm:h-[2.13rem]',
  };
  return <Skeleton className={cn(heights[size], className)} />;
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
          className={cn('h-3.5 rounded-full', lineClassName)}
          style={{ width }}
        />
      ))}
    </div>
  );
}

export function SkeletonPill({ className }: { className?: string }) {
  return <Skeleton className={cn('h-8 w-24 rounded-full', className)} />;
}

/** Matches integration StatusBadge pill (~h-5, rounded-full). */
export function SkeletonStatusBadge({ className }: { className?: string }) {
  return <Skeleton className={cn('h-5 w-[5.5rem] rounded-full', className)} />;
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

/** Renders the real PhysioRail in its null state — geometry identical by construction. */
export function SkeletonPhysioRail({
  showCaption = false,
  size = 'default',
  className,
}: {
  showCaption?: boolean;
  size?: 'default' | 'slim';
  className?: string;
}) {
  return (
    <div className={cn('animate-pulse', className)}>
      <PhysioRail max={100} size={size} value={null} />
      {showCaption ? <Skeleton className="mt-1.5 h-2.5 w-28 rounded-full" /> : null}
    </div>
  );
}

/** Matches RadialScoreCard: label + reading + value + slim PhysioRail + explore link. */
export function SkeletonRadialScoreCard({ className }: { className?: string }) {
  return (
    <div className={cn('analysis-panel rounded-analysis flex flex-col gap-3 px-4 py-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="mt-1 h-[1.2rem] w-28 max-w-full rounded-full" />
        </div>
        <Skeleton className="h-8 w-12 shrink-0 rounded-lg" />
      </div>
      <div className="space-y-2">
        <SkeletonPhysioRail size="slim" />
        <div className="flex items-center justify-between gap-2">
          <span className="explore-link opacity-60">lecture physiologique</span>
        </div>
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
          <Skeleton className="h-4 w-32 max-w-full rounded-full" />
          <Skeleton className="h-2.5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-7 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
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
          <Skeleton className="h-2.5 w-14 rounded-full" />
          <Skeleton className="mt-2 h-5 w-12 rounded-lg" />
          <Skeleton className="mt-1 h-2.5 w-10 rounded-full" />
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
      <Skeleton className="mb-3 h-3 w-28 rounded-full" />
      <div className="space-y-4">
        {Array.from({ length: blocks }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-40 max-w-full rounded-full" />
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
              <SkeletonTitle size="drill-hero" />
            </div>
            <SkeletonPill className="h-6 w-24 rounded-full" />
          </div>
          <SkeletonText lineClassName="h-[1.4rem]" widths={['88%', '72%']} />
          <div className="max-w-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-2.5 w-36 rounded-full" />
            </div>
            <SkeletonPhysioRail />
          </div>
        </div>
        {rightCard ? (
          <div className="analysis-panel rounded-analysis px-4 py-4">
            <SkeletonEyebrow className="w-28" />
            <Skeleton className="mt-2 h-9 w-16" />
            <SkeletonText className="mt-2" widths={['100%', '78%']} />
          </div>
        ) : null}
      </div>
    </SkeletonAnalysisPanelAlt>
  );
}
