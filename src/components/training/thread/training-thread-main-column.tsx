'use client';

import Link from 'next/link';
import { NotebookText } from 'lucide-react';
import { ThreadTimeline } from '@/components/training/thread/thread-timeline';
import { ThreadFormReadings } from '@/components/training/thread/thread-form-readings';
import { ThreadLoadRuler } from '@/components/training/thread/thread-load-ruler';
import type { RulerBar } from '@/lib/training/thread/load-ruler';
import type { ThreadDay } from '@/lib/training/thread/thread-model';
import type { useThreadFormReadings } from '@/hooks/use-thread-form-readings';
import { cn } from '@/lib/utils';

export function TrainingThreadMainColumn({
  loading,
  anchorWeekKey,
  anchorLabel,
  ruler,
  digest,
  pivotEntryId,
  filters,
  readings,
  rulerSkeleton,
  timelineSkeleton,
  onAnchorWeekChange,
  onBackToToday,
}: {
  loading: boolean;
  anchorWeekKey: string | null;
  anchorLabel: string | null;
  ruler: readonly RulerBar[];
  digest: { upcoming: readonly ThreadDay[]; past: readonly ThreadDay[] };
  pivotEntryId: string | null;
  filters: React.ReactNode;
  readings: ReturnType<typeof useThreadFormReadings>;
  rulerSkeleton?: React.ReactNode;
  timelineSkeleton?: React.ReactNode;
  onAnchorWeekChange: (weekKey: string) => void;
  onBackToToday: () => void;
}) {
  return (
    <div className="min-w-0 space-y-4">
      {loading ? (
        rulerSkeleton
      ) : (
        <ThreadLoadRuler
          anchorWeekKey={anchorWeekKey}
          bars={ruler}
          onAnchorChange={onAnchorWeekChange}
        />
      )}

      {anchorWeekKey ? (
        <button
          type="button"
          className={cn(
            'text-primary hover:text-foreground text-data inline-flex items-center gap-1.5',
            'text-xs transition-colors',
            'focus-visible:ring-primary/35 rounded-sm focus-visible:ring-2 focus-visible:outline-hidden',
          )}
          onClick={onBackToToday}
        >
          ← Revenir à aujourd’hui
        </button>
      ) : null}

      <div className="lg:hidden">{loading ? null : filters}</div>

      {/* Desktop reaches this from the header ("Bilan") — a PWA has no address
          bar to type into, so mobile needs its own visible entry point too. */}
      <Link
        href="/training/weekly-review"
        className={cn(
          'text-primary hover:text-foreground text-data inline-flex items-center gap-1.5',
          'text-xs transition-colors lg:hidden',
          'focus-visible:ring-primary/35 rounded-sm focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <NotebookText className="size-3.5" aria-hidden />
        Bilan de la semaine
      </Link>

      {loading ? (
        timelineSkeleton
      ) : (
        <ThreadTimeline
          anchorLabel={anchorLabel}
          past={digest.past}
          pivotEntryId={pivotEntryId}
          upcoming={digest.upcoming}
        />
      )}

      <ThreadFormReadings className="lg:hidden" readings={readings} />
    </div>
  );
}
