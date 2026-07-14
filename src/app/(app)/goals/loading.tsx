import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonEyebrow, SkeletonText } from '@/components/ui/skeleton-patterns';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <SkeletonEyebrow className="w-20" />
          <Skeleton className="h-9 w-48 rounded-full border-0" />
          <SkeletonText widths={['100%', '60%']} />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="space-y-4">
        <SkeletonEyebrow className="w-32" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} className="min-h-36 space-y-2">
              <Skeleton className="h-4 w-1/3 rounded-full border-0" />
              <Skeleton className="h-3 w-2/3 rounded-full border-0" />
            </SkeletonCard>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <SkeletonEyebrow className="w-40" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="min-h-28 space-y-2">
              <Skeleton className="h-4 w-1/2 rounded-full border-0" />
              <Skeleton className="h-3 w-1/3 rounded-full border-0" />
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}
