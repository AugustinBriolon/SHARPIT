import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('border-border/60 bg-muted/60 animate-pulse rounded-xl border', className)}
      aria-hidden
      {...props}
    />
  );
}
