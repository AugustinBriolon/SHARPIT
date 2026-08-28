'use client';

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
