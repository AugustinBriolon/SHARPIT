'use client';

import { Skeleton } from '@/components/ui/skeleton';

function MetricRingSkeleton() {
  return (
    <div className="rounded-analysis flex flex-col items-center px-2 py-3">
      <Skeleton className="m-1 size-[72px] rounded-full" />
      <Skeleton className="mt-2 h-3.5 w-14" />
    </div>
  );
}

/** Shown only on first visit when no snapshot exists yet. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      <div className="rounded-3xl border px-5 py-6">
        <Skeleton className="mb-2 h-3 w-48" />
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {[0, 1, 2, 3].map((i) => (
            <MetricRingSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="bg-muted h-24 rounded-3xl" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="bg-muted h-28 rounded-3xl" />
        <div className="bg-muted h-28 rounded-3xl" />
      </div>
      <div className="bg-muted h-32 rounded-3xl" />
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
