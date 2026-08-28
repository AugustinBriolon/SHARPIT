'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { ClientPlanWeek } from '@/lib/query/types';
import { useDisplayMode } from '@/providers/display-mode-provider';
import { buildWeekSummarySegments } from '@/components/planning/planning-week-summary-helpers';

function WeekSummaryLoading() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Skeleton className="h-4 w-10 rounded-full border-0" />
      <Skeleton className="h-4 w-24 rounded-full border-0" />
      <Skeleton className="h-4 w-28 rounded-full border-0" />
    </div>
  );
}

export function PlanningWeekSummary({
  planWeek,
  plannedLoad,
  total,
  weeksToRace,
  loading = false,
}: {
  planWeek?: ClientPlanWeek;
  plannedLoad: number;
  completed: number;
  total: number;
  weeksToRace: number | null;
  loading?: boolean;
}) {
  const { mode } = useDisplayMode();

  if (loading) {
    return <WeekSummaryLoading />;
  }

  const segments = buildWeekSummarySegments({
    mode,
    planWeek,
    plannedLoad,
    total,
    weeksToRace,
  });

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      {segments.map((segment, index) => (
        <span key={index}>
          {index > 0 ? <span className="opacity-30">· </span> : null}
          {segment}
        </span>
      ))}
    </div>
  );
}
