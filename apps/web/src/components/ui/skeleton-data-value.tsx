import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Replaces a numeric / short verdict while chrome labels stay mounted. */
export function SkeletonDataValue({
  className,
  widthClassName = 'w-12',
  heightClassName = 'h-4',
}: {
  className?: string;
  widthClassName?: string;
  heightClassName?: string;
}) {
  return (
    <Skeleton
      className={cn(
        'inline-block rounded-md align-middle',
        heightClassName,
        widthClassName,
        className,
      )}
    />
  );
}

/** Dimension / progress bar placeholder — same track height as DrillDownDimensionRow. */
export function SkeletonInstrumentBar({ className }: { className?: string }) {
  return <Skeleton className={cn('h-1.5 w-full rounded-full', className)} />;
}
