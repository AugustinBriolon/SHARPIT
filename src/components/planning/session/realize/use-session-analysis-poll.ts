'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ClientPlannedSession } from '@/lib/query/types';
import type { SessionAnalysis } from '@/lib/validators/coach';
import { queryKeys } from '@/lib/query/keys';
import { fetchPlannedSessionById } from '@/lib/query/fetchers';

const ANALYSIS_POLL_MS = 3_000;
const ANALYSIS_POLL_MAX_MS = 120_000;
const ANALYSIS_TIMEOUT_STORAGE_PREFIX = 'sharpit.analysis-poll-timeout.';

function analysisTimeoutStorageKey(sessionId: string): string {
  return `${ANALYSIS_TIMEOUT_STORAGE_PREFIX}${sessionId}`;
}

function readAnalysisPollTimedOut(sessionId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return sessionStorage.getItem(analysisTimeoutStorageKey(sessionId)) === '1';
  } catch {
    return false;
  }
}

function writeAnalysisPollTimedOut(sessionId: string): void {
  try {
    sessionStorage.setItem(analysisTimeoutStorageKey(sessionId), '1');
  } catch {
    // ignore quota / private mode
  }
}

export function clearAnalysisPollTimedOut(sessionId: string): void {
  try {
    sessionStorage.removeItem(analysisTimeoutStorageKey(sessionId));
  } catch {
    // ignore
  }
}

async function pollSessionAnalysis({
  sessionId,
  queryClient,
  onComplete,
  onTimeout,
}: {
  sessionId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  onComplete: (result: {
    analysis: SessionAnalysis;
    analyzedAt: ClientPlannedSession['analyzedAt'];
  }) => void;
  onTimeout: () => void;
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < ANALYSIS_POLL_MAX_MS) {
    await new Promise((resolve) => setTimeout(resolve, ANALYSIS_POLL_MS));

    try {
      const updated = await fetchPlannedSessionById(sessionId);
      if (updated.analyzedAt && updated.analysis) {
        onComplete({
          analysis: updated.analysis as unknown as SessionAnalysis,
          analyzedAt: updated.analyzedAt,
        });
        clearAnalysisPollTimedOut(sessionId);
        queryClient.setQueryData(
          queryKeys.plannedSessions,
          (prev: ClientPlannedSession[] | undefined) => {
            if (!prev) {
              return prev;
            }
            return prev.map((item) =>
              item.id === updated.id
                ? { ...item, analysis: updated.analysis, analyzedAt: updated.analyzedAt }
                : item,
            );
          },
        );
        return;
      }
    } catch {
      // best-effort polling
    }
  }

  writeAnalysisPollTimedOut(sessionId);
  onTimeout();
  try {
    sessionStorage.removeItem(`sharpit.analysis-kick.${sessionId}`);
  } catch {
    // ignore
  }
}

export function useSessionAnalysisPoll({
  session,
  isPendingScheduled,
}: {
  session: ClientPlannedSession;
  isPendingScheduled: boolean;
}) {
  const queryClient = useQueryClient();
  const [polled, setPolled] = useState<{
    analysis: SessionAnalysis | null;
    analyzedAt: typeof session.analyzedAt;
  } | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(() => readAnalysisPollTimedOut(session.id));

  const analysis = polled?.analysis ?? (session.analysis as unknown as SessionAnalysis | null);
  const analyzedAt = polled?.analyzedAt ?? session.analyzedAt;

  useEffect(() => {
    setPolled(null);
    setPollTimedOut(readAnalysisPollTimedOut(session.id));
  }, [session.id]);

  useEffect(() => {
    if (!session.analyzedAt) {
      return;
    }
    setPolled(null);
    clearAnalysisPollTimedOut(session.id);
    setPollTimedOut(false);
  }, [session.analyzedAt, session.id]);

  useEffect(() => {
    if (!isPendingScheduled) {
      return;
    }

    let cancelled = false;

    void pollSessionAnalysis({
      sessionId: session.id,
      queryClient,
      onComplete: (result) => {
        if (!cancelled) {
          setPolled(result);
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
  }, [isPendingScheduled, queryClient, session.id]);

  return { analysis, analyzedAt, pollTimedOut, setPollTimedOut };
}
