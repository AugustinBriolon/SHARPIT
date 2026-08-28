'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { executeNarrativeGenerate } from '@/components/training/activity/insights/activity-narrative-generate-action';

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
