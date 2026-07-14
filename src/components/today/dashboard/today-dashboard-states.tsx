'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonPhysioRail, SkeletonText } from '@/components/ui/skeleton-patterns';
import type { DailyPhase } from '@/lib/daily-phase/types';
import { actionRowLabels, trajectoryEyebrow, whyBlockTitle } from '@/lib/today-rich-view';
import { TRAJECTORY_DRILL_DOWNS, TWIN_DIMENSION_LABEL } from '@/lib/today-twin-navigation';

function shellPhaseFromLocalHour(hour: number): DailyPhase {
  if (hour >= 22) return 'END_OF_DAY';
  if (hour >= 18) return 'RECOVERY_WINDOW';
  if (hour >= 14) return 'SESSION_COMPLETED';
  if (hour >= 10) return 'BEFORE_SESSION';
  return 'MORNING';
}

function RadialScoreCardLoading({ label }: { label: string }) {
  return (
    <div className="analysis-panel rounded-analysis flex min-h-11 flex-col gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label">{label}</p>
          <Skeleton className="mt-1 h-4 w-28 max-w-full rounded-full border-0" />
        </div>
        <Skeleton className="h-8 w-12 shrink-0 rounded-lg border-0" />
      </div>
      <SkeletonPhysioRail />
    </div>
  );
}

/** Shell fidèle à la page Today — labels statiques visibles, skeleton uniquement sur les données. */
export function DashboardSkeleton() {
  const phase = useMemo(() => shellPhaseFromLocalHour(new Date().getHours()), []);
  const labels = actionRowLabels(phase);
  const whyTitle = whyBlockTitle(phase);
  const trajectoryLabel = trajectoryEyebrow(phase);

  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      <section className="analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_18rem] xl:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32 rounded-full border-0" />
                <Skeleton className="h-7 w-56 max-w-full border-0 sm:h-[1.55rem]" />
              </div>
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-[88%] max-w-2xl rounded-full border-0" />
            <div className="max-w-xl space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label">position du jour</p>
                <p className="text-muted-foreground text-[10px]">
                  récupération vers intensité haute
                </p>
              </div>
              <SkeletonPhysioRail />
            </div>
          </div>

          <div className="analysis-panel rounded-analysis px-4 py-4">
            <p className="text-label">lecture rapide</p>
            <div className="mt-2 flex items-baseline gap-1">
              <Skeleton className="h-9 w-14 border-0" />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Signal de récupération utilisé comme repère central pour lire la disponibilité du
              jour.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <RadialScoreCardLoading label="Sommeil" />
            <RadialScoreCardLoading label="Récupération" />
            <RadialScoreCardLoading label="Effort" />
            <RadialScoreCardLoading label="Adaptation" />
          </div>
          <div className="analysis-panel rounded-analysis mt-3 flex flex-wrap items-start justify-between gap-3 px-3 py-2.5">
            <Skeleton className="h-3.5 w-40 max-w-[55%] rounded-full border-0" />
            <Skeleton className="h-3.5 w-36 max-w-[40%] rounded-full border-0" />
          </div>
        </div>
      </section>

      <section className="analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6">
        <p className="text-label mb-3">{whyTitle}</p>
        <ul className="space-y-2.5">
          {[0, 1].map((i) => (
            <li key={i} className="border-analysis-border border-l-2 pl-3">
              <SkeletonText widths={i === 0 ? ['96%', '72%'] : ['88%', '64%']} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6">
          <p className="text-label mb-2">{labels.limiting}</p>
          <SkeletonText widths={['100%', '94%', '70%']} />
        </section>

        <section className="analysis-panel rounded-analysis-lg flex flex-col px-5 py-4 sm:px-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-label">{labels.action}</p>
            <MorningWellnessDialog />
          </div>
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="border-border/60 rounded-xl border px-3 py-2.5">
                <Skeleton className="h-4 w-full max-w-[240px] rounded-full border-0" />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-label">{trajectoryLabel}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Skeleton className="h-4 w-4 shrink-0 rounded-full border-0" />
              <Skeleton className="h-4 w-48 max-w-full rounded-full border-0" />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
            {TRAJECTORY_DRILL_DOWNS.map(({ dimension, href }) => (
              <Link
                key={href}
                className="text-muted-foreground underline-offset-2 hover:underline"
                href={href}
              >
                {TWIN_DIMENSION_LABEL[dimension]}
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <SkeletonPhysioRail />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="analysis-panel rounded-analysis px-3 py-3">
            <p className="text-label mb-1">Récup. 14j</p>
            <Skeleton className="h-14 w-full rounded-lg border-0" />
          </div>
          <div className="analysis-panel rounded-analysis px-3 py-3">
            <p className="text-label mb-1">Charge 14j</p>
            <Skeleton className="h-14 w-full rounded-lg border-0" />
          </div>
        </div>
      </section>
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
