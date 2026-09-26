'use client';

import { useQuery } from '@tanstack/react-query';
import type { HabitExperimentView } from '@sharpit/app/lib/journal/journal-habit-experiment-view';
import { splitExperimentViews } from '@sharpit/app/lib/journal/journal-habit-experiment-view';
import { queryKeys } from '@/client/query/keys';
import { sendJson } from '@/client/query/send-json';

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
