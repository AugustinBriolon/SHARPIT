import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonPill,
  SkeletonText,
} from '@/components/ui/skeleton-patterns';

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SkeletonEyebrow className="w-20" />
        <Skeleton className="h-8 w-48 rounded-full border-0" />
        <SkeletonText widths={['100%', '60%']} />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonPill key={i} className="w-28" />
        ))}
      </div>
      <SkeletonCard className="h-96 w-full space-y-3">
        <SkeletonEyebrow className="w-24" />
        <Skeleton className="h-40 w-full border-0" />
      </SkeletonCard>
    </div>
  );
}
