'use client';

import { formatDuration } from '@/lib/format';
import { durationDelta, formatDelta, loadDelta } from '@/lib/training/thread/thread-delta';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import {
  formatTrainingLoad,
  trainingLoadUnit,
  type DisplayMode,
} from '@/lib/preferences/display-mode';
import { cn } from '@/lib/utils';
import { useDisplayMode } from '@/providers/display-mode-provider';

export function entryActivityMeta(activity: ThreadEntry['activity'], mode: DisplayMode): string[] {
  if (!activity) {
    return [];
  }
  return [
    activity.duration ? formatDuration(activity.duration) : null,
    activity.load !== null ? formatTrainingLoad(activity.load, mode) : null,
    activity.rpe !== null ? `RPE ${activity.rpe}` : null,
  ].filter((part): part is string => Boolean(part));
}

export function entryPlannedMeta(planned: ThreadEntry['planned'], mode: DisplayMode): string[] {
  if (!planned) {
    return [];
  }
  return [
    planned.durationMin ? `${planned.durationMin} min` : null,
    planned.load !== null ? formatTrainingLoad(planned.load, mode) : null,
  ].filter((part): part is string => Boolean(part));
}

export function entryMeta(entry: ThreadEntry, mode: DisplayMode = 'essential'): string[] {
  if (entry.activity) {
    return entryActivityMeta(entry.activity, mode);
  }
  return entryPlannedMeta(entry.planned, mode);
}

function resolveComparisonShown(entry: ThreadEntry) {
  if (entry.kind !== 'paired' || !entry.planned) {
    return null;
  }
  return (
    durationDelta(entry.activity?.duration, entry.planned.durationMin) ??
    loadDelta(entry.activity?.load, entry.planned.load)
  );
}

export function ComparisonPill({ entry }: { entry: ThreadEntry }) {
  const { mode } = useDisplayMode();
  const shown = resolveComparisonShown(entry);
  if (!shown || !entry.planned) {
    return null;
  }

  const duration = durationDelta(entry.activity?.duration, entry.planned.durationMin);
  const unit = duration ? 'min' : trainingLoadUnit(mode);
  const prescribed = duration
    ? `prévu ${entry.planned.durationMin} min`
    : `prévu ${formatTrainingLoad(entry.planned.load ?? 0, mode)}`;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      <span className="border-analysis-border/60 text-muted-foreground text-data rounded-full border px-2 py-0.5 text-[11px] tabular-nums">
        {prescribed}
      </span>
      <span
        className={cn(
          'text-data text-[11px] font-medium tabular-nums',
          shown.verdict === 'over' ? 'text-signal-caution' : 'text-primary',
        )}
      >
        {formatDelta(shown, unit)}
      </span>
    </span>
  );
}

export function SportDot({ entry, className }: { entry: ThreadEntry; className?: string }) {
  return (
    <span
      className={cn(
        'size-[7px] shrink-0 rounded-full',
        entry.kind === 'planned' ? 'border-[1.5px] border-current' : 'bg-current',
        SPORT_IDENTITY_TEXT[entry.type],
        className,
      )}
      aria-hidden
    />
  );
}
