'use client';

import { useEffect, useState } from 'react';
import type { ClientPlannedSession } from '@/lib/query/types';
import type { SessionAnalysis } from '@/lib/validators/coach';

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

export function clearAnalysisPollTimedOut(sessionId: string): void {
  try {
    sessionStorage.removeItem(analysisTimeoutStorageKey(sessionId));
  } catch {
    // ignore
  }
}

/**
 * Reads the session's analysis — no polling of its own.
 *
 * This hook used to re-fetch the session every 3 s for two minutes while an
 * analysis ran. When the analysis failed, that loop kept hammering the API for
 * the full window and the athlete saw an endless "analyse en cours". The shell
 * watcher now owns waiting: it polls one small status endpoint while a run is in
 * flight, refreshes this session when it lands, and says so — success or
 * failure (ADR-036).
 */
export function useSessionAnalysisPoll({ session }: { session: ClientPlannedSession }) {
  const [pollTimedOut, setPollTimedOut] = useState(() => readAnalysisPollTimedOut(session.id));

  const analysis = session.analysis as unknown as SessionAnalysis | null;
  const { analyzedAt } = session;

  useEffect(() => {
    setPollTimedOut(readAnalysisPollTimedOut(session.id));
  }, [session.id]);

  useEffect(() => {
    if (!session.analyzedAt) {
      return;
    }
    clearAnalysisPollTimedOut(session.id);
    setPollTimedOut(false);
  }, [session.analyzedAt, session.id]);

  return { analysis, analyzedAt, pollTimedOut, setPollTimedOut };
}
