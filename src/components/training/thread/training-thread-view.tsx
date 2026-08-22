'use client';

import { useMemo } from 'react';
import { GoalKind } from '@prisma/client';
import { ThreadGoalBanner } from '@/components/training/thread/thread-goal-banner';
import { ThreadLoadRuler } from '@/components/training/thread/thread-load-ruler';
import { ThreadSportFilters } from '@/components/training/thread/thread-sport-filters';
import { ThreadTimeline } from '@/components/training/thread/thread-timeline';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrainingThread } from '@/hooks/use-training-thread';
import { buildThreadCoachLine } from '@/lib/training/thread/thread-coach-line';

/**
 * Le fil — planning, calendar and history as one continuous view.
 *
 * Those three were separate routes that each held half an answer: the plan never
 * showed what was done against it, the history never showed what had been asked.
 * The athlete had to hold one in his head while reading the other. Here they are
 * the same list, and the comparison is drawn for him.
 */
export function TrainingThreadView() {
  const thread = useTrainingThread();

  const currentIndex = thread.weeks.findIndex((week) => week.isCurrent);
  const currentWeek = currentIndex >= 0 ? thread.weeks[currentIndex] : null;
  const previousWeek = currentIndex > 0 ? thread.weeks[currentIndex - 1] : null;

  const coachLine = useMemo(() => buildThreadCoachLine(currentWeek ?? null), [currentWeek]);

  const nextRaceGoal = useMemo(() => {
    const now = Date.now();
    return (
      thread.goals
        .filter((goal) => goal.kind === GoalKind.RACE && !goal.achieved && goal.targetDate)
        .filter((goal) => new Date(goal.targetDate!).getTime() >= now)
        .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())[0] ??
      null
    );
  }, [thread.goals]);

  if (thread.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StickyHeader>
        <p className="text-label">Entraînement</p>
        <h1 className="text-page-title mt-1">Le fil</h1>
      </StickyHeader>

      <ThreadGoalBanner
        coachLine={coachLine}
        currentWeek={currentWeek}
        goal={nextRaceGoal}
        previousWeek={previousWeek}
      />

      <ThreadLoadRuler bars={thread.ruler} />

      <ThreadSportFilters counts={thread.counts} value={thread.sport} onChange={thread.setSport} />

      <ThreadTimeline
        earliestLabel={thread.oldestLoaded?.label ?? null}
        earliestLoad={thread.oldestLoaded?.doneLoad ?? null}
        weeks={thread.weeks}
        onLoadEarlier={thread.loadEarlier}
      />
    </div>
  );
}
