'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import type { ExperimentIntent } from '@/lib/health/journal-habit-experiment';
import type { HabitExperimentView } from '@/lib/health/journal-habit-experiment-view';
import { queryKeys } from '@/lib/query/keys';
import { sendJson } from '@/lib/query/send-json';

const ENDPOINT = '/api/journal/habit-experiments';

type ExperimentsResponse = { experiments: HabitExperimentView[] };

/**
 * Server-rendered tests hydrate the cache. Mutations replace it.
 * staleTime is Infinity so the mount GET cannot race a POST and wipe a
 * just-started running test (initialData without updatedAt is epoch-stale).
 */
export function useJournalHabitExperiments(initial: HabitExperimentView[]) {
  const queryClient = useQueryClient();
  const key = queryKeys.journalHabitExperiments;
  const hydratedAt = useRef(Date.now());

  const query = useQuery({
    queryKey: key,
    queryFn: () => sendJson(ENDPOINT, 'GET') as Promise<ExperimentsResponse>,
    initialData: { experiments: initial },
    initialDataUpdatedAt: hydratedAt.current,
    staleTime: Infinity,
  });

  const start = useMutation({
    mutationFn: (input: { factorId: string; intent: ExperimentIntent }) =>
      sendJson(ENDPOINT, 'POST', input) as Promise<ExperimentsResponse>,
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
    },
  });

  const stop = useMutation({
    mutationFn: (id: string) =>
      sendJson(`${ENDPOINT}/${id}`, 'PATCH', { cancelled: true }) as Promise<ExperimentsResponse>,
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
    },
  });

  return { experiments: query.data.experiments, start, stop };
}
