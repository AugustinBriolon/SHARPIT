'use client';

import { useMemo, useState } from 'react';
import { GoalKind } from '@prisma/client';
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
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { useCoachMemory } from '@/hooks/use-coach-memory';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePlannedSessionActions } from '@/hooks/use-planned-session-actions';
import { useTrainingThread } from '@/hooks/use-training-thread';
import { useThreadFormReadings } from '@/hooks/use-thread-form-readings';
import { isoWeekKeyOf } from '@/lib/training/thread/build-thread';
import { partitionThread, takeThreadDays } from '@/lib/training/thread/partition-thread';
import { dayKeyFromDate } from '@/lib/date/day-key';

/** Sunday of the week starting on `start` — the last day it contains. */
function endOfWeekDay(start: Date): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}
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
  const { moveTo } = usePlannedSessionActions();
  const readings = useThreadFormReadings();

  /* Offline with every cache cold: show the last snapshot rather than skeletons
     that will never resolve. A spinner with no network behind it is a lie about
     what is about to happen. */
  const online = useOnlineStatus();
  const { hasNoLiveData } = thread;
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveData);

  const currentIndex = thread.weeks.findIndex((week) => week.isCurrent);
  const currentWeek = currentIndex >= 0 ? thread.weeks[currentIndex] : null;
  const previousWeek = currentIndex > 0 ? thread.weeks[currentIndex - 1] : null;

  const coachLine = useMemo(() => buildThreadCoachLine(currentWeek ?? null), [currentWeek]);

  /* Which week the digest reads from. Null means today, which is the only state
     where "aujourd'hui" is a waterline rather than a date somewhere above. */
  const [anchorWeekKey, setAnchorWeekKey] = useState<string | null>(null);

  /* The drop target knows the day, not the session — so the view resolves the id
     against what it already holds rather than serialising a session into the
     drag payload, where it would go stale the moment anything else changed it. */
  const sessionById = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<(typeof thread.seasonWeeks)[number]['days'][number]['entries'][number]['planned']>
    >();
    for (const week of thread.seasonWeeks) {
      for (const day of week.days) {
        for (const entry of day.entries) {
          if (entry.planned) map.set(entry.planned.id, entry.planned);
        }
      }
    }
    return map;
  }, [thread.seasonWeeks]);

  const anchorLabel = anchorWeekKey
    ? (thread.seasonWeeks.find((week) => week.weekKey === anchorWeekKey)?.label ?? null)
    : null;

  /**
   * The digest: the next few sessions and the last few.
   *
   * Three ahead is enough to see what today sits inside; five behind is enough to
   * explain how the legs feel. Anything more is the Planning and History pages,
   * which is why each side carries a link to its own.
   */
  const digest = useMemo(() => {
    const anchored = anchorWeekKey
      ? thread.seasonWeeks.find((week) => week.weekKey === anchorWeekKey)
      : null;

    /* Scrubbed: read from the end of that week, so its own sessions land in the
       "already done" half rather than being split across the waterline. */
    const pivot = anchored ? endOfWeekDay(anchored.start) : new Date();
    const pivotDayKey = dayKeyFromDate(
      new Date(Date.UTC(pivot.getFullYear(), pivot.getMonth(), pivot.getDate())),
    );

    const { upcoming, past } = partitionThread(thread.seasonWeeks, pivotDayKey);
    return {
      upcoming: takeThreadDays(upcoming, 3),
      past: takeThreadDays(past, 5),
    };
  }, [thread.seasonWeeks, anchorWeekKey]);
  /* Graded over the season, not over what happens to be loaded: "5/7" flipping to
     "23/29" because the athlete pressed "charger plus" would make the figure a
     property of the scroll position rather than of the plan. */
  const adherence = useMemo(() => buildThreadAdherence(thread.seasonWeeks), [thread.seasonWeeks]);

  const constraints = useMemo(
    () => buildThreadConstraints(memory.data?.entries ?? [], isoWeekKeyOf),
    [memory.data],
  );

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

  if (!online && hasNoLiveData && offlineEntry) {
    return <OfflineSnapshotSummary entry={offlineEntry} />;
  }

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
          <ThreadLoadRuler
            anchorWeekKey={anchorWeekKey}
            bars={thread.ruler}
            onAnchorChange={(weekKey) =>
              setAnchorWeekKey(
                thread.ruler.find((bar) => bar.weekKey === weekKey)?.state === 'current'
                  ? null
                  : weekKey,
              )
            }
          />

          {/* Only while away from today: a permanent "back to today" on a page
              already showing today is a control that does nothing. */}
          {anchorWeekKey ? (
            <button
              type="button"
              className={cn(
                'text-primary hover:text-foreground text-data inline-flex items-center gap-1.5',
                'text-xs transition-colors',
                'focus-visible:ring-primary/35 rounded-sm focus-visible:ring-2 focus-visible:outline-hidden',
              )}
              onClick={() => setAnchorWeekKey(null)}
            >
              ← Revenir à aujourd’hui
            </button>
          ) : null}

          <div className="lg:hidden">{filters}</div>

          {/* `pivotEntryId` is this week's turning point; pointing at it from
              another week would mark a session with nothing to do with what is
              on screen, so it goes when the reader scrubs away. */}
          <ThreadTimeline
            anchorLabel={anchorLabel}
            past={digest.past}
            pivotEntryId={anchorWeekKey ? null : (coachLine?.pivotEntryId ?? null)}
            upcoming={digest.upcoming}
            onDropSession={(sessionId, target) => {
              const session = sessionById.get(sessionId);
              if (session) moveTo(session, target);
            }}
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
