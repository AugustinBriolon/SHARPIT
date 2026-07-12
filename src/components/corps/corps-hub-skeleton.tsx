import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonEyebrow,
  SkeletonCard,
  SkeletonPill,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

export function CorpsHubSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20 rounded-full border-0" />
        <SkeletonTitle className="h-8 w-56 max-w-full" size="md" />
        <Skeleton className="h-4 w-72 max-w-full rounded-full border-0" />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto pb-0.5">
        <SkeletonPill className="h-9 w-32 shrink-0" />
        <SkeletonPill className="h-9 w-36 shrink-0" />
      </div>

      <SkeletonCard className="px-5 py-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-card/60 rounded-2xl border px-4 py-4">
              <Skeleton className="h-2.5 w-16 rounded-full border-0" />
              <Skeleton className="mt-2 h-8 w-20 border-0" />
              <Skeleton className="mt-2 h-3 w-24 rounded-full border-0" />
            </div>
          ))}
        </div>
      </SkeletonCard>

      <SkeletonCard className="px-5 py-5">
        <SkeletonEyebrow className="w-28" />
        <Skeleton className="rounded-analysis mt-4 h-48 w-full border-0" />
      </SkeletonCard>
    </div>
  );
}
