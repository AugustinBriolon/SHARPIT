import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonInsightSection,
  SkeletonText,
} from '@/components/ui/skeleton-patterns';

export default function Loading() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="inline-flex min-h-11 items-center gap-1 lg:hidden">
          <Skeleton className="size-4 shrink-0 rounded-sm" />
          <Skeleton className="h-4 w-20 rounded-full border-0" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-2xl" />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-full border-0" />
                <Skeleton className="h-3 w-20 rounded-full border-0" />
              </div>
              <Skeleton className="h-9 w-72 max-w-full rounded-full border-0" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-16 rounded-full border-0" />
                <Skeleton className="h-4 w-20 rounded-full border-0" />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border bg-card rounded-2xl border px-5 py-4">
              <Skeleton className="h-3 w-16 rounded-full border-0" />
              <Skeleton className="mt-2 h-9 w-24 border-0" />
            </div>
          ))}
        </div>
      </header>

      <Skeleton className="rounded-analysis-lg h-80 w-full sm:h-96" />

      <section className="space-y-3">
        <SkeletonEyebrow className="w-28" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="min-h-28 px-4 py-4">
              <Skeleton className="h-3 w-20 rounded-full border-0" />
              <Skeleton className="mt-3 h-7 w-16 border-0" />
            </SkeletonCard>
          ))}
        </div>
      </section>

      <SkeletonCard className="min-h-56 px-5 py-5">
        <SkeletonEyebrow className="w-20" />
        <Skeleton className="rounded-analysis mt-4 h-40 w-full border-0" />
      </SkeletonCard>

      <section className="space-y-4">
        <SkeletonEyebrow className="w-20" />
        <SkeletonCard className="min-h-64 px-5 py-5">
          <Skeleton className="rounded-analysis h-56 w-full border-0" />
        </SkeletonCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard className="min-h-48 px-5 py-5">
            <Skeleton className="rounded-analysis h-40 w-full border-0" />
          </SkeletonCard>
          <SkeletonCard className="min-h-48 px-5 py-5">
            <Skeleton className="rounded-analysis h-40 w-full border-0" />
          </SkeletonCard>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkeletonInsightSection blocks={2} className="lg:col-span-2" />
        <SkeletonCard className="min-h-32 px-5 py-5">
          <SkeletonEyebrow className="w-24" />
          <SkeletonText className="mt-4" widths={['100%', '82%']} />
        </SkeletonCard>
      </div>
    </div>
  );
}
