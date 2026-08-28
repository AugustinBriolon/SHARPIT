'use client';

import { useState } from 'react';
import { ActivityType } from '@prisma/client';
import {
  parseNarrative,
  readNarrativeTimedOut,
} from '@/components/training/activity/insights/activity-narrative-helpers';
import { deriveNarrativeSectionFlags } from '@/components/training/activity/insights/activity-narrative-derived';
import { useDemoNarrativeOverlay } from '@/components/training/activity/insights/use-demo-narrative-overlay';
import { useNarrativePollingEffects } from '@/components/training/activity/insights/use-narrative-polling-effects';
import { useNarrativeGenerateHandler } from '@/components/training/activity/insights/use-narrative-generate-handler';

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

function coalesceDefined<T>(candidates: readonly (T | null | undefined)[]): T {
  for (const candidate of candidates) {
    if (isDefined(candidate)) {
      return candidate;
    }
  }
  return candidates[candidates.length - 1] as T;
}

function resolveNarrativeContent({
  demoReading,
  polled,
  initialAnalysis,
  initialAnalyzedAt,
}: {
  demoReading: { narrative?: unknown; analyzedAt?: Date | string | null } | null;
  polled: { analysis: unknown; analyzedAt: Date | string | null } | null;
  initialAnalysis: unknown;
  initialAnalyzedAt: Date | string | null;
}) {
  return {
    narrativeAnalysis: coalesceDefined([demoReading?.narrative, polled?.analysis, initialAnalysis]),
    narrativeAnalyzedAt: coalesceDefined([
      demoReading?.analyzedAt,
      polled?.analyzedAt,
      initialAnalyzedAt,
    ]),
  };
}

export function useActivityNarrativeSection({
  activityId,
  activityType,
  activityDate,
  initialAnalysis,
  initialAnalyzedAt,
  coachEnabled,
}: {
  activityId: string;
  activityType: ActivityType;
  activityDate: Date | string;
  initialAnalysis: unknown;
  initialAnalyzedAt: Date | string | null;
  coachEnabled: boolean;
}) {
  const overlay = useDemoNarrativeOverlay(activityId);
  const [polled, setPolled] = useState<{
    analysis: typeof initialAnalysis;
    analyzedAt: typeof initialAnalyzedAt;
  } | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(() => readNarrativeTimedOut(activityId));
  const [generating, setGenerating] = useState(false);

  const { narrativeAnalysis, narrativeAnalyzedAt } = resolveNarrativeContent({
    demoReading: overlay.demoReading,
    polled,
    initialAnalysis,
    initialAnalyzedAt,
  });

  const flags = deriveNarrativeSectionFlags({
    coachEnabled,
    activityType,
    activityDate,
    narrativeAnalysis,
    narrativeAnalyzedAt,
    pollTimedOut,
    generating,
    isDemoLinkStory: overlay.isDemoLinkStory,
    demoReadingPending: overlay.demoReadingPending,
  });

  useNarrativePollingEffects({
    activityId,
    initialAnalyzedAt,
    isPending: flags.isPending,
    setPolled,
    setPollTimedOut,
  });

  const handleGenerate = useNarrativeGenerateHandler({
    activityId,
    isDemo: overlay.isDemo,
    demoLink: overlay.demoLink ?? null,
    demoReading: overlay.demoReading,
    setGenerating,
    setPollTimedOut,
    setPolled: (result) => setPolled(result),
  });

  return {
    activityType,
    demoLink: overlay.demoLink,
    demoReadingPending: overlay.demoReadingPending,
    eligible: flags.eligible,
    generating,
    handleGenerate,
    hasAnalysis: flags.hasAnalysis,
    isDemoLinkStory: overlay.isDemoLinkStory,
    isPending: flags.isPending,
    narrativeAnalysis,
    narrativeAnalyzedAt,
    parseNarrative,
  };
}
