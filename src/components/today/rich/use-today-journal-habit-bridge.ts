'use client';

import { useQuery } from '@tanstack/react-query';
import type { TodayJournalHabitBridge } from '@/lib/health/journal-habit-today-bridge';
import { queryKeys } from '@/lib/query/keys';

type HabitBridgeResponse = {
  bridge: TodayJournalHabitBridge | null;
};

async function fetchJournalHabitBridge(): Promise<HabitBridgeResponse> {
  const res = await fetch('/api/journal/habit-bridge');
  if (!res.ok) {
    throw new Error('journal habit bridge fetch failed');
  }
  return res.json() as Promise<HabitBridgeResponse>;
}

/** Parallel Today fetch — keeps presentation VM free of journal series. */
export function useTodayJournalHabitBridge(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.journalHabitBridge,
    queryFn: fetchJournalHabitBridge,
    enabled,
    staleTime: 10 * 60_000,
  });
}
