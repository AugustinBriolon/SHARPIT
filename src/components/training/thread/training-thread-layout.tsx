'use client';

import { NotebookText, Plus } from 'lucide-react';
import Link from 'next/link';
import { ThreadGoalBanner } from '@/components/training/thread/thread-goal-banner';
import { ThreadPlanChart } from '@/components/training/thread/thread-plan-chart';
import { ThreadConstraintsCard } from '@/components/training/thread/thread-constraints-card';
import { ThreadFormReadings } from '@/components/training/thread/thread-form-readings';
import {
  ThreadGoalBannerSkeleton,
  ThreadRailSkeleton,
} from '@/components/training/thread/thread-skeleton';
import { TrainingThreadMainColumn } from '@/components/training/thread/training-thread-main-column';
import type { ThreadCoachLine } from '@/lib/training/thread/thread-coach-line';
import type { ThreadAdherence, ThreadWeek } from '@/lib/training/thread/thread-model';
import type { ClientGoal } from '@/lib/query/types';
import type { RulerBar } from '@/lib/training/thread/load-ruler';
import type { ThreadDay } from '@/lib/training/thread/thread-model';
import type { useThreadFormReadings } from '@/hooks/use-thread-form-readings';
import type { buildThreadConstraints } from '@/components/training/thread/thread-constraints-card';
import { cn } from '@/lib/utils';

export function TrainingThreadLayout({
  loading,
  adherence,
  coachLine,
  currentWeek,
  previousWeek,
  nextRaceGoal,
  anchorWeekKey,
  anchorLabel,
  digest,
  filters,
  readings,
  ruler,
  constraints,
  seasonWeeks,
  rulerSkeleton,
  timelineSkeleton,
  onAnchorWeekChange,
  onBackToToday,
}: {
  loading: boolean;
  adherence: ThreadAdherence;
  coachLine: ThreadCoachLine | null;
  currentWeek: ThreadWeek | null;
  previousWeek: ThreadWeek | null;
  nextRaceGoal: ClientGoal | null;
  anchorWeekKey: string | null;
  anchorLabel: string | null;
  digest: { upcoming: readonly ThreadDay[]; past: readonly ThreadDay[] };
  filters: React.ReactNode;
  readings: ReturnType<typeof useThreadFormReadings>;
  ruler: readonly RulerBar[];
  constraints: ReturnType<typeof buildThreadConstraints>;
  seasonWeeks: readonly ThreadWeek[];
  rulerSkeleton: React.ReactNode;
  timelineSkeleton: React.ReactNode;
  onAnchorWeekChange: (weekKey: string) => void;
  onBackToToday: () => void;
}) {
  return (
    <>
      {loading ? (
        <ThreadGoalBannerSkeleton />
      ) : (
        <ThreadGoalBanner
          adherence={adherence}
          coachLine={coachLine}
          currentWeek={currentWeek}
          goal={nextRaceGoal}
          previousWeek={previousWeek}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8">
        <TrainingThreadMainColumn
          anchorLabel={anchorLabel}
          anchorWeekKey={anchorWeekKey}
          digest={digest}
          filters={filters}
          loading={loading}
          pivotEntryId={anchorWeekKey ? null : (coachLine?.pivotEntryId ?? null)}
          readings={readings}
          ruler={ruler}
          rulerSkeleton={rulerSkeleton}
          timelineSkeleton={timelineSkeleton}
          onAnchorWeekChange={onAnchorWeekChange}
          onBackToToday={onBackToToday}
        />

        {loading ? (
          <ThreadRailSkeleton className="hidden lg:block" />
        ) : (
          <aside className="hidden space-y-4 lg:block">
            <ThreadPlanChart adherence={adherence} weeks={seasonWeeks} />
            <ThreadFormReadings readings={readings} title="Ta forme" />
            <ThreadConstraintsCard constraints={constraints} />
          </aside>
        )}
      </div>
    </>
  );
}

export function TrainingThreadHeader({
  loading,
  filters,
}: {
  loading: boolean;
  filters: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div>
        <p className="text-label">Ma semaine</p>
        <h1 className="text-page-title mt-1">Le fil</h1>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        {loading ? null : filters}
        <Link
          href="/training/weekly-review"
          className={cn(
            'border-foreground/25 text-foreground inline-flex min-h-9 shrink-0 items-center gap-1.5',
            'hover:bg-muted rounded-full border px-3.5 text-xs font-medium',
            'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
          )}
        >
          <NotebookText className="size-3.5" aria-hidden />
          Bilan
        </Link>
        <Link
          href="/training/manual"
          className={cn(
            'bg-highlight text-highlight-foreground inline-flex min-h-9 shrink-0 items-center gap-1.5',
            'rounded-full px-3.5 text-xs font-medium',
            'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
          )}
        >
          <Plus className="size-3.5" aria-hidden />
          Séance
        </Link>
      </div>
    </div>
  );
}
