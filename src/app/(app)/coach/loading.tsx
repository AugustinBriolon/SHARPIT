import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonCard, SkeletonEyebrow } from '@/components/ui/skeleton-patterns';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SkeletonEyebrow className="w-16" />
        <Skeleton className="h-8 w-48 rounded-full border-0" />
      </div>
      <SkeletonCard className="h-[60vh] w-full space-y-3">
        <Skeleton className="h-4 w-2/3 rounded-full border-0" />
        <Skeleton className="ml-auto h-4 w-1/2 rounded-full border-0" />
        <Skeleton className="h-4 w-3/5 rounded-full border-0" />
      </SkeletonCard>
    </div>
  );
}
