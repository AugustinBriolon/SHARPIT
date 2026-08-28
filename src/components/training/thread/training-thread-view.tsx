'use client';

import { useMemo, useState } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import {
  ThreadRulerSkeleton,
  ThreadTimelineSkeleton,
} from '@/components/training/thread/thread-skeleton';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { useCoachMemory } from '@/hooks/use-coach-memory';
import { useOfflineSnapshot } from '@/hooks/use-offline-snapshot';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useTrainingThread } from '@/hooks/use-training-thread';
import { useThreadFormReadings } from '@/hooks/use-thread-form-readings';
import { isoWeekKeyOf } from '@/lib/training/thread/build-thread';
import { buildThreadAdherence } from '@/lib/training/thread/thread-adherence';
import { buildThreadCoachLine } from '@/lib/training/thread/thread-coach-line';
import {
  selectNextRaceGoal,
  useTrainingThreadDigest,
} from '@/components/training/thread/use-training-thread-digest';
import {
  TrainingThreadHeader,
  TrainingThreadLayout,
} from '@/components/training/thread/training-thread-layout';
import { buildThreadConstraints } from '@/components/training/thread/thread-constraints-card';
import { ThreadSportFilters } from '@/components/training/thread/thread-sport-filters';

export function TrainingThreadView() {
  const thread = useTrainingThread();
  const memory = useCoachMemory();
  const readings = useThreadFormReadings();

  const online = useOnlineStatus();
  const { hasNoLiveData } = thread;
  const { entry: offlineEntry } = useOfflineSnapshot(!online && hasNoLiveData);

  const currentIndex = thread.weeks.findIndex((week) => week.isCurrent);
  const currentWeek = currentIndex >= 0 ? thread.weeks[currentIndex] : null;
  const previousWeek = currentIndex > 0 ? thread.weeks[currentIndex - 1] : null;

  const coachLine = useMemo(() => buildThreadCoachLine(currentWeek ?? null), [currentWeek]);
  const [anchorWeekKey, setAnchorWeekKey] = useState<string | null>(null);
  const { anchorLabel, digest } = useTrainingThreadDigest({
    seasonWeeks: thread.seasonWeeks,
    anchorWeekKey,
  });

  const adherence = useMemo(() => buildThreadAdherence(thread.seasonWeeks), [thread.seasonWeeks]);
  const constraints = useMemo(
    () => buildThreadConstraints(memory.data?.entries ?? [], isoWeekKeyOf),
    [memory.data],
  );
  const nextRaceGoal = useMemo(() => selectNextRaceGoal(thread.goals), [thread.goals]);

  if (!online && hasNoLiveData && offlineEntry) {
    return <OfflineSnapshotSummary entry={offlineEntry} />;
  }

  const { loading } = thread;
  const filters = (
    <ThreadSportFilters counts={thread.counts} value={thread.sport} onChange={thread.setSport} />
  );

  function handleAnchorWeekChange(weekKey: string) {
    setAnchorWeekKey(
      thread.ruler.find((bar) => bar.weekKey === weekKey)?.state === 'current' ? null : weekKey,
    );
  }

  return (
    <div className="space-y-5">
      <StickyHeader>
        <TrainingThreadHeader filters={filters} loading={loading} />
      </StickyHeader>

      <TrainingThreadLayout
        adherence={adherence}
        anchorLabel={anchorLabel}
        anchorWeekKey={anchorWeekKey}
        coachLine={coachLine}
        constraints={constraints}
        currentWeek={currentWeek}
        digest={digest}
        filters={filters}
        loading={loading}
        nextRaceGoal={nextRaceGoal}
        previousWeek={previousWeek}
        readings={readings}
        ruler={thread.ruler}
        rulerSkeleton={<ThreadRulerSkeleton />}
        seasonWeeks={thread.seasonWeeks}
        timelineSkeleton={<ThreadTimelineSkeleton />}
        onAnchorWeekChange={handleAnchorWeekChange}
        onBackToToday={() => setAnchorWeekKey(null)}
      />
    </div>
  );
}
