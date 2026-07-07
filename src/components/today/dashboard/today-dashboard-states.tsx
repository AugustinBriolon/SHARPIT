'use client';

import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { Skeleton } from '@/components/ui/skeleton';
import { EyebrowLabel } from '@/components/ui/eyebrow-label';

function MetricRingSkeleton() {
  return (
    <div className="flex flex-col items-center rounded-2xl px-2 py-3 sm:px-3 sm:py-4">
      <Skeleton className="m-1 size-[72px] rounded-full sm:size-[80px]" />
      <Skeleton className="mt-2 h-3.5 w-16" />
    </div>
  );
}

/** Shown only on first visit when no snapshot exists yet. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[0, 1, 2].map((i) => (
          <MetricRingSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-muted h-120 rounded-2xl" />
        <div className="space-y-3">
          <div className="bg-muted h-68.5 rounded-2xl" />
          <div className="bg-muted h-48 rounded-2xl" />
        </div>
      </div>
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
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300">
      <p>{message}</p>
      {isRefreshing ? <p className="mt-1 text-xs text-slate-400">Mise à jour en cours…</p> : null}
    </div>
  );
}

export function PartialSnapshotFallback({
  snapshot,
  onRetry,
}: {
  snapshot: AthleteSnapshot;
  onRetry: () => void;
}) {
  const message =
    snapshot.primaryProductMessage ??
    snapshot.domainMessages.sleep ??
    snapshot.domainMessages.recovery ??
    'Ton bilan se construit au fil de l’arrivée de tes données.';

  return (
    <div className="space-y-4">
      <SnapshotStatusBanner message={message} />
      <div className="flex justify-center">
        <button
          className="text-xs text-slate-400 underline-offset-4 transition-colors hover:text-slate-600 hover:underline"
          type="button"
          onClick={onRetry}
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}
