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
    /* text-verdict: 1.25rem × 1.3 ≈ 26px · sm 1.55rem × 1.3 ≈ 32px */
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

/** Matches DrillDownStatsStrip instrument chips — no parent panel. */
export function SkeletonStatsStrip({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  let desktopCols = 'sm:grid-cols-2';
  if (items >= 4) desktopCols = 'sm:grid-cols-4';
  else if (items === 3) desktopCols = 'sm:grid-cols-3';

  return (
    <nav className={cn('grid grid-cols-2 gap-2', desktopCols, className)} aria-hidden>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="border-analysis-border/80 bg-background/50 inline-flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 sm:py-1.5"
        >
          <Skeleton className="h-2.5 w-12 rounded-full" />
          <Skeleton className="h-4 w-8 rounded-md" />
        </div>
      ))}
    </nav>
  );
}

/** Matches insight narrative section cards. */
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
