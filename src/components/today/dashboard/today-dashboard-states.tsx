'use client';

import { useMemo } from 'react';
import { MorningWellnessDialog } from '@/components/today/dashboard/morning-wellness-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonText } from '@/components/ui/skeleton-patterns';
import type { DailyPhase } from '@/lib/daily-phase/types';
import { actionRowLabels, trajectoryEyebrow, whyBlockTitle } from '@/lib/today-rich-view';

function shellPhaseFromLocalHour(hour: number): DailyPhase {
  if (hour >= 22) return 'END_OF_DAY';
  if (hour >= 18) return 'RECOVERY_WINDOW';
  if (hour >= 14) return 'SESSION_COMPLETED';
  if (hour >= 10) return 'BEFORE_SESSION';
  return 'MORNING';
}

const SIGNAL_STRIP_SKELETON = [
  { label: 'Sommeil', dot: 'bg-[var(--color-signal-base)]' },
  { label: 'Récup', dot: 'bg-[var(--color-signal-recovery)]' },
  { label: 'Adapt', dot: 'bg-[var(--color-signal-vo2)]' },
  { label: 'Effort', dot: 'bg-[var(--color-signal-threshold)]' },
] as const;

/** Shell fidèle à la page Today — plaque + chips + evidence; skeleton sur les données. */
export function DashboardSkeleton() {
  const phase = useMemo(() => shellPhaseFromLocalHour(new Date().getHours()), []);
  const labels = actionRowLabels(phase);
  const whyTitle = whyBlockTitle(phase);
  const trajectoryLabel = trajectoryEyebrow(phase);

  return (
    <div className="mx-auto space-y-3 sm:space-y-4">
      {/* Morning Instrument plate */}
      <section className="analysis-panel rounded-analysis-lg from-primary/8 relative overflow-hidden bg-linear-to-br to-transparent px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label inline-flex items-center gap-2">
            <span className="bg-primary/50 h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden />
            Ce matin
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5" aria-hidden>
              <span className="bg-primary/20 h-1.5 w-1.5 rounded-full" />
              <span className="bg-primary/20 h-2 w-1.5 rounded-full" />
              <span className="bg-primary/20 h-2.5 w-1.5 rounded-full" />
            </div>
            <Skeleton className="h-3 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="mt-6 h-9 w-[min(100%,22rem)] max-w-3xl rounded-lg sm:h-10" />
        <Skeleton className="mt-5 h-4 w-[min(100%,18rem)] rounded-full" />
        <Skeleton className="mt-8 h-3 w-40 rounded-full" />
      </section>

      {/* Signal chips — no parent panel; 2×2 mobile · 1 row desktop */}
      <nav
        aria-label="Signaux physiologiques — ouvrir le détail"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {SIGNAL_STRIP_SKELETON.map((signal) => (
          <span
            key={signal.label}
            className="border-analysis-border/80 bg-background/50 inline-flex min-w-0 items-center justify-between gap-1.5 rounded-lg border px-2.5 py-2 sm:justify-start sm:py-1.5"
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${signal.dot}`} aria-hidden />
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide">
                {signal.label}
              </span>
              <Skeleton className="h-4 w-7 rounded-sm" />
            </span>
            <span className="text-muted-foreground/70 text-data text-[10px]" aria-hidden>
              →
            </span>
          </span>
        ))}
      </nav>

      <section className="px-0.5">
        <p className="text-label mb-2">{whyTitle}</p>
        <SkeletonText widths={['92%', '64%']} />
        <p className="text-muted-foreground mt-2 text-xs font-medium tracking-wide opacity-60">
          Voir le détail
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <p className="text-label">{labels.action}</p>
          <MorningWellnessDialog />
        </div>
        <ul className="space-y-2">
          {[0, 1].map((i) => (
            <li
              key={i}
              className="border-analysis-border/80 bg-background/50 rounded-lg border px-3 py-2.5"
            >
              <Skeleton className="h-4 w-full max-w-[240px] rounded-full" />
            </li>
          ))}
        </ul>
      </section>

      <section className="px-0.5">
        <p className="text-label">{trajectoryLabel}</p>
        <Skeleton className="mt-1 h-4 w-48 max-w-full rounded-full" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-label mb-1">Récup. 14j →</p>
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
          <div>
            <p className="text-label mb-1">Charge 14j →</p>
            <Skeleton className="h-14 w-full rounded-lg" />
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
    <div className="analysis-panel rounded-analysis-lg px-4 py-3">
      <p className="text-label mb-1">État</p>
      <p className="text-foreground text-sm leading-relaxed">{message}</p>
      {isRefreshing ? (
        <p className="text-muted-foreground mt-1 text-xs">Mise à jour en cours…</p>
      ) : null}
    </div>
  );
}
