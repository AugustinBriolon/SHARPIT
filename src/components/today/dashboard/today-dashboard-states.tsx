'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

/** Shown only on first visit when no snapshot exists yet. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      <SkeletonCard className="rounded-3xl px-5 py-6">
        <SkeletonEyebrow className="mb-2 w-32" />
        <SkeletonTitle className="mb-2 w-52 max-w-full" size="lg" />
        <SkeletonText widths={['100%', '90%', '56%']} />
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3.5 w-28 rounded-full border-0" />
            <Skeleton className="h-3 w-24 rounded-full border-0" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full border-0" />
        </div>
      </SkeletonCard>
      <SkeletonCard className="rounded-3xl p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-11 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <SkeletonEyebrow className="w-24" />
            <SkeletonText widths={['86%', '64%']} />
          </div>
        </div>
      </SkeletonCard>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SkeletonCard className="rounded-3xl">
          <SkeletonEyebrow className="w-28" />
          <SkeletonText className="mt-3" widths={['100%', '92%', '64%']} />
        </SkeletonCard>
        <SkeletonCard className="rounded-3xl">
          <SkeletonEyebrow className="w-24" />
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-analysis border-analysis-border/60 border px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24 rounded-full border-0" />
                    <Skeleton className="h-4 w-40 max-w-full rounded-full border-0" />
                  </div>
                  <Skeleton className="h-3 w-10 rounded-full border-0" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonCard>
      </div>
      <SkeletonCard className="rounded-3xl">
        <SkeletonEyebrow className="w-28" />
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="rounded-analysis border-analysis-border/60 border px-3 py-3">
            <Skeleton className="mb-2 h-3 w-20 rounded-full border-0" />
            <Skeleton className="rounded-analysis h-14 w-full border-0" />
          </div>
          <div className="rounded-analysis border-analysis-border/60 border px-3 py-3">
            <Skeleton className="mb-2 h-3 w-20 rounded-full border-0" />
            <Skeleton className="rounded-analysis h-14 w-full border-0" />
          </div>
        </div>
      </SkeletonCard>
    </div>
  );
}

export function SnapshotStatusBanner({
  message,
  isRefreshing,
}: {
  message: string;
  isRefreshing?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
      <p>{message}</p>
      {isRefreshing ? <p className="mt-1 text-xs text-slate-400">Mise à jour en cours…</p> : null}
    </div>
  );
}
