'use client';

import { useMemo } from 'react';
import { GoalKind } from '@prisma/client';
import { differenceInCalendarDays } from 'date-fns';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import {
  ThreadConstraintsCard,
  buildThreadConstraints,
} from '@/components/training/thread/thread-constraints-card';
import { ThreadFormReadings } from '@/components/training/thread/thread-form-readings';
import { ThreadGoalBanner } from '@/components/training/thread/thread-goal-banner';
import { ThreadLoadRuler } from '@/components/training/thread/thread-load-ruler';
import { ThreadPlanChart } from '@/components/training/thread/thread-plan-chart';
import { ThreadSportFilters } from '@/components/training/thread/thread-sport-filters';
import { ThreadTimeline } from '@/components/training/thread/thread-timeline';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoachMemory } from '@/hooks/use-coach-memory';
import { useTrainingThread } from '@/hooks/use-training-thread';
import { useThreadFormReadings } from '@/hooks/use-thread-form-readings';
import { isoWeekKeyOf } from '@/lib/training/thread/build-thread';
import { partitionThread } from '@/lib/training/thread/partition-thread';
import { dayKeyFromDate } from '@/lib/date/day-key';
import { buildThreadAdherence } from '@/lib/training/thread/thread-adherence';
import { buildThreadCoachLine } from '@/lib/training/thread/thread-coach-line';
import { cn } from '@/lib/utils';

/**
 * Le fil — planning, calendar and history as one continuous view.
 *
 * Those three were separate routes that each held half an answer: the plan never
 * showed what was done against it, the history never showed what had been asked.
 * The athlete had to hold one in his head while reading the other. Here they are
 * the same list, and the comparison is drawn for him.
 *
 * Desktop is not the phone stretched. The thread keeps a readable measure in the
 * left column and the readings that were a grid of cards become a 300 px rail —
 * present, glanceable, and never competing with the list for the eye.
 */
export function TrainingThreadView() {
  const thread = useTrainingThread();
  const memory = useCoachMemory();
  const readings = useThreadFormReadings();

  const currentIndex = thread.weeks.findIndex((week) => week.isCurrent);
  const currentWeek = currentIndex >= 0 ? thread.weeks[currentIndex] : null;
  const previousWeek = currentIndex > 0 ? thread.weeks[currentIndex - 1] : null;

  const coachLine = useMemo(() => buildThreadCoachLine(currentWeek ?? null), [currentWeek]);

  const partition = useMemo(() => {
    const now = new Date();
    const pivotDayKey = dayKeyFromDate(
      new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
    );
    return partitionThread(thread.weeks, pivotDayKey);
  }, [thread.weeks]);
  /* Graded over the season, not over what happens to be loaded: "5/7" flipping to
     "23/29" because the athlete pressed "charger plus" would make the figure a
     property of the scroll position rather than of the plan. */
  const adherence = useMemo(() => buildThreadAdherence(thread.seasonWeeks), [thread.seasonWeeks]);

  const constraints = useMemo(
    () => buildThreadConstraints(memory.data?.entries ?? [], isoWeekKeyOf),
    [memory.data],
  );

  /* Keyed by week so the separator can carry it: a constraint read next to the
     week it lands on is a plan; read in a list of its own it is trivia. */
  const constraintByWeek = useMemo(() => {
    const map = new Map<string, string>();
    for (const constraint of constraints) {
      const entry = memory.data?.entries.find((e) => e.id === constraint.id);
      const days = entry
        ? differenceInCalendarDays(new Date(entry.endDate), new Date(entry.startDate)) + 1
        : null;
      map.set(constraint.weekKey, days ? `${constraint.label} · ${days} j` : constraint.label);
    }
    return map;
  }, [constraints, memory.data]);

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

  const filters = (
    <ThreadSportFilters counts={thread.counts} value={thread.sport} onChange={thread.setSport} />
  );

  return (
    <div className="space-y-5">
      <StickyHeader>
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <p className="text-label">Entraînement</p>
            <h1 className="text-page-title mt-1">Le fil</h1>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {filters}
            <Link
              href="/training/manual"
              className={cn(
                'bg-highlight text-highlight-foreground inline-flex min-h-9 shrink-0 items-center gap-1.5',
                'rounded-full px-3.5 text-xs font-medium transition-transform hover:scale-[1.02]',
                'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
              )}
            >
              <Plus className="size-3.5" aria-hidden />
              Séance
            </Link>
          </div>
        </div>
      </StickyHeader>

      <ThreadGoalBanner
        adherence={adherence}
        coachLine={coachLine}
        currentWeek={currentWeek}
        goal={nextRaceGoal}
        previousWeek={previousWeek}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-4">
          <ThreadLoadRuler bars={thread.ruler} />

          <div className="lg:hidden">{filters}</div>

          <ThreadTimeline
            constraintByWeek={constraintByWeek}
            daysLoaded={thread.daysBack}
            past={partition.past}
            pivotEntryId={coachLine?.pivotEntryId ?? null}
            upcoming={partition.upcoming}
            onLoadEarlier={thread.loadEarlier}
          />

          {/* Mobile keeps the readings at the foot of the thread; desktop lifts
              them into the rail, where they are visible without a scroll. */}
          <ThreadFormReadings className="lg:hidden" readings={readings} />
        </div>

        <aside className="hidden space-y-4 lg:block">
          <ThreadPlanChart adherence={adherence} weeks={thread.seasonWeeks} />
          <ThreadFormReadings readings={readings} title="Ta forme" />
          <ThreadConstraintsCard constraints={constraints} />
        </aside>
      </div>
    </div>
  );
}
