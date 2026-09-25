'use client';

import { useQuery } from '@tanstack/react-query';
import type { HabitExperimentView } from '@/lib/journal/journal-habit-experiment-view';
import { splitExperimentViews } from '@/lib/journal/journal-habit-experiment-view';
import { queryKeys } from '@/lib/query/keys';
import { sendJson } from '@/lib/query/send-json';

type ExperimentsResponse = { experiments: HabitExperimentView[] };

/** Shares the analyses cache key — start/stop on /journal/analyses refreshes Today. */
export function useTodayRunningHabitExperiment(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.journalHabitExperiments,
    queryFn: () =>
      sendJson('/api/journal/habit-experiments', 'GET') as Promise<ExperimentsResponse>,
    enabled,
    staleTime: 60_000,
    select: (data) => splitExperimentViews(data.experiments).running,
  });
}
