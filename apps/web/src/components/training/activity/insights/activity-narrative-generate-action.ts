'use client';

import type { QueryClient } from '@tanstack/react-query';
import {
  runDemoNarrativeGenerate,
  runNarrativeGenerate,
} from '@/components/training/activity/insights/activity-narrative-generate';

export async function executeNarrativeGenerate({
  isDemo,
  demoLink,
  demoReading,
  activityId,
  queryClient,
  onPollTimedOut,
  onPolled,
}: {
  isDemo: boolean;
  demoLink: { plannedSessionId: string } | null;
  demoReading: unknown;
  activityId: string;
  queryClient: QueryClient;
  onPollTimedOut: (timedOut: boolean) => void;
  onPolled: (result: { analysis: unknown; analyzedAt: string }) => void;
}): Promise<void> {
  if (isDemo && demoLink && !demoReading) {
    await runDemoNarrativeGenerate({
      queryClient,
      plannedSessionId: demoLink.plannedSessionId,
      activityId,
    });
    return;
  }

  onPollTimedOut(false);
  await runNarrativeGenerate({
    activityId,
    onSuccess: (result) => {
      onPolled(result);
      onPollTimedOut(false);
    },
    onFailure: () => onPollTimedOut(true),
  });
}
