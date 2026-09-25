'use client';

import { useEffect } from 'react';
import {
  clearNarrativeTimedOut,
  pollActivityNarrative,
  readNarrativeTimedOut,
} from '@/components/training/activity/insights/activity-narrative-helpers';

export function useNarrativePollingEffects({
  activityId,
  initialAnalyzedAt,
  isPending,
  setPolled,
  setPollTimedOut,
}: {
  activityId: string;
  initialAnalyzedAt: Date | string | null;
  isPending: boolean;
  setPolled: React.Dispatch<
    React.SetStateAction<{
      analysis: unknown;
      analyzedAt: Date | string | null;
    } | null>
  >;
  setPollTimedOut: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  useEffect(() => {
    setPolled(null);
    setPollTimedOut(readNarrativeTimedOut(activityId));
  }, [activityId, setPolled, setPollTimedOut]);

  useEffect(() => {
    if (!initialAnalyzedAt) {
      return;
    }
    setPolled(null);
    clearNarrativeTimedOut(activityId);
    setPollTimedOut(false);
  }, [activityId, initialAnalyzedAt, setPolled, setPollTimedOut]);

  useEffect(() => {
    if (!isPending) {
      return;
    }

    let cancelled = false;

    void pollActivityNarrative({
      activityId,
      onComplete: (result) => {
        if (!cancelled) {
          setPolled({ analysis: result.analysis, analyzedAt: result.analyzedAt });
          setPollTimedOut(false);
        }
      },
      onTimeout: () => {
        if (!cancelled) {
          setPollTimedOut(true);
        }
      },
    });

    return () => {
      cancelled = true;
    };
  }, [activityId, isPending, setPolled, setPollTimedOut]);
}
