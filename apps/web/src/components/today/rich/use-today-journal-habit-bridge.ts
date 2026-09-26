'use client';

import { useQuery } from '@tanstack/react-query';
import type { TodayJournalHabitBridge } from '@sharpit/app/lib/journal/journal-habit-today-bridge';
import { fetchJournalHabitBridge } from '@/client/query/fetchers';
import { queryKeys } from '@/client/query/keys';

type HabitBridgeResponse = {
  bridge: TodayJournalHabitBridge | null;
};

/** Parallel Today fetch — keeps presentation VM free of journal series. */
export function useTodayJournalHabitBridge(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.journalHabitBridge,
    queryFn: async () => (await fetchJournalHabitBridge()) as HabitBridgeResponse,
    enabled,
    staleTime: 10 * 60_000,
  });
}
