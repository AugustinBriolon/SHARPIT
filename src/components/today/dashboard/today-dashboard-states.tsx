'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  SkeletonAnalysisPanelAlt,
  SkeletonCard,
  SkeletonEyebrow,
  SkeletonMetricRail,
  SkeletonPhysioRail,
  SkeletonPill,
  SkeletonText,
  SkeletonTitle,
} from '@/components/ui/skeleton-patterns';

/** Shown only on first visit when no snapshot exists yet. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      <SkeletonAnalysisPanelAlt>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_18rem] xl:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <SkeletonEyebrow className="w-28" />
                <SkeletonTitle size="hero" />
              </div>
              <SkeletonPill className="h-6 w-28 rounded-full" />
            </div>
            <SkeletonText lineClassName="h-4" widths={['92%', '78%']} />
            <div className="max-w-xl space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3 w-24 rounded-full border-0" />
                <Skeleton className="h-2.5 w-44 rounded-full border-0" />
              </div>
              <SkeletonPhysioRail />
            </div>
          </div>
          <div className="analysis-panel rounded-analysis px-4 py-4">
            <SkeletonEyebrow className="w-24" />
            <Skeleton className="mt-2 h-9 w-14 border-0" />
            <SkeletonText className="mt-2" widths={['100%', '88%']} />
          </div>
        </div>
        <div className="pt-4">
          <SkeletonMetricRail items={4} />
          <div className="analysis-panel rounded-analysis mt-3 flex flex-wrap items-start justify-between gap-3 px-3 py-2.5">
            <Skeleton className="h-3.5 w-40 max-w-[55%] rounded-full border-0" />
            <Skeleton className="h-3.5 w-36 max-w-[40%] rounded-full border-0" />
          </div>
        </div>
      </SkeletonAnalysisPanelAlt>

      <SkeletonCard className="px-5 py-4 sm:px-6">
        <SkeletonEyebrow className="mb-3 w-24" />
        <ul className="space-y-2.5">
          {[0, 1].map((i) => (
            <li key={i} className="border-analysis-border border-l-2 pl-3">
              <SkeletonText widths={i === 0 ? ['96%', '72%'] : ['88%', '64%']} />
            </li>
          ))}
        </ul>
      </SkeletonCard>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SkeletonCard className="px-5 py-4 sm:px-6">
          <SkeletonEyebrow className="mb-2 w-32" />
          <SkeletonText widths={['100%', '94%', '70%']} />
        </SkeletonCard>
        <SkeletonCard className="px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <SkeletonEyebrow className="w-28" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="border-border/60 rounded-xl border px-3 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-center gap-2">
                    <Skeleton className="size-4 shrink-0 rounded-sm" />
                    <Skeleton className="h-4 w-36 max-w-full rounded-full border-0" />
                  </div>
                  <Skeleton className="h-3.5 w-10 shrink-0 rounded-full border-0" />
                </div>
              </li>
            ))}
          </ul>
        </SkeletonCard>
      </div>

      <SkeletonCard className="px-5 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-2">
            <SkeletonEyebrow className="w-28" />
            <Skeleton className="h-4 w-48 max-w-full rounded-full border-0" />
            <Skeleton className="h-3 w-32 rounded-full border-0" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16 rounded-full border-0" />
            <Skeleton className="h-3 w-16 rounded-full border-0" />
          </div>
        </div>
        <SkeletonPhysioRail className="mb-3" showCaption />
        <div className="grid grid-cols-2 gap-4">
          <div className="analysis-panel rounded-analysis px-3 py-3">
            <Skeleton className="mb-2 h-3 w-16 rounded-full border-0" />
            <Skeleton className="h-14 w-full rounded-lg border-0" />
          </div>
          <div className="analysis-panel rounded-analysis px-3 py-3">
            <Skeleton className="mb-2 h-3 w-16 rounded-full border-0" />
            <Skeleton className="h-14 w-full rounded-lg border-0" />
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
