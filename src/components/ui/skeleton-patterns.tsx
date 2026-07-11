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
  size?: 'sm' | 'md' | 'lg';
}) {
  const heights = {
    sm: 'h-5 w-32',
    md: 'h-7 w-48',
    lg: 'h-8 w-64',
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

export function SkeletonMetricRail({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="rounded-analysis flex flex-col items-center px-2 py-3">
          <Skeleton className="size-[72px] rounded-full" />
          <Skeleton className="mt-2 h-3.5 w-14 rounded-full border-0" />
        </div>
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
    <SkeletonCard className={cn('px-5 py-5 sm:px-6 sm:py-6', className)}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_18rem] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <SkeletonEyebrow />
              <SkeletonTitle className="w-56 max-w-full" size="lg" />
            </div>
            <SkeletonPill className="w-24" />
          </div>
          <SkeletonText widths={['52%', '38%']} />
          <SkeletonText widths={['100%', '94%', '58%']} />
        </div>
        {rightCard ? (
          <div className="analysis-panel rounded-analysis px-4 py-4">
            <SkeletonEyebrow className="w-28" />
            <Skeleton className="mt-2 h-9 w-24 border-0" />
            <Skeleton className="mt-2 h-3.5 w-32 border-0" />
          </div>
        ) : null}
      </div>
    </SkeletonCard>
  );
}
