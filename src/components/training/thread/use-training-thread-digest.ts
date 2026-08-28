'use client';

import { useMemo } from 'react';
import { GoalKind } from '@prisma/client';
import type { ClientGoal } from '@/lib/query/types';
import { dayKeyFromDate } from '@/lib/date/day-key';
import { partitionThread, takeThreadDays } from '@/lib/training/thread/partition-thread';
import type { ThreadWeek } from '@/lib/training/thread/thread-model';

/** Sunday of the week starting on `start` — the last day it contains. */
function endOfWeekDay(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

export function useTrainingThreadDigest({
  seasonWeeks,
  anchorWeekKey,
}: {
  seasonWeeks: readonly ThreadWeek[];
  anchorWeekKey: string | null;
}) {
  const anchorLabel = anchorWeekKey
    ? (seasonWeeks.find((week) => week.weekKey === anchorWeekKey)?.label ?? null)
    : null;

  const digest = useMemo(() => {
    const anchored = anchorWeekKey
      ? seasonWeeks.find((week) => week.weekKey === anchorWeekKey)
      : null;

    const pivot = anchored ? endOfWeekDay(anchored.start) : new Date();
    const pivotDayKey = dayKeyFromDate(
      new Date(Date.UTC(pivot.getFullYear(), pivot.getMonth(), pivot.getDate())),
    );

    const { upcoming, past } = partitionThread(seasonWeeks, pivotDayKey);
    return {
      upcoming: takeThreadDays(upcoming, 3),
      past: takeThreadDays(past, 5),
    };
  }, [seasonWeeks, anchorWeekKey]);

  return { anchorLabel, digest };
}

export function selectNextRaceGoal(goals: ClientGoal[]): ClientGoal | null {
  const now = Date.now();
  return (
    goals
      .filter((goal) => goal.kind === GoalKind.RACE && !goal.achieved && goal.targetDate)
      .filter((goal) => new Date(goal.targetDate!).getTime() >= now)
      .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())[0] ??
    null
  );
}
