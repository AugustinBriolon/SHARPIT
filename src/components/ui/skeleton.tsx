import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-muted/60 animate-pulse rounded-xl', className)} aria-hidden {...props} />
  );
}
