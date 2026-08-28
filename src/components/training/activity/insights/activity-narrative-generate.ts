'use client';

import { toast } from '@/components/ui/toast';
import { applyDemoSessionLinkReading } from '@/lib/demo/demo-session-link-reading';
import {
  clearNarrativeTimedOut,
  generateActivityNarrative,
  writeNarrativeTimedOut,
} from '@/components/training/activity/insights/activity-narrative-helpers';
import type { QueryClient } from '@tanstack/react-query';

export async function runDemoNarrativeGenerate({
  queryClient,
  plannedSessionId,
  activityId,
}: {
  queryClient: QueryClient;
  plannedSessionId: string;
  activityId: string;
}): Promise<void> {
  const loadingToast = toast.loading('Synthèse en cours');
  try {
    applyDemoSessionLinkReading(queryClient, plannedSessionId, activityId);
    toast.success('Synthèse prête');
  } finally {
    toast.close(loadingToast);
  }
}

export async function runNarrativeGenerate({
  activityId,
  onSuccess,
  onFailure,
}: {
  activityId: string;
  onSuccess: (result: { analysis: unknown; analyzedAt: string }) => void;
  onFailure: () => void;
}): Promise<void> {
  clearNarrativeTimedOut(activityId);
  const loadingToast = toast.loading('Synthèse en cours');
  try {
    const result = await generateActivityNarrative(activityId);
    if (!result.ok) {
      toast.error(result.error ?? 'Synthèse impossible');
      writeNarrativeTimedOut(activityId);
      onFailure();
      return;
    }
    if (result.narrativeAnalyzedAt) {
      onSuccess({
        analysis: result.narrativeAnalysis ?? null,
        analyzedAt: result.narrativeAnalyzedAt,
      });
      clearNarrativeTimedOut(activityId);
      toast.success('Synthèse prête');
    }
  } catch {
    toast.error('Synthèse impossible');
    writeNarrativeTimedOut(activityId);
    onFailure();
  } finally {
    toast.close(loadingToast);
  }
}
