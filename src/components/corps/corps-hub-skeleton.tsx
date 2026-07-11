import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonPill,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

export function CorpsHubSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SkeletonEyebrow className="w-18" />
        <SkeletonTitle className="w-56 max-w-full" size="lg" />
        <SkeletonText widths={['68%', '46%']} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <SkeletonPill className="w-28 shrink-0" />
        <SkeletonPill className="w-32 shrink-0" />
      </div>

      <SkeletonCard>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3">
            <SkeletonEyebrow className="w-24" />
            <Skeleton className="h-8 w-20 border-0" />
            <SkeletonText widths={['100%', '92%', '58%']} />
          </div>
          <div className="space-y-3">
            <SkeletonEyebrow className="w-20" />
            <Skeleton className="h-8 w-24 border-0" />
            <SkeletonText widths={['88%', '72%']} />
          </div>
        </div>
      </SkeletonCard>

      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index}>
            <SkeletonEyebrow className="w-28" />
            <Skeleton className="mt-3 h-7 w-18 border-0" />
            <SkeletonText className="mt-3" widths={['92%', '64%']} />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}
