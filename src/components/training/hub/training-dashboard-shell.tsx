'use client';

import Link from 'next/link';

import { ProgressionDoors } from '@/components/training/hub/progression-doors';
import { TrainingWeekStrip } from '@/components/training/hub/training-week-strip';
import { InstrumentListChipSkeleton } from '@/components/ui/instruments/instrument-list-chip';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { cn } from '@/lib/utils';

/** Match live dashboard: 2 chips mobile, 4 desktop — CSS so SSR/prerender stay stable. */
const PREVIEW_CHIP_COUNT = 4;

export function TrainingSectionLink({
  title,
  href,
  cta,
}: {
  title: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
      <p className="text-label">{title}</p>
      <Link
        href={href}
        className={cn(
          'text-muted-foreground hover:text-primary inline-flex min-h-11 items-center gap-1 lg:min-h-9',
          'text-data text-xs tracking-wide transition-colors',
          'focus-visible:ring-primary/35 rounded-sm focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        {cta}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function PreviewChipSkeleton({ count }: { count: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={cn('min-w-0', i >= 2 && 'hidden lg:block')}>
          <InstrumentListChipSkeleton titleWidth="w-[min(100%,12rem)]" />
        </li>
      ))}
    </ul>
  );
}

function ActivityChipSkeleton({ count }: { count: number }) {
  return (
    <ul className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={cn('min-w-0', i >= 2 && 'hidden lg:block')}>
          <InstrumentListChipSkeleton titleWidth="w-[min(100%,14rem)]" />
        </li>
      ))}
    </ul>
  );
}

function TrainingInstrumentPlateLoading() {
  return (
    <section className={cn('surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-surface-foreground/65 text-data inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <span
            className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
            aria-hidden
          />
          Entraînement
        </p>
      </div>
      <div className="mt-6">
        <SkeletonDataValue
          className="bg-ink-surface-foreground/20"
          heightClassName="h-9 sm:h-10"
          widthClassName="w-[min(100%,22rem)]"
        />
      </div>
      <div className="mt-5 max-w-2xl">
        <SkeletonDataValue
          className="bg-ink-surface-foreground/20"
          heightClassName="h-4"
          widthClassName="w-[min(100%,16rem)]"
        />
      </div>
      <Link
        className="text-data text-ink-surface-foreground/70 hover:text-ink-surface-foreground mt-8 inline-flex items-center gap-1.5 text-xs tracking-wide transition-colors"
        href="/training/planning"
      >
        Ouvrir le planning
        <span className="text-data text-xs tracking-wider opacity-70" aria-hidden>
          →
        </span>
      </Link>
    </section>
  );
}

/** Stable Training hub chrome for Suspense fallback and cold-start loading. */
export function TrainingDashboardShell() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <TrainingInstrumentPlateLoading />

      <TrainingWeekStrip activities={[]} plannedSessions={[]} loading />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
        <section className="min-w-0">
          <TrainingSectionLink cta="Planning" href="/training/planning" title="Séances à venir" />
          <PreviewChipSkeleton count={PREVIEW_CHIP_COUNT} />
        </section>

        <section className="min-w-0">
          <TrainingSectionLink
            cta="Historique"
            href="/training/history"
            title="Activités récentes"
          />
          <ActivityChipSkeleton count={PREVIEW_CHIP_COUNT} />
        </section>
      </div>

      <ProgressionDoors />
    </div>
  );
}
