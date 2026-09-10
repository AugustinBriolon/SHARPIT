'use client';

import { TodayJournalHabitBridgeStrip } from '@/components/today/rich/today-journal-habit-bridge-strip';
import { useTodayJournalHabitBridge } from '@/components/today/rich/use-today-journal-habit-bridge';
import { useTodayRunningHabitExperiment } from '@/components/today/rich/use-today-running-habit-experiment';
import { resolveTodayJournalHabitCallout } from '@/lib/health/journal-habit-today-bridge';

/** Bottom-of-Today journal footnote — loads after the decision stack. */
export function TodayJournalHabitBridgeFooter({ enabled }: { enabled: boolean }) {
  const habitBridgeQuery = useTodayJournalHabitBridge(enabled);
  const runningExperimentQuery = useTodayRunningHabitExperiment(enabled);
  const callout = resolveTodayJournalHabitCallout(
    runningExperimentQuery.data ?? null,
    habitBridgeQuery.data?.bridge ?? null,
  );

  if (!callout) {
    return null;
  }

  return <TodayJournalHabitBridgeStrip callout={callout} />;
}
