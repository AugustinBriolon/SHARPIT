'use client';

import Link from 'next/link';
import { SignalSpectrum } from '@/components/today/dashboard/signal-spectrum';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { mapStripScoreToColorClass, mapStripStrainToColorClass } from '@/lib/today/today-mapping';
import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import type { SignalPreview } from '@/lib/today/signal-previews';
import { cn } from '@/lib/utils';

const META = [
  {
    key: 'adaptation' as const,
    label: 'Adaptation',
    href: TWIN_DRILL_DOWN.adaptation,
    dot: 'bg-[var(--color-signal-vo2)]',
  },
  {
    key: 'effort' as const,
    label: 'Charge',
    href: TWIN_DRILL_DOWN.effort,
    dot: 'bg-[var(--color-signal-threshold)]',
  },
];

type TrajectorySignal = (typeof META)[number];

function ChipSkeleton() {
  return (
    <div className="chip-surface-lg flex min-h-22 flex-col justify-between gap-2 rounded-2xl px-3 py-3">
      <SkeletonDataValue heightClassName="h-3" widthClassName="w-16" />
      <SkeletonDataValue className="w-full" heightClassName="h-5" widthClassName="w-full" />
      <SkeletonDataValue heightClassName="h-6" widthClassName="w-10" />
    </div>
  );
}

function parsePreviewScore(
  preview: SignalPreview | null,
  signalKey: TrajectorySignal['key'],
): number | null {
  if (!preview?.scoreDisplay || preview.scoreDisplay === '—') {
    return null;
  }
  const raw =
    signalKey === 'effort'
      ? Number(preview.scoreDisplay.replace(',', '.'))
      : Number(preview.scoreDisplay);
  return Number.isFinite(raw) ? raw : null;
}

function trajectoryScoreClass(
  signalKey: TrajectorySignal['key'],
  preview: SignalPreview | null,
): string {
  const score = parsePreviewScore(preview, signalKey);
  return signalKey === 'effort'
    ? mapStripStrainToColorClass(score)
    : mapStripScoreToColorClass(score);
}

function TrajectoryVisual({ preview }: { preview: SignalPreview | null }) {
  if (preview?.visual.kind === 'spectrum') {
    return <SignalSpectrum className="mt-0.5" position={preview.visual.position} />;
  }
  return <div className="h-2" aria-hidden />;
}

function TrajectoryChipHeader({ signal }: { signal: TrajectorySignal }) {
  return (
    <span className="flex min-w-0 items-center justify-between gap-1">
      <span className="inline-flex min-w-0 items-center gap-1.5 overflow-hidden">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', signal.dot)} aria-hidden />
        <span className="text-muted-foreground min-w-0 truncate text-xs font-medium tracking-wide">
          {signal.label}
        </span>
      </span>
      <span
        className="text-muted-foreground/70 text-data shrink-0 text-xs tracking-wider transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5"
        aria-hidden
      >
        →
      </span>
    </span>
  );
}

function TrajectoryChipScore({
  display,
  subtitle,
  scoreClass,
}: {
  display: string;
  subtitle: string | null;
  scoreClass: string;
}) {
  return (
    <span className="mt-auto flex min-w-0 flex-col gap-0.5">
      <span
        className={cn(
          'text-data text-[1.25rem] leading-none font-semibold tabular-nums',
          scoreClass,
        )}
      >
        {display}
      </span>
      {subtitle ? (
        <span className="text-muted-foreground truncate text-[11px] leading-tight">{subtitle}</span>
      ) : null}
    </span>
  );
}

function TrajectoryChip({
  signal,
  preview,
}: {
  signal: TrajectorySignal;
  preview: SignalPreview | null;
}) {
  const display = preview?.scoreDisplay ?? '—';
  const subtitle = preview?.subtitle ?? null;
  const scoreClass = trajectoryScoreClass(signal.key, preview);

  return (
    <Link
      href={signal.href}
      title={`Voir le détail — ${signal.label}`}
      className={cn(
        'chip-surface-lg hover:border-primary/35 group',
        'focus-visible:ring-primary/35 flex min-h-22 w-full min-w-0 flex-col gap-1.5 overflow-hidden',
        'rounded-2xl px-3 py-3 transition-[border-color,background-color,transform] duration-150 ease-out',
        'focus-visible:ring-2 focus-visible:outline-hidden',
      )}
    >
      <TrajectoryChipHeader signal={signal} />
      <TrajectoryVisual preview={preview} />
      <TrajectoryChipScore display={display} scoreClass={scoreClass} subtitle={subtitle} />
    </Link>
  );
}

/**
 * Block-scale signals on Plan — adaptation + charge, not overnight recovery.
 */
export function PlanTrajectoryStrip({
  previews,
  loading = false,
  className,
  compact = false,
}: {
  previews: SignalPreview[];
  loading?: boolean;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      {compact ? null : (
        <div className="space-y-1 px-0.5">
          <h2 className="text-section-title">Comment tu te portes</h2>
          <p className="text-muted-foreground text-xs leading-snug">
            Adaptation du bloc et charge du jour. Le cadre de la semaine.
          </p>
        </div>
      )}
      <nav
        aria-busy={loading || undefined}
        aria-label="Signaux de trajectoire — ouvrir le détail"
        className="grid grid-cols-2 gap-2"
      >
        {loading
          ? META.map((signal) => <ChipSkeleton key={signal.key} />)
          : META.map((signal) => {
              const preview = previews.find((entry) => entry.key === signal.key) ?? null;
              return <TrajectoryChip key={signal.key} preview={preview} signal={signal} />;
            })}
      </nav>
    </section>
  );
}
