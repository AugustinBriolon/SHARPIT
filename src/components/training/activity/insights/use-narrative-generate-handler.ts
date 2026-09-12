'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { executeNarrativeGenerate } from '@/components/training/activity/insights/activity-narrative-generate-action';
import { queryKeys } from '@/lib/query/keys';

export function useNarrativeGenerateHandler({
  activityId,
  isDemo,
  demoLink,
  demoReading,
  setGenerating,
  setPollTimedOut,
  setPolled,
}: {
  activityId: string;
  isDemo: boolean;
  demoLink: { plannedSessionId: string } | null;
  demoReading: unknown;
  setGenerating: (value: boolean) => void;
  setPollTimedOut: (value: boolean) => void;
  setPolled: (value: { analysis: unknown; analyzedAt: string }) => void;
}) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    setGenerating(true);
    try {
      // Wakes the shell watcher now: it only learns about work started after its
      // last fetch if something invalidates its key (ADR-036).
      await executeNarrativeGenerate({
        isDemo,
        demoLink,
        demoReading,
        activityId,
        queryClient,
        onPollTimedOut: setPollTimedOut,
        onPolled: (result) =>
          setPolled({ analysis: result.analysis, analyzedAt: result.analyzedAt }),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analysisRuns });
    } finally {
      setGenerating(false);
    }
  }, [
    activityId,
    demoLink,
    demoReading,
    isDemo,
    queryClient,
    setGenerating,
    setPollTimedOut,
    setPolled,
  ]);
}
